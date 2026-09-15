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
import { duplicateKey, publisherScore, sameStoryKey } from "./normalize";
import { loadRankWeights } from "./rank";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SourceIngestResult = {
  sourceId: string;
  publication: string;
  method: string | null;
  fetched: number;
  inserted: number;
  error: string | null;
  httpStatus: number | null;
};

export async function ingestEnabledSources(ids?: string[]): Promise<SourceIngestResult[]> {
  const db = getDb();
  const sources = db.select().from(mediaSources).all().filter((source) => {
    if (!source.enabled) return false;
    if (!ids?.length) return true;
    return ids.includes(source.id);
  });
  const results: SourceIngestResult[] = [];
  for (const source of sources) {
    results.push(await ingestMediaSource(source));
  }
  return results;
}

export async function ingestMediaSource(source: MediaSource): Promise<SourceIngestResult> {
  const db = getDb();
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
    const inserted = persistItems(source, items, method ?? "none");
    const ok = items.length > 0;
    db.insert(ingestionRuns)
      .values({
        sourceId: source.id,
        startedAt,
        finishedAt: Date.now(),
        method,
        status: ok ? "ok" : "error",
        httpStatus,
        errorMessage: ok ? null : error ?? "No articles found",
        fetched: items.length,
        inserted,
      })
      .run();
    db.update(mediaSources)
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
      .where(eq(mediaSources.id, source.id))
      .run();
    return {
      sourceId: source.id,
      publication: source.publication,
      method,
      fetched: items.length,
      inserted,
      error: ok ? null : error ?? "No articles found",
      httpStatus,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Ingest failed";
    db.insert(ingestionRuns)
      .values({
        sourceId: source.id,
        startedAt,
        finishedAt: Date.now(),
        method,
        status: "error",
        httpStatus,
        errorMessage: message,
        fetched: 0,
        inserted: 0,
      })
      .run();
    db.update(mediaSources)
      .set({
        lastFailureAt: Date.now(),
        lastError: message,
        failureCount: source.failureCount + 1,
        lastHttpStatus: httpStatus,
        lastMethod: method,
      })
      .where(eq(mediaSources.id, source.id))
      .run();
    return {
      sourceId: source.id,
      publication: source.publication,
      method,
      fetched: 0,
      inserted: 0,
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
      await delay(400);
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
    await delay(500);
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

function persistItems(source: MediaSource, items: EngineItem[], method: string): number {
  const db = getDb();
  const now = Date.now();
  const weights = loadRankWeights();
  let inserted = 0;
  const existing = db.select().from(articles).all();
  const byTitle = new Map(existing.map((row) => [sameStoryKey(row.title), row.duplicateGroupId ?? sameStoryKey(row.title)]));

  for (const item of items) {
    const seen = db
      .select()
      .from(articles)
      .where(eq(articles.canonicalUrl, item.canonicalUrl))
      .get();
    if (seen) {
      db.update(articles)
        .set({ lastSeen: now })
        .where(eq(articles.id, seen.id))
        .run();
      continue;
    }
    const group = byTitle.get(sameStoryKey(item.title)) ?? sameStoryKey(item.title);
    byTitle.set(sameStoryKey(item.title), group);
    const extracted = extractEntities(item.title, item.excerpt);
    const result = db
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
        imageUrl: source.allowImage ? item.imageUrl : null,
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
      .run();
    if (!result.changes) continue;
    inserted += 1;
    const row = db
      .select()
      .from(articles)
      .where(eq(articles.canonicalUrl, item.canonicalUrl))
      .get();
    if (!row) continue;
    for (const entity of extracted.entities) {
      db.insert(articleEntities)
        .values({
          articleId: row.id,
          kind: entity.kind,
          name: entity.name,
          slug: entity.slug,
          make: entity.make ?? null,
          model: entity.model ?? null,
          confidence: Math.round(entity.confidence * 100),
        })
        .run();
    }
    for (const category of extracted.categories) {
      db.insert(articleCategories)
        .values({ articleId: row.id, category })
        .run();
    }
    for (const interest of extracted.interests) {
      db.insert(articleInterests)
        .values({ articleId: row.id, interest })
        .run();
    }
    for (const location of extracted.locations) {
      db.insert(articleLocations)
        .values({ articleId: row.id, location })
        .run();
    }
    if (row.imageUrl) {
      db.insert(articleImages)
        .values({
          articleId: row.id,
          url: row.imageUrl,
          source: source.publication,
          alt: row.title,
        })
        .run();
    }
  }
  return inserted;
}

export async function reprocessArticles(): Promise<number> {
  const db = getDb();
  const rows = db.select().from(articles).all();
  let count = 0;
  for (const row of rows) {
    db.delete(articleEntities).where(eq(articleEntities.articleId, row.id)).run();
    db.delete(articleCategories).where(eq(articleCategories.articleId, row.id)).run();
    db.delete(articleInterests).where(eq(articleInterests.articleId, row.id)).run();
    db.delete(articleLocations).where(eq(articleLocations.articleId, row.id)).run();
    const extracted = extractEntities(row.title, row.excerpt);
    for (const entity of extracted.entities) {
      db.insert(articleEntities)
        .values({
          articleId: row.id,
          kind: entity.kind,
          name: entity.name,
          slug: entity.slug,
          make: entity.make ?? null,
          model: entity.model ?? null,
          confidence: Math.round(entity.confidence * 100),
        })
        .run();
    }
    for (const category of extracted.categories) {
      db.insert(articleCategories).values({ articleId: row.id, category }).run();
    }
    for (const interest of extracted.interests) {
      db.insert(articleInterests).values({ articleId: row.id, interest }).run();
    }
    db.update(articles)
      .set({ processed: true, lastProcessed: Date.now() })
      .where(eq(articles.id, row.id))
      .run();
    count += 1;
  }
  return count;
}
