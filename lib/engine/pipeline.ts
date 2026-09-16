import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  articleCategories,
  articleEntities,
  articleImages,
  articleInterests,
  articleLocations,
  articles,
  ingestionRuns,
  mediaSources,
  type MediaSource,
} from "@/lib/db/schema";
import { parseFeedXml, type EngineItem } from "./adapters/rss";
import { isSitemapIndex, looksLikeArticleUrl, parseSitemapXml } from "./adapters/sitemap";
import { parseArticleMetadata, parseHomeLinks, robotsAllows } from "./adapters/scrape";
import { extractEntities } from "./extract";
import { fetchText, looksLikeFeed } from "./http";
import { resolveImageUrl } from "./magazine";
import { duplicateKey, publisherScore, sameStoryKey } from "./normalize";
import { loadRankWeights } from "./rank";
import { llmConfigured, summarizeOriginalArticle } from "./summarize";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SourceIngestResult = {
  sourceId: string;
  publication: string;
  method: string | null;
  fetched: number;
  inserted: number;
  summarized: number;
  error: string | null;
  httpStatus: number | null;
};

const MAX_SUMMARIES_PER_SOURCE = 8;

export async function ingestEnabledSources(ids?: string[]): Promise<SourceIngestResult[]> {
  const db = await getDb();
  const sources = (await db.select().from(mediaSources)).filter((source) => {
    if (!source.enabled) return false;
    if (!ids?.length) return true;
    return ids.includes(source.id);
  });
  const results: SourceIngestResult[] = [];
  let summaryBudget = 16;
  for (const source of sources) {
    const result = await ingestMediaSource(source, summaryBudget);
    results.push(result);
    summaryBudget = Math.max(0, summaryBudget - result.summarized);
  }
  if (summaryBudget > 0) {
    await summarizeMissingArticles(summaryBudget);
  }
  return results;
}

export async function ingestMediaSource(
  source: MediaSource,
  summaryBudget = MAX_SUMMARIES_PER_SOURCE,
): Promise<SourceIngestResult> {
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

    items = items.slice(0, source.maxArticles);
    const { inserted, summarized } = await persistItems(
      source,
      items,
      method ?? "none",
      summaryBudget,
    );
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
  summaryBudget: number,
): Promise<{ inserted: number; summarized: number }> {
  const db = await getDb();
  const now = Date.now();
  const weights = loadRankWeights();
  let inserted = 0;
  const pendingSummaries: { id: number; title: string; canonicalUrl: string }[] = [];
  const existing = await db.select().from(articles);
  const byTitle = new Map(
    existing.map((row) => [sameStoryKey(row.title), row.duplicateGroupId ?? sameStoryKey(row.title)]),
  );

  for (const item of items) {
    const seen = (
      await db.select().from(articles).where(eq(articles.canonicalUrl, item.canonicalUrl)).limit(1)
    )[0];
    if (seen) {
      const imageUrl =
        seen.imageUrl || (source.allowImage ? resolveImageUrl(item.imageUrl, item.canonicalUrl) : null);
      await db
        .update(articles)
        .set({ lastSeen: now, imageUrl: imageUrl ?? seen.imageUrl })
        .where(eq(articles.id, seen.id));
      if (!seen.aiSummary?.trim()) {
        pendingSummaries.push({
          id: seen.id,
          title: seen.title,
          canonicalUrl: seen.canonicalUrl,
        });
      }
      continue;
    }
    const group = byTitle.get(sameStoryKey(item.title)) ?? sameStoryKey(item.title);
    byTitle.set(sameStoryKey(item.title), group);
    const extracted = extractEntities(item.title, item.excerpt);
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
        imageUrl: source.allowImage ? resolveImageUrl(item.imageUrl, item.canonicalUrl) : null,
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
    for (const entity of extracted.entities) {
      await db.insert(articleEntities).values({
        articleId: row.id,
        kind: entity.kind,
        name: entity.name,
        slug: entity.slug,
        make: entity.make ?? null,
        model: entity.model ?? null,
        confidence: Math.round(entity.confidence * 100),
      });
    }
    for (const category of extracted.categories) {
      await db.insert(articleCategories).values({ articleId: row.id, category });
    }
    for (const interest of extracted.interests) {
      await db.insert(articleInterests).values({ articleId: row.id, interest });
    }
    for (const location of extracted.locations) {
      await db.insert(articleLocations).values({ articleId: row.id, location });
    }
    if (row.imageUrl) {
      await db.insert(articleImages).values({
        articleId: row.id,
        url: row.imageUrl,
        source: source.publication,
        alt: row.title,
      });
    }
    pendingSummaries.push({
      id: row.id,
      title: row.title,
      canonicalUrl: row.canonicalUrl,
    });
  }
  const summarized = await summarizePending(pendingSummaries, summaryBudget);
  return { inserted, summarized };
}

async function summarizePending(
  pending: { id: number; title: string; canonicalUrl: string }[],
  budget: number,
): Promise<number> {
  if (!pending.length || !llmConfigured() || budget <= 0) return 0;
  const db = await getDb();
  const seen = new Set<number>();
  let summarized = 0;
  for (const item of pending) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (summarized >= Math.min(MAX_SUMMARIES_PER_SOURCE, budget)) break;
    const summary = await summarizeOriginalArticle(item.canonicalUrl, item.title);
    if (!summary) continue;
    await db.update(articles).set({ aiSummary: summary }).where(eq(articles.id, item.id));
    summarized += 1;
    await delay(150);
  }
  return summarized;
}

export async function summarizeMissingArticles(limit: number): Promise<number> {
  if (!llmConfigured() || limit <= 0) return 0;
  const db = await getDb();
  const rows = await db.select().from(articles);
  const missing = rows
    .filter((row) => !row.aiSummary?.trim())
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, limit)
    .map((row) => ({ id: row.id, title: row.title, canonicalUrl: row.canonicalUrl }));
  return summarizePending(missing, limit);
}

export async function reprocessArticles(): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  let count = 0;
  for (const row of rows) {
    await db.delete(articleEntities).where(eq(articleEntities.articleId, row.id));
    await db.delete(articleCategories).where(eq(articleCategories.articleId, row.id));
    await db.delete(articleInterests).where(eq(articleInterests.articleId, row.id));
    await db.delete(articleLocations).where(eq(articleLocations.articleId, row.id));
    const extracted = extractEntities(row.title, row.excerpt);
    for (const entity of extracted.entities) {
      await db.insert(articleEntities).values({
        articleId: row.id,
        kind: entity.kind,
        name: entity.name,
        slug: entity.slug,
        make: entity.make ?? null,
        model: entity.model ?? null,
        confidence: Math.round(entity.confidence * 100),
      });
    }
    for (const category of extracted.categories) {
      await db.insert(articleCategories).values({ articleId: row.id, category });
    }
    for (const interest of extracted.interests) {
      await db.insert(articleInterests).values({ articleId: row.id, interest });
    }
    await db
      .update(articles)
      .set({ processed: true, lastProcessed: Date.now() })
      .where(eq(articles.id, row.id));
    count += 1;
  }
  return count;
}
