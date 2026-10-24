import { HOMEPAGE_FOR_YOU_DISCOVER_MAX } from "@/lib/engine/homepage-hierarchy";
import type { StoryDto } from "@/lib/stories";
import { getCachedTrendingSnapshot } from "./aggregates";
import { communitySectionCopy, type TrendingSnapshot } from "./trending";

export type CommunityDiscovery = {
  mode: "trending" | "discover";
  heading: string;
  dek: string;
  stories: StoryDto[];
  snapshot: TrendingSnapshot;
};

export async function resolveCommunityDiscovery(
  discover: { heading?: string; dek?: string; stories: StoryDto[] },
  hydrate: (ids: readonly number[]) => Promise<StoryDto[]>,
): Promise<CommunityDiscovery> {
  let snapshot: TrendingSnapshot;
  try {
    snapshot = await getCachedTrendingSnapshot();
  } catch {
    snapshot = {
      mode: "discover",
      windowDays: 7,
      formula: "",
      floors: { uniqueVisitors: 8, positiveEvents: 12, distinctScoredArticles: 3, articleUniqueVisitors: 5 },
      observed: { uniqueVisitors: 0, positiveEvents: 0, distinctScoredArticles: 0 },
      articles: [],
      reason: "aggregate unavailable",
    };
  }

  if (snapshot.mode !== "trending") {
    const copy = communitySectionCopy("discover");
    return {
      mode: "discover",
      heading: discover.heading || copy.heading,
      dek: discover.dek || copy.dek,
      stories: discover.stories.slice(0, HOMEPAGE_FOR_YOU_DISCOVER_MAX),
      snapshot,
    };
  }

  const trendingStories = (await hydrate(snapshot.articles.map((item) => item.articleId))).slice(
    0,
    HOMEPAGE_FOR_YOU_DISCOVER_MAX,
  );
  if (trendingStories.length === 0) {
    const copy = communitySectionCopy("discover");
    return {
      mode: "discover",
      heading: copy.heading,
      dek: copy.dek,
      stories: discover.stories.slice(0, HOMEPAGE_FOR_YOU_DISCOVER_MAX),
      snapshot: { ...snapshot, mode: "discover", reason: "trending ids were not magazine-eligible" },
    };
  }

  const copy = communitySectionCopy("trending");
  return {
    mode: "trending",
    heading: copy.heading,
    dek: copy.dek,
    stories: trendingStories,
    snapshot,
  };
}
