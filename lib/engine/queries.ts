import { desc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDb } from "@/lib/db";
import {
  articleCategories,
  articleEntities,
  articleInterests,
  articleLocations,
  articlePrimary,
  articles,
  demoUserInterests,
  demoUsers,
  demoVehicles,
  ingestionRuns,
  mediaSources,
  type Article,
} from "@/lib/db/schema";
import {
  diversifyByVehicle,
  explainArticle,
  loadRankWeights,
  preferUsableImages,
  scoreArticle,
  scoreForYou,
  type EntityHit,
  type GarageVehicle,
  type RankSignal,
  type VehicleTier,
} from "./rank";
import { classifyPrimary, isContentPrimary } from "./taxonomy";
import { displayImageUrls, parseImagePayload } from "./images";
import { loadArticlePrimaries } from "./article-primary";
import {
  parseClassificationSnapshot,
  type ClassificationSnapshot,
} from "./classify";
import { relatedForArticle } from "./related";
import {
  articleMatchesForYouTest,
  buildForYouTestCatalog,
  forYouTestIsActive,
  type ForYouTestProfile,
} from "./for-you-test";
import {
  contextFromDemoUser,
  contextFromTestProfile,
} from "./personalize";

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
  imageSources: string[];
  imageStatus: string | null;
  imageSourceType: string | null;
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
  primaryConfidence: number | null;
  classification: ClassificationSnapshot | null;
  related: { id: number; title: string; publication: string; reason: string; score: number }[];
  why: string[];
  rankSignals: RankSignal[];
  vehicleTier: VehicleTier;
};

type FeedArticle = Pick<
  Article,
  | "id"
  | "sourceId"
  | "publication"
  | "title"
  | "url"
  | "canonicalUrl"
  | "author"
  | "publishedAt"
  | "imageUrl"
  | "excerpt"
  | "editorialScore"
  | "ingestionMethod"
  | "aiSummary"
  | "duplicateGroupId"
  | "metadata"
>;

const ARTICLE_FEED_COLUMNS = {
  id: articles.id,
  sourceId: articles.sourceId,
  publication: articles.publication,
  title: articles.title,
  url: articles.url,
  canonicalUrl: articles.canonicalUrl,
  author: articles.author,
  publishedAt: articles.publishedAt,
  imageUrl: articles.imageUrl,
  excerpt: articles.excerpt,
  editorialScore: articles.editorialScore,
  ingestionMethod: articles.ingestionMethod,
  aiSummary: articles.aiSummary,
  duplicateGroupId: articles.duplicateGroupId,
  metadata: articles.metadata,
};

type ArticleGraph = {
  entities: (typeof articleEntities.$inferSelect)[];
  categories: (typeof articleCategories.$inferSelect)[];
  interests: (typeof articleInterests.$inferSelect)[];
  locations: (typeof articleLocations.$inferSelect)[];
  primaries: (typeof articlePrimary.$inferSelect)[];
  sources: (typeof mediaSources.$inferSelect)[];
};

/** One Turso round of extras per request. Homepage used to scan these tables twice. */
export const loadArticleGraph = cache(async (): Promise<ArticleGraph> => {
  const db = await getDb();
  const [entities, categories, interests, locations, primaries, sources] = await Promise.all([
    db.select().from(articleEntities),
    db.select().from(articleCategories),
    db.select().from(articleInterests),
    db.select().from(articleLocations),
    db.select().from(articlePrimary),
    db.select().from(mediaSources),
  ]);
  return { entities, categories, interests, locations, primaries, sources };
});

function emptyExtras() {
  return {
    makes: [] as string[],
    models: [] as string[],
    generations: [] as string[],
    variants: [] as string[],
    categories: [] as string[],
    interests: [] as string[],
    locations: [] as string[],
    entityHits: [] as EntityHit[],
  };
}

function extrasFromGraph(graph: ArticleGraph, articleIds: number[]) {
  const map = new Map<number, ReturnType<typeof emptyExtras>>();
  for (const id of articleIds) map.set(id, emptyExtras());
  const wanted = new Set(articleIds);
  for (const row of graph.entities) {
    if (!wanted.has(row.articleId)) continue;
    const extras = map.get(row.articleId);
    if (!extras) continue;
    extras.entityHits.push({
      kind: row.kind,
      name: row.name,
      make: row.make,
      model: row.model,
      relevance: row.relevance,
    });
    if (row.kind === "make") extras.makes.push(row.name);
    if (row.kind === "model") extras.models.push(row.name);
    if (row.kind === "generation") extras.generations.push(row.name);
    if (row.kind === "variant") extras.variants.push(row.name);
  }
  for (const row of graph.categories) {
    map.get(row.articleId)?.categories.push(row.category);
  }
  for (const row of graph.interests) {
    map.get(row.articleId)?.interests.push(row.interest);
  }
  for (const row of graph.locations) {
    map.get(row.articleId)?.locations.push(row.location);
  }
  return map;
}

