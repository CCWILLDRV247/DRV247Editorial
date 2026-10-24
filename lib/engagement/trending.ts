export const TRENDING_WINDOW_DAYS = 7;
export const TRENDING_WINDOW_MS = TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const TRENDING_WEIGHTS = {
  interested: 3,
  save: 2,
  share: 2,
  outbound: 1,
  less_like_this: -2,
} as const;

export const TRENDING_FLOORS = {
  uniqueVisitors: 8,
  positiveEvents: 12,
  distinctScoredArticles: 3,
  articleUniqueVisitors: 5,
} as const;

export const TRENDING_EVENT_NAMES = [
  "interested",
  "save",
  "share",
  "outbound",
  "less_like_this",
] as const;

export type TrendingEventName = (typeof TRENDING_EVENT_NAMES)[number];

export type TrendingEventRow = {
  event: string;
  articleId: number | null;
  visitorKey: string;
};

export type ArticleTrendingScore = {
  articleId: number;
  score: number;
  uniqueVisitors: number;
  interested: number;
  save: number;
  share: number;
  outbound: number;
  lessLikeThis: number;
};

export type TrendingSnapshot = {
  mode: "trending" | "discover";
  windowDays: number;
  formula: string;
  floors: typeof TRENDING_FLOORS;
  observed: {
    uniqueVisitors: number;
    positiveEvents: number;
    distinctScoredArticles: number;
  };
  articles: ArticleTrendingScore[];
  reason: string;
};

export const TRENDING_FORMULA =
  "interested×3 + save×2 + share×2 + outbound×1 − less_like_this×2";

const POSITIVE_EVENTS = new Set(["interested", "save", "share", "outbound"]);

export function trendingWindowStart(now = Date.now()): number {
  return now - TRENDING_WINDOW_MS;
}

export function isTrendingScoreEvent(event: string): event is TrendingEventName {
  return (TRENDING_EVENT_NAMES as readonly string[]).includes(event);
}

export function scoreTrendingArticles(rows: readonly TrendingEventRow[]): ArticleTrendingScore[] {
  const byArticle = new Map<
    number,
    {
      visitors: Set<string>;
      interested: number;
      save: number;
      share: number;
      outbound: number;
      lessLikeThis: number;
    }
  >();

  for (const row of rows) {
    if (!row.articleId || !isTrendingScoreEvent(row.event)) continue;
    const bucket = byArticle.get(row.articleId) ?? {
      visitors: new Set<string>(),
      interested: 0,
      save: 0,
      share: 0,
      outbound: 0,
      lessLikeThis: 0,
    };
    bucket.visitors.add(row.visitorKey);
    if (row.event === "interested") bucket.interested += 1;
    if (row.event === "save") bucket.save += 1;
    if (row.event === "share") bucket.share += 1;
    if (row.event === "outbound") bucket.outbound += 1;
    if (row.event === "less_like_this") bucket.lessLikeThis += 1;
    byArticle.set(row.articleId, bucket);
  }

  return [...byArticle.entries()]
    .map(([articleId, bucket]) => {
      const score =
        bucket.interested * TRENDING_WEIGHTS.interested +
        bucket.save * TRENDING_WEIGHTS.save +
        bucket.share * TRENDING_WEIGHTS.share +
        bucket.outbound * TRENDING_WEIGHTS.outbound +
        bucket.lessLikeThis * TRENDING_WEIGHTS.less_like_this;
      return {
        articleId,
        score,
        uniqueVisitors: bucket.visitors.size,
        interested: bucket.interested,
        save: bucket.save,
        share: bucket.share,
        outbound: bucket.outbound,
        lessLikeThis: bucket.lessLikeThis,
      };
    })
    .sort((left, right) => right.score - left.score || right.uniqueVisitors - left.uniqueVisitors);
}

export function evaluateTrendingGate(
  rows: readonly TrendingEventRow[],
  now = Date.now(),
): TrendingSnapshot {
  const scored = scoreTrendingArticles(rows);
  const uniqueVisitors = new Set(rows.map((row) => row.visitorKey).filter(Boolean)).size;
  const positiveEvents = rows.filter((row) => POSITIVE_EVENTS.has(row.event)).length;
  const qualified = scored.filter(
    (article) => article.score > 0 && article.uniqueVisitors >= TRENDING_FLOORS.articleUniqueVisitors,
  );
  const observed = {
    uniqueVisitors,
    positiveEvents,
    distinctScoredArticles: qualified.length,
  };

  const failed: string[] = [];
  if (observed.uniqueVisitors < TRENDING_FLOORS.uniqueVisitors) {
    failed.push(
      `unique visitors ${observed.uniqueVisitors} < ${TRENDING_FLOORS.uniqueVisitors}`,
    );
  }
  if (observed.positiveEvents < TRENDING_FLOORS.positiveEvents) {
    failed.push(`positive events ${observed.positiveEvents} < ${TRENDING_FLOORS.positiveEvents}`);
  }
  if (observed.distinctScoredArticles < TRENDING_FLOORS.distinctScoredArticles) {
    failed.push(
      `scored articles ${observed.distinctScoredArticles} < ${TRENDING_FLOORS.distinctScoredArticles}`,
    );
  }

  if (failed.length) {
    return {
      mode: "discover",
      windowDays: TRENDING_WINDOW_DAYS,
      formula: TRENDING_FORMULA,
      floors: TRENDING_FLOORS,
      observed,
      articles: [],
      reason: `thin data: ${failed.join("; ")}`,
    };
  }

  return {
    mode: "trending",
    windowDays: TRENDING_WINDOW_DAYS,
    formula: TRENDING_FORMULA,
    floors: TRENDING_FLOORS,
    observed,
    articles: qualified,
    reason: `open at ${now}`,
  };
}

export const DISCOVER_HEADING = "Discover";
export const DISCOVER_DEK = "The rest of the car world";
export const TRENDING_HEADING = "Trending with enthusiasts";
export const TRENDING_DEK =
  "Ranked from interested marks, saves, and shares over the last week — only once enough readers have taken part.";

export function communitySectionCopy(mode: "trending" | "discover"): { heading: string; dek: string } {
  if (mode === "trending") {
    return { heading: TRENDING_HEADING, dek: TRENDING_DEK };
  }
  return { heading: DISCOVER_HEADING, dek: DISCOVER_DEK };
}

export function copyClaimsTrending(text: string): boolean {
  return /\b(trending|enthusiasts|popular with)\b/i.test(text);
}
