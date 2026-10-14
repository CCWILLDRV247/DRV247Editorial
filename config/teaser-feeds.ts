/** Category feeds that store a teaser and link out. No sitemap or scrape fallback. */

export const HICONSUMPTION_MOTORS_SOURCE_ID = "auto_132";

/** WordPress category id for https://hiconsumption.com/category/motors/ */
export const HICONSUMPTION_MOTORS_CATEGORY_ID = 1039;

/**
 * `/category/motors/feed/` is advertised on the archive and then 301s to the HTML
 * category page. `https://hiconsumption.com/feed/` is live RSS but mixes gear,
 * watches, and tech. This query is the Motors category (id 1039) only.
 * `context=embed` omits `content` (the full article).
 */
export const HICONSUMPTION_MOTORS_FEED_URL =
  "https://hiconsumption.com/wp-json/wp/v2/posts?categories=1039&per_page=8&context=embed";

export type TeaserCategoryFeed = {
  sourceId: string;
  feedUrl: string;
  host: string;
  storyPathPrefix: string;
  categoryId: number;
};

export const TEASER_CATEGORY_FEEDS: Record<string, TeaserCategoryFeed> = {
  [HICONSUMPTION_MOTORS_SOURCE_ID]: {
    sourceId: HICONSUMPTION_MOTORS_SOURCE_ID,
    feedUrl: HICONSUMPTION_MOTORS_FEED_URL,
    host: "hiconsumption.com",
    storyPathPrefix: "/motors/",
    categoryId: HICONSUMPTION_MOTORS_CATEGORY_ID,
  },
};

export function teaserCategoryFeed(sourceId: string): TeaserCategoryFeed | null {
  return TEASER_CATEGORY_FEEDS[sourceId] ?? null;
}