function primariesFromGraph(graph: ArticleGraph) {
  return new Map(graph.primaries.map((row) => [row.articleId, row.primarySlug]));
}

function toDto(
  article: FeedArticle,
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
    primaryConfidence?: number | null;
    classification?: ClassificationSnapshot | null;
    related?: EditorialDto["related"];
    why?: string[];
    rankSignals?: RankSignal[];
    vehicleTier?: VehicleTier;
  },
): EditorialDto {
  const image = parseImagePayload(article.metadata);
  const imageUrls = displayImageUrls(article.imageUrl, image);
  return {
    id: article.id,
    sourceId: article.sourceId,
    publication: article.publication,
    title: article.title,
    url: article.url,
    canonicalUrl: article.canonicalUrl,
    author: article.author,
    publishedAt: new Date(article.publishedAt).toISOString(),
    imageUrl: imageUrls[0] ?? null,
    imageSources: imageUrls.slice(1),
    imageStatus: image?.status ?? (imageUrls[0] ? "ok" : "missing"),
    imageSourceType: image?.sourceType ?? null,
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
    primaryConfidence: extras.primaryConfidence ?? parseClassificationSnapshot(article.metadata)?.primaryConfidence ?? null,
    classification: extras.classification ?? parseClassificationSnapshot(article.metadata),
    related: extras.related ?? [],
    why: extras.why ?? [],
    rankSignals: extras.rankSignals ?? [],
    vehicleTier: extras.vehicleTier ?? "none",
  };
}

