import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  articleCategories,
  articleContentTypes,
  articleEntities,
  articleGeography,
  articleImages,
  articleInterests,
  articleLocations,
  articleMotorsport,
  articlePrimary,
  articleRelated,
  articleScenes,
  articles,
  ingestionRuns,
  mediaSources,
  type MediaSource,
} from "@/lib/db/schema";
import { parseFeedXml, type EngineItem } from "./adapters/rss";
import { isSitemapIndex, looksLikeArticleUrl, parseSitemapXml } from "./adapters/sitemap";
import { parseArticleMetadata, parseHomeLinks, robotsAllows } from "./adapters/scrape";
import { fetchText, looksLikeFeed } from "./http";
import {
  emptyImagePayload,
  mergeImageMetadata,
  parseImagePayload,
  resolveCandidates,
  selectPrimaryImage,
  type ImageCandidate,
} from "./images";
import { isUsableArticleImage } from "../text";
import { isMerchArticle, isMerchUrl } from "./merch";
import { isNonEditorialArticle, isNonEditorialUrl } from "./non-editorial";
import { duplicateKey, publisherScore, sameStoryKey } from "./normalize";
import { loadRankWeights } from "./rank";
import { isEnglish } from "./language";
import { extractOriginalPage } from "./summarize";
import { upsertArticlePrimary } from "./article-primary";
import {
  classifyArticle,
  classificationSnapshot,
  mergeClassificationMetadata,
} from "./classify";
import { rebuildRelatedStories } from "./related";
import { DISABLED_SOURCE_SET, ENABLED_SOURCE_SET } from "@/config/wave1-sources";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SourceIngestResult = {
  sourceId: string;
  publication: string;
  method: string | null;
  fetched: number;
  inserted: number;
  summarized: number;
  skippedNonEnglish: number;
  skippedMerch: number;
  skippedNonEditorial: number;
  error: string | null;
  httpStatus: number | null;
};

export async function ingestEnabledSources(ids?: string[]): Promise<SourceIngestResult[]> {
  const db = await getDb();
  await purgeNonEnglishArticles();
  await purgeMerchArticles();
  await purgeNonEditorialArticles();
  const sources = (await db.select().from(mediaSources)).filter((source) => {
    if (!source.enabled) return false;
    if (DISABLED_SOURCE_SET.has(source.id)) return false;
    if (!ENABLED_SOURCE_SET.has(source.id)) return false;
    if (!ids?.length) return true;
    return ids.includes(source.id);
  });
  const results: SourceIngestResult[] = [];
  for (const source of sources) {
    results.push(await ingestMediaSource(source));
  }
  await extractMissingSummaries();
  await extractMissingImages();
  return results;
}

