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
import { loadRankWeights, recencyBonus, scoreArticle, scoreForYou, type GarageVehicle } from "./rank";
import { classifyPrimary, isContentPrimary } from "./taxonomy";
import { loadArticlePrimaries } from "./article-primary";
import { articleMatchesForYouTest, forYouTestIsActive, type ForYouTestProfile } from "./for-you-test";

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
  aiSummary: string | null;
  makes: string[];
  models: string[];
  generations: string[];
  variants: string[];
  categories: string[];
  interests: string[];
  locations: string[];
  duplicateGroupId: string | null;
  primaryCategory: string;
};

function toDto(
  article: Article,
  extras: {
    makes: string[];
    models: string[];
    generations: string[];
    variants: string[];
    categories: string[];
    interests: string[];
    locations: string[];
    rankScore: number;
    primaryCategory: string;
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
    aiSummary: article.aiSummary?.trim() || null,
    makes: extras.makes,
    models: extras.models,
    generations: extras.generations,
    variants: extras.variants,
    categories: extras.categories,
    interests: extras.interests,
    locations: extras.locations,
    duplicateGroupId: article.duplicateGroupId,
    primaryCategory: extras.primaryCategory,
  };
}

async function extrasByArticleIds(articleIds: number[]) {
  const empty = {
    makes: [] as string[],
    models: [] as string[],
    generations: [] as string[],
    variants: [] as string[],
    categories: [] as string[],
    interests: [] as string[],
    locations: [] as string[],
  };
  const map = new Map<number, typeof empty>();
  for (const id of articleIds) {
    map.set(id, {
      makes: [],
      models: [],
      generations: [],
      variants: [],
      categories: [],
      interests: [],
      locations: [],
    });
  }
  if (!articleIds.length) return map;

  const db = await getDb();
  const [entities, cats, interests, locations] = await Promise.all([
    db.select().from(articleEntities),
    db.select().from(articleCategories),
    db.select().from(articleInterests),
    db.select().from(articleLocations),
  ]);
  const wanted = new Set(articleIds);
  for (const row of entities) {
    if (!wanted.has(row.articleId)) continue;
    const extras = map.get(row.articleId);
    if (!extras) continue;
    if (row.kind === "make") extras.makes.push(row.name);
    if (row.kind === "model") extras.models.push(row.name);
    if (row.kind === "generation") extras.generations.push(row.name);
    if (row.kind === "variant") extras.variants.push(row.name);
  }
  for (const row of cats) {
    map.get(row.articleId)?.categories.push(row.category);
  }
  for (const row of interests) {
    map.get(row.articleId)?.interests.push(row.interest);
  }
  for (const row of locations) {
    map.get(row.articleId)?.locations.push(row.location);
  }
  return map;
}

export async function listEngineSources() {
  const db = await getDb();
  return db.select().from(mediaSources);
}

export async function listIngestionRuns(limit = 40) {
  const db = await getDb();
  return db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(limit);
}

export async function getDemoUser(userId: string) {
  const db = await getDb();
  const user = (await db.select().from(demoUsers).where(eq(demoUsers.id, userId)).limit(1))[0];
  if (!user) return null;
  const vehicles = await db.select().from(demoVehicles).where(eq(demoVehicles.userId, userId));
  const interests = (
    await db.select().from(demoUserInterests).where(eq(demoUserInterests.userId, userId))
  ).map((row) => row.interest);
  return { ...user, vehicles, interests };
}