async function extrasByArticleIds(articleIds: number[]) {
  const map = new Map<number, ReturnType<typeof emptyExtras>>();
  for (const id of articleIds) map.set(id, emptyExtras());
  if (!articleIds.length) return map;

  if (articleIds.length <= 4) {
    const db = await getDb();
    const [entities, cats, interests, locations] = await Promise.all([
      db.select().from(articleEntities).where(inArray(articleEntities.articleId, articleIds)),
      db.select().from(articleCategories).where(inArray(articleCategories.articleId, articleIds)),
      db.select().from(articleInterests).where(inArray(articleInterests.articleId, articleIds)),
      db.select().from(articleLocations).where(inArray(articleLocations.articleId, articleIds)),
    ]);
    const wanted = new Set(articleIds);
    for (const row of entities) {
      if (!wanted.has(row.articleId)) continue;
      const extras = map.get(row.articleId);
      if (!extras) continue;
      extras.entityHits.push({
        kind: row.kind,
        name: row.name,
        make: row.make,
        model: row.model,
        relevance: row.relevance,
      });
      if (row.kind === "make") extras.makes.push(row.name);
      if (row.kind === "model") extras.models.push(row.name);
      if (row.kind === "generation") extras.generations.push(row.name);
      if (row.kind === "variant") extras.variants.push(row.name);
    }
    for (const row of cats) map.get(row.articleId)?.categories.push(row.category);
    for (const row of interests) map.get(row.articleId)?.interests.push(row.interest);
    for (const row of locations) map.get(row.articleId)?.locations.push(row.location);
    return map;
  }

  return extrasFromGraph(await loadArticleGraph(), articleIds);
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
  hardFilter?: boolean;
  limit?: number;
}): Promise<EditorialDto[]> {
  const db = await getDb();
  const [selected, graph] = await Promise.all([
    db.select(ARTICLE_FEED_COLUMNS).from(articles).orderBy(desc(articles.publishedAt)),
    loadArticleGraph(),
  ]);
  let rows = selected;
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

  const extrasMap = extrasFromGraph(graph, rows.map((row) => row.id));
  const primaryMap = primariesFromGraph(graph);
  const sourceMap = new Map(graph.sources.map((source) => [source.id, source]));
  const testProfile = options?.testProfile;
  const useTestProfile = Boolean(testProfile && forYouTestIsActive(testProfile));
  const curated = options?.section === "for-you" || (!options?.userId && !options?.vehicleId);
  const applyHardFilter = Boolean(
    useTestProfile &&
      testProfile &&
      (options?.hardFilter === true ||
        (options?.hardFilter !== false &&
          Boolean(options?.section && isContentPrimary(options.section)))),
  );
  let vehicles: GarageVehicle[] = [];
  let userInterests: string[] = [];
  let userLocation: string | null = null;
  if (useTestProfile && testProfile) {
    const personal = contextFromTestProfile(testProfile);
    vehicles = personal.vehicles;
    userInterests = personal.interests;
    userLocation = personal.location ?? null;
  } else if (options?.userId) {
    const user = await getDemoUser(options.userId);
    if (user) {
      const personal = contextFromDemoUser(user);
      vehicles = personal.vehicles;
      userInterests = personal.interests;
      userLocation = personal.location ?? null;
    }
  }
  if (!useTestProfile && options?.vehicleId) {
    const vehicle = (
      await db.select().from(demoVehicles).where(eq(demoVehicles.id, options.vehicleId)).limit(1)
    )[0];
    if (vehicle) {
      const user = await getDemoUser(vehicle.userId);
      const personal = contextFromDemoUser({
        vehicles: [vehicle],
        interests: user?.interests ?? [],
        location: user?.location ?? null,
      });
      vehicles = personal.vehicles;
      userInterests = personal.interests;
      userLocation = personal.location ?? null;
    }
  }

  const weights = loadRankWeights();
  const ranked = rows.map((article) => {
    const extras = extrasMap.get(article.id) ?? emptyExtras();
    const snap = parseClassificationSnapshot(article.metadata);
    const primaryCategory =
      (primaryMap.get(article.id) as EditorialDto["primaryCategory"] | undefined) ??
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
    if (applyHardFilter && testProfile && !articleMatchesForYouTest(extras, testProfile)) {
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
    const rankInput = {
      ...extras,
      excerpt: article.excerpt,
      relevance,
      vehicles,
      userInterests,
      userLocation,
      entityHits: extras.entityHits,
      scenes: snap?.scenes,
      contentTypes: snap?.contentTypes,
      geography: (snap?.geography ?? []).map((place) => place.name),
      publishedAt: article.publishedAt,
      primaryCategory,
    };
    const personalized = useTestProfile || (curated && vehicles.length > 0);
    const breakdown = personalized
      ? explainArticle(rankInput, weights)
      : {
          score: curated
            ? scoreForYou({
                relevance,
                publishedAt: article.publishedAt,
                excerptLength: article.excerpt.length,
              })
            : scoreArticle(rankInput, weights),
          reasons: [] as string[],
          signals: [] as EditorialDto["rankSignals"],
          vehicleTier: "none" as const,
        };
    return toDto(article, {
      ...extras,
      rankScore: breakdown.score,
      primaryCategory,
      classification: snap,
      why: breakdown.reasons,
      rankSignals: breakdown.signals,
      vehicleTier: breakdown.vehicleTier,
    });
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
  const shaped =
    personalizedForYou(useTestProfile, curated)
      ? preferUsableImages(
          diversifyByVehicle(
            deduped,
            (item) => item.variants[0] || item.models[0] || item.makes[0] || "",
          ),
          6,
        )
      : deduped;
  return shaped.slice(0, options?.limit ?? 40);
}

function personalizedForYou(useTestProfile: boolean, curated: boolean) {
  return useTestProfile && curated;
}

export async function getEditorial(id: number): Promise<EditorialDto | null> {
  const db = await getDb();
  const article = (
    await db.select(ARTICLE_FEED_COLUMNS).from(articles).where(eq(articles.id, id)).limit(1)
  )[0];
  if (!article) return null;
  const [extrasMap, primaryMap, source, related] = await Promise.all([
    extrasByArticleIds([article.id]),
    loadArticlePrimaries([article.id]),
    db.select().from(mediaSources).where(eq(mediaSources.id, article.sourceId)).limit(1),
    relatedForArticle(article.id),
  ]);
  const extras = extrasMap.get(article.id)!;
  const rankScore = scoreArticle({
    ...extras,
    excerpt: article.excerpt,
    relevance: source[0]?.relevance ?? "",
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
  const snap = parseClassificationSnapshot(article.metadata);
  return toDto(article, {
    ...extras,
    rankScore,
    primaryCategory,
    primaryConfidence: snap?.primaryConfidence ?? null,
    classification: snap,
    related,
  });
}

export type ClassificationDebugRow = {
  id: number;
  title: string;
  publication: string;
  excerpt: string;
  classification: ClassificationSnapshot | null;
};

export async function listClassificationDebug(limit = 40): Promise<ClassificationDebugRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      publication: articles.publication,
      excerpt: articles.excerpt,
      metadata: articles.metadata,
      lastProcessed: articles.lastProcessed,
    })
    .from(articles)
    .orderBy(desc(articles.lastProcessed), desc(articles.publishedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    publication: row.publication,
    excerpt: row.excerpt,
    classification: parseClassificationSnapshot(row.metadata),
  }));
}

async function loadForYouTestCatalogFresh() {
  const graph = await loadArticleGraph();
  return buildForYouTestCatalog({
    entities: graph.entities.map((row) => ({
      kind: row.kind,
      name: row.name,
      make: row.make,
      model: row.model,
    })),
    interests: graph.interests.map((row) => row.interest),
    locations: graph.locations.map((row) => row.location),
  });
}

/** Gazetteer plus every make/model/generation/variant/interest/location on live stories. */
export async function loadForYouTestCatalog() {
  return unstable_cache(loadForYouTestCatalogFresh, ["for-you-test-catalog"], {
    revalidate: 60,
    tags: ["editorial"],
  })();
}