export async function ingestMediaSource(source: MediaSource): Promise<SourceIngestResult> {
  const db = await getDb();
  const startedAt = Date.now();
  let method: string | null = null;
  let httpStatus: number | null = null;
  let items: EngineItem[] = [];
  let error: string | null = null;

  try {
    const rss = await tryRss(source);
    httpStatus = rss.status;
    if (rss.items.length) {
      method = rss.items[0]?.method ?? "rss";
      items = rss.items;
    } else if (rss.error) {
      error = rss.error;
    }

    if (!items.length) {
      const sitemap = await trySitemap(source);
      httpStatus = sitemap.status ?? httpStatus;
      if (sitemap.items.length) {
        method = "sitemap";
        items = sitemap.items;
        error = null;
      } else if (sitemap.error && !error) {
        error = sitemap.error;
      }
    }

    if (!items.length) {
      const scrape = await tryScrape(source);
      httpStatus = scrape.status ?? httpStatus;
      if (scrape.items.length) {
        method = "scrape";
        items = scrape.items;
        error = null;
      } else if (scrape.error) {
        error = scrape.error;
      }
    }

    items = items.filter(
      (item) =>
        !isMerchUrl(item.canonicalUrl) &&
        !isMerchUrl(item.url) &&
        !isNonEditorialUrl(item.canonicalUrl, source.url) &&
        !isNonEditorialUrl(item.url, source.url),
    );
    items = items.slice(0, source.maxArticles);
    const { inserted, summarized, skippedNonEnglish, skippedMerch, skippedNonEditorial } =
      await persistItems(source, items, method ?? "none");
    const ok = items.length > 0;
    await db.insert(ingestionRuns).values({
      sourceId: source.id,
      startedAt,
      finishedAt: Date.now(),
      method,
      status: ok ? "ok" : "error",
      httpStatus,
      errorMessage: ok ? null : error ?? "No articles found",
      fetched: items.length,
      inserted,
    });
    await db
      .update(mediaSources)
      .set(
        ok
          ? {
              lastSuccessAt: Date.now(),
              lastMethod: method,
              lastHttpStatus: httpStatus,
              lastError: null,
              failureCount: 0,
              lastArticleCount: items.length,
            }
          : {
              lastFailureAt: Date.now(),
              lastMethod: method,
              lastHttpStatus: httpStatus,
              lastError: error ?? "No articles found",
              failureCount: source.failureCount + 1,
              lastArticleCount: 0,
            },
      )
      .where(eq(mediaSources.id, source.id));
    return {
      sourceId: source.id,
      publication: source.publication,
      method,
      fetched: items.length,
      inserted,
      summarized,
      skippedNonEnglish,
      skippedMerch,
      skippedNonEditorial,
      error: ok ? null : error ?? "No articles found",
      httpStatus,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Ingest failed";
    await db.insert(ingestionRuns).values({
      sourceId: source.id,
      startedAt,
      finishedAt: Date.now(),
      method,
      status: "error",
      httpStatus,
      errorMessage: message,
      fetched: 0,
      inserted: 0,
    });
    await db
      .update(mediaSources)
      .set({
        lastFailureAt: Date.now(),
        lastError: message,
        failureCount: source.failureCount + 1,
        lastHttpStatus: httpStatus,
        lastMethod: method,
      })
      .where(eq(mediaSources.id, source.id));
    return {
      sourceId: source.id,
      publication: source.publication,
      method,
      fetched: 0,
      inserted: 0,
      summarized: 0,
      skippedNonEnglish: 0,
      skippedMerch: 0,
      skippedNonEditorial: 0,
      error: message,
      httpStatus,
    };
  }
}

async function tryRss(source: MediaSource): Promise<{
  items: EngineItem[];
  status: number | null;
  error: string | null;
}> {
  if (!source.rssUrl) {
    return { items: [], status: null, error: "No RSS URL in config" };
  }
  const result = await fetchText(source.rssUrl, {
    accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  });
  if (!result.ok) {
    return { items: [], status: result.status, error: `RSS HTTP ${result.status}` };
  }
  if (!looksLikeFeed(result.text, result.contentType)) {
    return { items: [], status: result.status, error: "RSS URL did not return a feed" };
  }
  try {
    const items = parseFeedXml(result.text, result.contentType);
    return { items, status: result.status, error: items.length ? null : "Empty feed" };
  } catch (error) {
    return {
      items: [],
      status: result.status,
      error: error instanceof Error ? error.message : "Malformed feed",
    };
  }
}

async function trySitemap(source: MediaSource): Promise<{
  items: EngineItem[];
  status: number | null;
  error: string | null;
}> {
  const origin = new URL(source.url).origin;
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/news-sitemap.xml`,
    `${origin}/sitemap-news.xml`,
  ];
  let lastStatus: number | null = null;
  for (const candidate of candidates) {
    const result = await fetchText(candidate, { accept: "application/xml, text/xml" });
    lastStatus = result.status;
    if (!result.ok || !result.text.includes("<loc>")) continue;
    let urls = parseSitemapXml(result.text);
    if (isSitemapIndex(result.text)) {
      const child = urls[0];
      if (child) {
        const nested = await fetchText(child, { accept: "application/xml, text/xml" });
        lastStatus = nested.status;
        if (nested.ok) urls = parseSitemapXml(nested.text);
      }
    }
    const articleUrls = urls
      .filter((url) => looksLikeArticleUrl(url, source.url))
      .slice(0, source.maxArticles);
    const items: EngineItem[] = [];
    for (const url of articleUrls) {
      await delay(200);
      const page = await fetchText(url);
      if (!page.ok) continue;
      const item = parseArticleMetadata(page.text, url);
      if (item) {
        items.push({ ...item, method: "sitemap" });
      }
    }
    if (items.length) return { items, status: lastStatus, error: null };
  }
  return { items: [], status: lastStatus, error: "No usable sitemap" };
}

async function tryScrape(source: MediaSource): Promise<{
  items: EngineItem[];
  status: number | null;
  error: string | null;
}> {
  const origin = new URL(source.url).origin;
  const robots = await fetchText(`${origin}/robots.txt`, { timeoutMs: 8000 });
  const home = await fetchText(source.url);
  if (!home.ok) {
    return { items: [], status: home.status, error: `Homepage HTTP ${home.status}` };
  }
  const links = parseHomeLinks(home.text, source.url)
    .filter((url) => looksLikeArticleUrl(url, source.url))
    .filter((url) => {
      if (!robots.ok) return true;
      try {
        return robotsAllows(robots.text, new URL(url).pathname);
      } catch {
        return true;
      }
    })
    .slice(0, source.maxArticles);

  const items: EngineItem[] = [];
  for (const url of links) {
      await delay(200);
    try {
      if (robots.ok && !robotsAllows(robots.text, new URL(url).pathname)) continue;
    } catch {
      // keep going
    }
    const page = await fetchText(url);
    if (!page.ok) continue;
    const item = parseArticleMetadata(page.text, url);
    if (item) items.push(item);
  }
  if (!items.length) {
    const homeItem = parseArticleMetadata(home.text, source.url);
    if (homeItem) items.push(homeItem);
  }
  return {
    items,
    status: home.status,
    error: items.length ? null : "Scrape found no article metadata",
  };
}

async function persistItems(
  source: MediaSource,
  items: EngineItem[],
  method: string,
): Promise<{
  inserted: number;
  summarized: number;
  skippedNonEnglish: number;
  skippedMerch: number;
  skippedNonEditorial: number;
}> {
  const db = await getDb();
  const now = Date.now();
  const weights = loadRankWeights();
  let inserted = 0;
  let skippedNonEnglish = 0;
  let skippedMerch = 0;
  let skippedNonEditorial = 0;
  const pendingPages: PendingPage[] = [];
  const existing = await db.select().from(articles);
  const byTitle = new Map(
    existing.map((row) => [sameStoryKey(row.title), row.duplicateGroupId ?? sameStoryKey(row.title)]),
  );

  for (const item of items) {
    if (isMerchUrl(item.canonicalUrl) || isMerchUrl(item.url)) {
      skippedMerch += 1;
      continue;
    }
    if (isNonEditorialUrl(item.canonicalUrl, source.url) || isNonEditorialUrl(item.url, source.url)) {
      skippedNonEditorial += 1;
      continue;
    }
    if (!isEnglish(item.title, item.excerpt)) {
      skippedNonEnglish += 1;
      continue;
    }
    const seen = (
      await db.select().from(articles).where(eq(articles.canonicalUrl, item.canonicalUrl)).limit(1)
    )[0];
    if (seen) {
      const kept = isUsableArticleImage(seen.imageUrl) ? seen.imageUrl : null;
      const incoming = source.allowImage
        ? resolveCandidates(item.imageCandidates ?? imageCandidatesFromUrl(item.imageUrl), item.canonicalUrl)
        : [];
      const imageUrl = kept || incoming[0]?.url || null;
      await db
        .update(articles)
        .set({ lastSeen: now, imageUrl })
        .where(eq(articles.id, seen.id));
      if (!seen.aiSummary?.trim() || (source.allowImage && !isUsableArticleImage(imageUrl))) {
        pendingPages.push({
          id: seen.id,
          title: seen.title,
          canonicalUrl: seen.canonicalUrl,
          teaser: seen.excerpt,
          imageUrl,
          aiSummary: seen.aiSummary,
          publication: seen.publication,
          allowImage: source.allowImage,
          metadata: seen.metadata,
          imageCandidates: incoming,
        });
      }
      continue;
    }
    const group = byTitle.get(sameStoryKey(item.title)) ?? sameStoryKey(item.title);
    byTitle.set(sameStoryKey(item.title), group);
    const feedCandidates = source.allowImage
      ? resolveCandidates(item.imageCandidates ?? imageCandidatesFromUrl(item.imageUrl), item.canonicalUrl)
      : [];
    const created = await db
      .insert(articles)
      .values({
        sourceId: source.id,
        publication: source.publication,
        title: item.title,
        url: item.url,
        canonicalUrl: item.canonicalUrl,
        guid: item.guid ?? null,
        author: source.allowExcerpt ? item.author ?? null : null,
        publishedAt: Number.isFinite(item.publishedAt) ? item.publishedAt : now,
        imageUrl: feedCandidates[0]?.url ?? null,
        excerpt: source.allowExcerpt ? item.excerpt : "",
        editorialScore: publisherScore(source.relevance) + (item.excerpt.length >= 180 ? weights.longForm : 0),
        processed: true,
        firstSeen: now,
        lastSeen: now,
        lastProcessed: now,
        duplicateGroupId: group,
        ingestionMethod: item.method || method,
        whyItMatters: null,
        aiSummary: null,
        metadata: JSON.stringify({ duplicateKey: duplicateKey(source.publication, item.title) }),
      })
      .onConflictDoNothing({ target: articles.canonicalUrl })
      .returning();
    const row = created[0];
    if (!row) continue;
    inserted += 1;
    if (row.imageUrl) {
      await db.insert(articleImages).values({
        articleId: row.id,
        url: row.imageUrl,
        source: source.publication,
        alt: row.title,
      });
    }
    pendingPages.push({
      id: row.id,
      title: row.title,
      canonicalUrl: row.canonicalUrl,
      teaser: row.excerpt,
      imageUrl: row.imageUrl,
      aiSummary: row.aiSummary,
      publication: source.publication,
      allowImage: source.allowImage,
      metadata: row.metadata,
      imageCandidates: feedCandidates,
    });
    await persistArticleExtraction(row.id);
  }
  const summarized = await summarizePending(pendingPages);
  return { inserted, summarized, skippedNonEnglish, skippedMerch, skippedNonEditorial };
}

export async function deleteArticleById(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(articleEntities).where(eq(articleEntities.articleId, id));
  await db.delete(articleCategories).where(eq(articleCategories.articleId, id));
  await db.delete(articleInterests).where(eq(articleInterests.articleId, id));
  await db.delete(articleLocations).where(eq(articleLocations.articleId, id));
  await db.delete(articleContentTypes).where(eq(articleContentTypes.articleId, id));
  await db.delete(articleScenes).where(eq(articleScenes.articleId, id));
  await db.delete(articleMotorsport).where(eq(articleMotorsport.articleId, id));
  await db.delete(articleGeography).where(eq(articleGeography.articleId, id));
  await db.delete(articleRelated).where(eq(articleRelated.articleId, id));
  await db.delete(articleRelated).where(eq(articleRelated.relatedArticleId, id));
  await db.delete(articleImages).where(eq(articleImages.articleId, id));
  await db.delete(articlePrimary).where(eq(articlePrimary.articleId, id));
  await db.delete(articles).where(eq(articles.id, id));
}

export async function purgeNonEnglishArticles(): Promise<{
  removed: number;
  ids: number[];
}> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const ids: number[] = [];
  for (const row of rows) {
    if (isEnglish(row.title, row.excerpt)) continue;
    await deleteArticleById(row.id);
    ids.push(row.id);
  }
  return { removed: ids.length, ids };
}

export async function purgeMerchArticles(): Promise<{
  removed: number;
  ids: number[];
}> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const ids: number[] = [];
  for (const row of rows) {
    if (!isMerchArticle(row)) continue;
    await deleteArticleById(row.id);
    ids.push(row.id);
  }
  return { removed: ids.length, ids };
}

export async function purgeNonEditorialArticles(): Promise<{
  removed: number;
  ids: number[];
  rows: {
    id: number;
    publication: string;
    title: string;
    url: string;
    canonicalUrl: string;
  }[];
}> {
  const db = await getDb();
  const sources = await db.select().from(mediaSources);
  const sourceUrl = new Map(sources.map((source) => [source.id, source.url]));
  const rows = await db.select().from(articles);
  const removed: {
    id: number;
    publication: string;
    title: string;
    url: string;
    canonicalUrl: string;
  }[] = [];
  for (const row of rows) {
    if (!isNonEditorialArticle(row, sourceUrl.get(row.sourceId))) continue;
    await deleteArticleById(row.id);
    removed.push({
      id: row.id,
      publication: row.publication,
      title: row.title,
      url: row.url,
      canonicalUrl: row.canonicalUrl,
    });
  }
  return { removed: removed.length, ids: removed.map((row) => row.id), rows: removed };
}

export async function purgeArticlesBySourceId(sourceId: string): Promise<{
  removed: number;
  ids: number[];
}> {
  const db = await getDb();
  const rows = await db.select().from(articles).where(eq(articles.sourceId, sourceId));
  const ids: number[] = [];
  for (const row of rows) {
    await deleteArticleById(row.id);
    ids.push(row.id);
  }
  return { removed: ids.length, ids };
}

const EXTRACT_CONCURRENCY = 4;

type PendingPage = {
  id: number;
  title: string;
  canonicalUrl: string;
  teaser: string;
  imageUrl: string | null;
  aiSummary: string | null;
  publication: string;
  allowImage: boolean;
  metadata: string | null;
  imageCandidates: ImageCandidate[];
};

async function summarizePending(pending: PendingPage[]): Promise<number> {
  if (!pending.length) return 0;
  const db = await getDb();
  const unique: PendingPage[] = [];
  const seen = new Set<number>();
  for (const item of pending) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  let summarized = 0;
  for (let index = 0; index < unique.length; index += EXTRACT_CONCURRENCY) {
    const batch = unique.slice(index, index + EXTRACT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => ({
        item,
        page: await extractOriginalPage(item.canonicalUrl, item.title, item.teaser),
      })),
    );
    for (const result of results) {
      const stored = isUsableArticleImage(result.item.imageUrl) ? result.item.imageUrl : null;
      const existingPayload = parseImagePayload(result.item.metadata);
      if (result.page.summary && !result.item.aiSummary?.trim()) {
        await db
          .update(articles)
          .set({ aiSummary: result.page.summary })
          .where(eq(articles.id, result.item.id));
        summarized += 1;
        await persistArticleExtraction(result.item.id);
      }
      if (result.item.allowImage && (!stored || !existingPayload)) {
        const merged = [
          ...result.item.imageCandidates,
          ...imageCandidatesFromUrl(stored),
          ...resolveCandidates(result.page.imageCandidates, result.item.canonicalUrl),
        ];
        const payload = await selectPrimaryImage(merged);
        await persistArticleImages(
          result.item.id,
          payload,
          result.item.publication,
          result.item.title,
          result.item.metadata,
        );
      } else if (!stored && result.item.imageUrl) {
        await persistArticleImages(
          result.item.id,
          emptyImagePayload(),
          result.item.publication,
          result.item.title,
          result.item.metadata,
        );
      }
    }
    await delay(150);
  }
  return summarized;
}

async function persistArticleImages(
  articleId: number,
  payload: Awaited<ReturnType<typeof selectPrimaryImage>>,
  publication: string,
  title: string,
  metadata: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(articles)
    .set({
      imageUrl: payload.primary,
      metadata: mergeImageMetadata(metadata, payload),
    })
    .where(eq(articles.id, articleId));
  await db.delete(articleImages).where(eq(articleImages.articleId, articleId));
  for (const [index, source] of payload.sources.entries()) {
    await db.insert(articleImages).values({
      articleId,
      url: source.url,
      source: publication,
      alt: title,
      sourceType: source.sourceType,
      status: source.status ?? "pending",
      lastValidated: source.lastValidated ?? null,
      sortOrder: index,
      isPrimary: payload.primary === source.url,
    });
  }
}

function imageCandidatesFromUrl(url: string | null | undefined): ImageCandidate[] {
  if (!isUsableArticleImage(url)) return [];
  return [{ url, sourceType: "article" }];
}

function toPendingPage(
  row: {
    id: number;
    title: string;
    canonicalUrl: string;
    excerpt: string;
    imageUrl: string | null;
    aiSummary: string | null;
    publication: string;
    metadata?: string | null;
  },
  allowImage = true,
): PendingPage {
  const payload = parseImagePayload(row.metadata);
  return {
    id: row.id,
    title: row.title,
    canonicalUrl: row.canonicalUrl,
    teaser: row.excerpt,
    imageUrl: row.imageUrl,
    aiSummary: row.aiSummary,
    publication: row.publication,
    allowImage,
    metadata: row.metadata ?? null,
    imageCandidates: payload?.sources.length
      ? payload.sources
      : imageCandidatesFromUrl(row.imageUrl),
  };
}

export async function extractMissingSummaries(): Promise<{
  attempted: number;
  filled: number;
  hidden: number;
}> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const missing = rows.filter((row) => !row.aiSummary?.trim());
  const filled = await summarizePending(missing.map((row) => toPendingPage(row)));
  return {
    attempted: missing.length,
    filled,
    hidden: missing.length - filled,
  };
}

export async function extractMissingImages(options?: {
  ids?: number[];
  limit?: number;
}): Promise<{ attempted: number; filled: number }> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  let missing = rows.filter((row) => !isUsableArticleImage(row.imageUrl));
  if (options?.ids?.length) {
    const wanted = new Set(options.ids);
    missing = missing.filter((row) => wanted.has(row.id));
  }
  if (options?.limit && options.limit > 0) {
    missing = missing.slice(0, options.limit);
  }
  await summarizePending(missing.map((row) => toPendingPage(row)));
  const filled = (
    await Promise.all(
      missing.map(async (row) => {
        const current = (
          await db.select().from(articles).where(eq(articles.id, row.id)).limit(1)
        )[0];
        return isUsableArticleImage(current?.imageUrl) ? 1 : 0;
      }),
    )
  ).reduce((sum: number, value: number) => sum + value, 0);
  return { attempted: missing.length, filled };
}

async function persistArticleExtraction(articleId: number): Promise<void> {
  const db = await getDb();
  const row = (await db.select().from(articles).where(eq(articles.id, articleId)).limit(1))[0];
  if (!row) return;
  const classified = classifyArticle(row.title, row.excerpt, row.aiSummary ?? "", row.publication);
  await db.delete(articleEntities).where(eq(articleEntities.articleId, articleId));
  await db.delete(articleCategories).where(eq(articleCategories.articleId, articleId));
  await db.delete(articleInterests).where(eq(articleInterests.articleId, articleId));
  await db.delete(articleLocations).where(eq(articleLocations.articleId, articleId));
  await db.delete(articleContentTypes).where(eq(articleContentTypes.articleId, articleId));
  await db.delete(articleScenes).where(eq(articleScenes.articleId, articleId));
  await db.delete(articleMotorsport).where(eq(articleMotorsport.articleId, articleId));
  await db.delete(articleGeography).where(eq(articleGeography.articleId, articleId));
  for (const entity of classified.entities) {
    await db.insert(articleEntities).values({
      articleId,
      kind: entity.kind,
      name: entity.name,
      slug: entity.slug,
      make: entity.make ?? null,
      model: entity.model ?? null,
      confidence: Math.round(entity.confidence * 100),
      relevance: entity.relevance,
      chassis: entity.chassis ?? null,
      canonicalId: entity.canonicalId,
      source: entity.source,
    });
  }
  for (const category of classified.categories) {
    await db.insert(articleCategories).values({ articleId, category });
  }
  for (const interest of classified.interests) {
    await db.insert(articleInterests).values({ articleId, interest });
  }
  for (const location of classified.locations) {
    await db.insert(articleLocations).values({ articleId, location });
  }
  for (const rowType of classified.contentTypes) {
    await db.insert(articleContentTypes).values({
      articleId,
      contentType: rowType.name,
      confidence: rowType.confidence,
      source: rowType.source,
    });
  }
  for (const scene of classified.scenes) {
    await db.insert(articleScenes).values({
      articleId,
      scene: scene.name,
      confidence: scene.confidence,
      source: scene.source,
    });
  }
  for (const series of classified.motorsport) {
    await db.insert(articleMotorsport).values({
      articleId,
      series: series.name,
      confidence: series.confidence,
      source: series.source,
    });
  }
  for (const place of classified.geography) {
    await db.insert(articleGeography).values({
      articleId,
      kind: place.kind,
      name: place.name,
      slug: place.slug,
      confidence: place.confidence,
      source: place.source,
    });
  }
  await db
    .update(articles)
    .set({
      metadata: mergeClassificationMetadata(row.metadata, classificationSnapshot(classified)),
    })
    .where(eq(articles.id, articleId));
  await upsertArticlePrimary(
    articleId,
    {
      title: row.title,
      excerpt: row.excerpt,
      publication: row.publication,
      categories: classified.categories,
      interests: classified.interests,
      contentTypes: classified.contentTypes.map((item) => item.name),
      scenes: classified.scenes.map((item) => item.name),
    },
    classified.primaryConfidence,
  );
}

export async function reprocessArticles(): Promise<number> {
  await extractMissingSummaries();
  const db = await getDb();
  const rows = await db.select().from(articles);
  let count = 0;
  for (const row of rows) {
    await persistArticleExtraction(row.id);
    await db
      .update(articles)
      .set({ processed: true, lastProcessed: Date.now() })
      .where(eq(articles.id, row.id));
    count += 1;
  }
  await rebuildRelatedStories();
  return count;
}

/** Classify stored teasers/extracts only. No page fetch, no ingest wave. Idempotent. */
export async function backfillArticleMetadata(options?: {
  ids?: number[];
  limit?: number;
}): Promise<{ classified: number; related: number }> {
  const db = await getDb();
  let rows = await db.select().from(articles);
  if (options?.ids?.length) {
    const wanted = new Set(options.ids);
    rows = rows.filter((row) => wanted.has(row.id));
  }
  if (options?.limit && options.limit > 0) {
    rows = rows.slice(0, options.limit);
  }
  let classified = 0;
  for (const row of rows) {
    await persistArticleExtraction(row.id);
    await db
      .update(articles)
      .set({ processed: true, lastProcessed: Date.now() })
      .where(eq(articles.id, row.id));
    classified += 1;
  }
  const related = await rebuildRelatedStories();
  return { classified, related };
}