export async function listEditorial(options?: {
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
  testProfile?: ForYouTestProfile;
  limit?: number;
}): Promise<EditorialDto[]> {
  const db = await getDb();
  let rows = await db.select().from(articles).orderBy(desc(articles.publishedAt));
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

  const [sourceRows, extrasMap, primaryMap] = await Promise.all([
    db.select().from(mediaSources),
    extrasByArticleIds(rows.map((row) => row.id)),
    loadArticlePrimaries(rows.map((row) => row.id)),
  ]);
  const sourceMap = new Map(sourceRows.map((source) => [source.id, source]));
  const testProfile = options?.testProfile;
  const useTestProfile = Boolean(testProfile && forYouTestIsActive(testProfile));
  const curated = options?.section === "for-you" || (!options?.userId && !options?.vehicleId);
  let vehicles: GarageVehicle[] = [];
  let userInterests: string[] = [];
  let userLocation: string | null = null;
  if (useTestProfile && testProfile) {
    if (testProfile.make) {
      vehicles = [
        {
          make: testProfile.make,
          model: testProfile.model ?? "",
          generation: testProfile.generation,
        },
      ];
    }
    userInterests = testProfile.interests;
    userLocation = testProfile.location ?? null;
  } else if (options?.userId) {
    const user = await getDemoUser(options.userId);
    if (user) {
      vehicles = user.vehicles;
      userInterests = user.interests;
      userLocation = user.location;
    }
  }
  if (!useTestProfile && options?.vehicleId) {
    const vehicle = (
      await db.select().from(demoVehicles).where(eq(demoVehicles.id, options.vehicleId)).limit(1)
    )[0];
    if (vehicle) {
      vehicles = [vehicle];
      const user = await getDemoUser(vehicle.userId);
      userInterests = user?.interests ?? [];
      userLocation = user?.location ?? null;
    }
  }

  const weights = loadRankWeights();
  const ranked = rows.map((article) => {
    const extras = extrasMap.get(article.id) ?? {
      makes: [] as string[],
      models: [] as string[],
      generations: [] as string[],
      variants: [] as string[],
      categories: [] as string[],
      interests: [] as string[],
      locations: [] as string[],
    };
    const primaryCategory =
      primaryMap.get(article.id) ??
      classifyPrimary({
        title: article.title,
        excerpt: article.excerpt,
        publication: article.publication,
        categories: extras.categories,
        interests: extras.interests,
      });
    if (options?.section && isContentPrimary(options.section) && primaryCategory !== options.section) {
      return null;
    }
    if (useTestProfile && testProfile && !articleMatchesForYouTest(extras, testProfile)) {
      return null;
    }
    if (!useTestProfile) {
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
    }
    if (options?.category && !extras.categories.includes(options.category)) return null;
    if (!useTestProfile && options?.interest && !extras.interests.includes(options.interest)) return null;
    const source = sourceMap.get(article.sourceId);
    const relevance = source?.relevance ?? "";
    const rankScore =
      useTestProfile || (curated && vehicles.length)
        ? scoreArticle(
            {
              ...extras,
              excerpt: article.excerpt,
              relevance,
              vehicles,
              userInterests,
              userLocation,
            },
            weights,
          ) + recencyBonus(article.publishedAt)
        : curated
          ? scoreForYou({
              relevance,
              publishedAt: article.publishedAt,
              excerptLength: article.excerpt.length,
            })
          : scoreArticle(
              {
                ...extras,
                excerpt: article.excerpt,
                relevance,
                vehicles,
                userInterests,
                userLocation,
              },
              weights,
            );
    return toDto(article, { ...extras, rankScore, primaryCategory });
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

export async function getEditorial(id: number): Promise<EditorialDto | null> {
  const db = await getDb();
  const article = (await db.select().from(articles).where(eq(articles.id, id)).limit(1))[0];
  if (!article) return null;
  const extras = (await extrasByArticleIds([article.id])).get(article.id)!;
  const primaryMap = await loadArticlePrimaries([article.id]);
  const source = (
    await db.select().from(mediaSources).where(eq(mediaSources.id, article.sourceId)).limit(1)
  )[0];
  const rankScore = scoreArticle({
    ...extras,
    excerpt: article.excerpt,
    relevance: source?.relevance ?? "",
    vehicles: [],
    userInterests: [],
  });
  const primaryCategory =
    primaryMap.get(article.id) ??
    classifyPrimary({
      title: article.title,
      excerpt: article.excerpt,
      publication: article.publication,
      categories: extras.categories,
      interests: extras.interests,
    });
  return toDto(article, { ...extras, rankScore, primaryCategory });
}
