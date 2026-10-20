import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db";
import { articles, mediaSources } from "@/lib/db/schema";
import { PRIMARY_NAV } from "@/config/magazine-nav";
import { liveDeskByArticle } from "@/lib/engine/desk";
import { evaluateEditorialEligibility } from "@/lib/engine/editorial-eligibility";
import { loadDeskPickRows } from "@/lib/engine/queries";
import { EDITORIAL_SITE_URL, SITEMAP_CACHE_TAG } from "./site";

export type IndexableStoryRow = {
  id: number;
  sourceId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  excerpt: string;
  publishedAt: number;
  lastProcessed: number | null;
};

export type MediaSourceRow = Pick<
  typeof mediaSources.$inferSelect,
  "id" | "enabled" | "url"
>;

type StaticSitemapPath = {
  path: string;
  priority: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
};

/** Static indexable routes (home + PRIMARY_NAV categories + same-host pages such as /policy). */
export function staticSitemapPaths(): StaticSitemapPath[] {
  const paths: StaticSitemapPath[] = [{ path: "/", priority: 1 }];
  for (const item of PRIMARY_NAV) {
    if (item.slug === "for-you") continue;
    paths.push({ path: item.href, priority: 0.8 });
  }
  paths.push({ path: "/policy", priority: 0.3, changeFrequency: "monthly" });
  return paths;
}

export function isIndexableStory(
  row: IndexableStoryRow,
  source: MediaSourceRow | undefined,
  deskPick: boolean,
): boolean {
  if (!source?.enabled) return false;
  return evaluateEditorialEligibility({
    url: row.url,
    canonicalUrl: row.canonicalUrl,
    title: row.title,
    excerpt: row.excerpt,
    sourceId: row.sourceId,
    sourceUrl: source.url,
    deskPick,
  }).editorialEligible;
}

export function storyLastModified(row: Pick<IndexableStoryRow, "publishedAt" | "lastProcessed">): Date {
  const ms = row.lastProcessed ?? row.publishedAt;
  return new Date(ms);
}

export function buildSitemapEntries(
  stories: IndexableStoryRow[],
  sourceById: Map<string, MediaSourceRow>,
  deskArticleIds: Set<number>,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = staticSitemapPaths().map(
    ({ path, priority, changeFrequency }) => ({
      url: `${EDITORIAL_SITE_URL}${path === "/" ? "" : path}`,
      lastModified: new Date(),
      changeFrequency: changeFrequency ?? (path === "/" ? ("hourly" as const) : ("daily" as const)),
      priority,
    }),
  );

  for (const row of stories) {
    if (!isIndexableStory(row, sourceById.get(row.sourceId), deskArticleIds.has(row.id))) {
      continue;
    }
    entries.push({
      url: `${EDITORIAL_SITE_URL}/story/${row.id}`,
      lastModified: storyLastModified(row),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}

async function loadSitemapEntriesFresh(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [storyRows, sourceRows, deskRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        sourceId: articles.sourceId,
        url: articles.url,
        canonicalUrl: articles.canonicalUrl,
        title: articles.title,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        lastProcessed: articles.lastProcessed,
      })
      .from(articles),
    db.select({ id: mediaSources.id, enabled: mediaSources.enabled, url: mediaSources.url }).from(mediaSources),
    loadDeskPickRows(),
  ]);

  const sourceById = new Map(sourceRows.map((source) => [source.id, source]));
  const deskArticleIds = new Set(liveDeskByArticle(deskRows).keys());
  return buildSitemapEntries(storyRows, sourceById, deskArticleIds);
}

const getCachedSitemapEntries = unstable_cache(loadSitemapEntriesFresh, ["editorial-sitemap-v2"], {
  revalidate: 3600,
  tags: [SITEMAP_CACHE_TAG],
});

export async function getEditorialSitemap(): Promise<MetadataRoute.Sitemap> {
  return getCachedSitemapEntries();
}

/** Count story URLs in a built sitemap (for ops / tests). */
export function countStoryUrlsInSitemap(entries: MetadataRoute.Sitemap): number {
  return entries.filter((entry) => /\/story\/\d+$/.test(entry.url)).length;
}
