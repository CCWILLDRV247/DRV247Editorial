import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  articleCategories,
  articleEntities,
  articleInterests,
  articleLocations,
  articles,
  demoUserInterests,
  demoUsers,
  demoVehicles,
  ingestionRuns,
  mediaSources,
  type Article,
} from "@/lib/db/schema";
import { loadRankWeights, scoreArticle, type GarageVehicle } from "./rank";

export type EditorialDto = {
  id: number;
  sourceId: string;
  publication: string;
  title: string;
  url: string;
  canonicalUrl: string;
  author: string | null;
  publishedAt: string;
  imageUrl: string | null;
  excerpt: string;
  editorialScore: number;
  vehicleRelevanceScore: number;
  rankScore: number;
  ingestionMethod: string;
  makes: string[];
  models: string[];
  generations: string[];
  categories: string[];
  interests: string[];
  locations: string[];
  duplicateGroupId: string | null;
};

function toDto(
  article: Article,
  extras: {
    makes: string[];
    models: string[];
    generations: string[];
    categories: string[];
    interests: string[];
    locations: string[];
    rankScore: number;
  },
): EditorialDto {
  return {
    id: article.id,
    sourceId: article.sourceId,
    publication: article.publication,
    title: article.title,
    url: article.url,
    canonicalUrl: article.canonicalUrl,
    author: article.author,
    publishedAt: new Date(article.publishedAt).toISOString(),
    imageUrl: article.imageUrl,
    excerpt: article.excerpt,
    editorialScore: article.editorialScore,
    vehicleRelevanceScore: extras.rankScore,
    rankScore: extras.rankScore,
    ingestionMethod: article.ingestionMethod,
    makes: extras.makes,
    models: extras.models,
    generations: extras.generations,
    categories: extras.categories,
    interests: extras.interests,
    locations: extras.locations,
    duplicateGroupId: article.duplicateGroupId,
  };
}

function articleExtras(articleId: number) {
  const db = getDb();
  const entities = db
    .select()
    .from(articleEntities)
    .where(eq(articleEntities.articleId, articleId))
    .all();
  return {
    makes: entities.filter((row) => row.kind === "make").map((row) => row.name),
    models: entities.filter((row) => row.kind === "model").map((row) => row.name),
    generations: entities.filter((row) => row.kind === "generation").map((row) => row.name),
    categories: db
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.articleId, articleId))
      .all()
      .map((row) => row.category),
    interests: db
      .select()
      .from(articleInterests)
      .where(eq(articleInterests.articleId, articleId))
      .all()
      .map((row) => row.interest),
    locations: db
      .select()
      .from(articleLocations)
      .where(eq(articleLocations.articleId, articleId))
      .all()
      .map((row) => row.location),
  };
}

export function listEngineSources() {
  const db = getDb();
  return db.select().from(mediaSources).all();
}

export function listIngestionRuns(limit = 40) {
  const db = getDb();
  return db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(limit).all();
}

export function getDemoUser(userId: string) {
  const db = getDb();
  const user = db.select().from(demoUsers).where(eq(demoUsers.id, userId)).get();
  if (!user) return null;
  const vehicles = db.select().from(demoVehicles).where(eq(demoVehicles.userId, userId)).all();
  const interests = db
    .select()
    .from(demoUserInterests)
    .where(eq(demoUserInterests.userId, userId))
    .all()
    .map((row) => row.interest);
  return { ...user, vehicles, interests };
}

export function listEditorial(options?: {
  userId?: string;
  sourceId?: string;
  vehicleId?: string;
  make?: string;
  model?: string;
  generation?: string;
  category?: string;
  interest?: string;
  q?: string;
  section?: string;
  limit?: number;
}): EditorialDto[] {
  const db = getDb();
  let rows = db.select().from(articles).orderBy(desc(articles.publishedAt)).all();
  if (options?.sourceId) rows = rows.filter((row) => row.sourceId === options.sourceId);
  if (options?.q) {
    const q = options.q.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.excerpt.toLowerCase().includes(q) ||
        row.publication.toLowerCase().includes(q),
    );
  }

  const sourceMap = new Map(
    db.select().from(mediaSources).all().map((source) => [source.id, source]),
  );
  let vehicles: GarageVehicle[] = [];
  let userInterests: string[] = [];
  let userLocation: string | null = null;
  if (options?.userId) {
    const user = getDemoUser(options.userId);
    if (user) {
      vehicles = user.vehicles;
      userInterests = user.interests;
      userLocation = user.location;
    }
  }
  if (options?.vehicleId) {
    const vehicle = db.select().from(demoVehicles).where(eq(demoVehicles.id, options.vehicleId)).get();
    if (vehicle) {
      vehicles = [vehicle];
      const user = getDemoUser(vehicle.userId);
      userInterests = user?.interests ?? [];
      userLocation = user?.location ?? null;
    }
  }

  const weights = loadRankWeights();
  const ranked = rows.map((article) => {
    const extras = articleExtras(article.id);
    if (options?.make && !extras.makes.some((make) => make.toLowerCase() === options.make!.toLowerCase())) {
      return null;
    }
    if (options?.model && !extras.models.some((model) => model.toLowerCase() === options.model!.toLowerCase())) {
      return null;
    }
    if (
      options?.generation &&
      !extras.generations.some((generation) => generation.toLowerCase() === options.generation!.toLowerCase())
    ) {
      return null;
    }
    if (options?.category && !extras.categories.includes(options.category)) return null;
    if (options?.interest && !extras.interests.includes(options.interest)) return null;
    const source = sourceMap.get(article.sourceId);
    const rankScore = scoreArticle(
      {
        ...extras,
        excerpt: article.excerpt,
        relevance: source?.relevance ?? "",
        vehicles,
        userInterests,
        userLocation,
      },
      weights,
    );
    return toDto(article, { ...extras, rankScore });
  });

  const list = ranked.filter((row): row is EditorialDto => Boolean(row));
  list.sort((a, b) => b.rankScore - a.rankScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const seenGroups = new Set<string>();
  const deduped: EditorialDto[] = [];
  for (const item of list) {
    if (item.duplicateGroupId && seenGroups.has(item.duplicateGroupId)) continue;
    if (item.duplicateGroupId) seenGroups.add(item.duplicateGroupId);
    deduped.push(item);
  }
  return deduped.slice(0, options?.limit ?? 40);
}

export function getEditorial(id: number): EditorialDto | null {
  const db = getDb();
  const article = db.select().from(articles).where(eq(articles.id, id)).get();
  if (!article) return null;
  const extras = articleExtras(article.id);
  const source = db.select().from(mediaSources).where(eq(mediaSources.id, article.sourceId)).get();
  const rankScore = scoreArticle({
    ...extras,
    excerpt: article.excerpt,
    relevance: source?.relevance ?? "",
    vehicles: [],
    userInterests: [],
  });
  return toDto(article, { ...extras, rankScore });
}
