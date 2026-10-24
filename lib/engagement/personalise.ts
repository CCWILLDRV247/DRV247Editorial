import { normalizeSavedArticleIds } from "./saved";

/** Client + server rank overlay. Does not infer a garage from reads. */
export type ReaderSignals = {
  interestedIds: number[];
  lessLikeIds: number[];
  savedIds: number[];
  recentIds: number[];
};

export type ReaderSignalArticle = {
  id: number;
  makes: string[];
  interests: string[];
  rankScore: number;
  vehicleTier?: string;
};

export type ReaderSignalAdjustment = {
  id: number;
  delta: number;
  rankScore: number;
  vehicleTier: string;
  reasons: string[];
  kinds: string[];
};

export const READER_SIGNAL_WEIGHTS = {
  interestedDirect: 48,
  lessDirect: -56,
  savedDirect: 18,
  recentDirect: 6,
  interestedSimilar: 14,
  lessSimilar: -20,
  savedSimilar: 8,
} as const;

export function emptyReaderSignals(): ReaderSignals {
  return { interestedIds: [], lessLikeIds: [], savedIds: [], recentIds: [] };
}

export function normalizeReaderSignals(input?: Partial<ReaderSignals> | null): ReaderSignals {
  return {
    interestedIds: normalizeSavedArticleIds(input?.interestedIds ?? []),
    lessLikeIds: normalizeSavedArticleIds(input?.lessLikeIds ?? []),
    savedIds: normalizeSavedArticleIds(input?.savedIds ?? []),
    recentIds: normalizeSavedArticleIds(input?.recentIds ?? []),
  };
}

export function readerSignalsAreActive(signals: ReaderSignals): boolean {
  return Boolean(
    signals.interestedIds.length ||
      signals.lessLikeIds.length ||
      signals.savedIds.length ||
      signals.recentIds.length,
  );
}

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function sharesToken(article: ReaderSignalArticle, pool: ReadonlySet<string>): boolean {
  if (!pool.size) return false;
  return article.makes.some((make) => pool.has(norm(make))) ||
    article.interests.some((interest) => pool.has(norm(interest)));
}

function tokenPool(articles: readonly ReaderSignalArticle[], ids: readonly number[]): Set<string> {
  const want = new Set(ids);
  const pool = new Set<string>();
  for (const article of articles) {
    if (!want.has(article.id)) continue;
    for (const make of article.makes) {
      const token = norm(make);
      if (token) pool.add(token);
    }
    for (const interest of article.interests) {
      const token = norm(interest);
      if (token) pool.add(token);
    }
  }
  return pool;
}

/**
 * Overlay explicit marks / saves / same-article recency on an already-ranked list.
 * Never changes vehicleTier. Recent ids never contribute similar-make boosts.
 */
export function applyReaderSignals<T extends ReaderSignalArticle>(
  articles: readonly T[],
  rawSignals?: Partial<ReaderSignals> | null,
  weights = READER_SIGNAL_WEIGHTS,
): { articles: T[]; adjustments: ReaderSignalAdjustment[] } {
  const signals = normalizeReaderSignals(rawSignals);
  if (!readerSignalsAreActive(signals) || articles.length === 0) {
    return {
      articles: [...articles],
      adjustments: articles.map((article) => ({
        id: article.id,
        delta: 0,
        rankScore: article.rankScore,
        vehicleTier: article.vehicleTier ?? "none",
        reasons: [],
        kinds: [],
      })),
    };
  }

  const interested = new Set(signals.interestedIds);
  const less = new Set(signals.lessLikeIds);
  const saved = new Set(signals.savedIds);
  const recent = new Set(signals.recentIds);
  const interestedPool = tokenPool(articles, signals.interestedIds);
  const lessPool = tokenPool(articles, signals.lessLikeIds);
  const savedPool = tokenPool(articles, signals.savedIds);

  const adjustments: ReaderSignalAdjustment[] = articles.map((article) => {
    let delta = 0;
    const reasons: string[] = [];
    const kinds: string[] = [];

    if (interested.has(article.id)) {
      delta += weights.interestedDirect;
      kinds.push("reader.interested");
      reasons.push("You marked this interested");
    } else if (less.has(article.id)) {
      delta += weights.lessDirect;
      kinds.push("reader.less");
      reasons.push("You asked for fewer like this");
    } else {
      if (sharesToken(article, interestedPool)) {
        delta += weights.interestedSimilar;
        kinds.push("reader.interested.similar");
        reasons.push("Similar to stories you marked interested");
      }
      if (sharesToken(article, lessPool)) {
        delta += weights.lessSimilar;
        kinds.push("reader.less.similar");
        reasons.push("Similar to stories you marked less like this");
      }
    }

    if (saved.has(article.id)) {
      delta += weights.savedDirect;
      kinds.push("reader.saved");
      reasons.push("You saved this");
    } else if (!interested.has(article.id) && !less.has(article.id) && sharesToken(article, savedPool)) {
      delta += weights.savedSimilar;
      kinds.push("reader.saved.similar");
      reasons.push("Similar to a story you saved");
    }

    if (recent.has(article.id) && !interested.has(article.id) && !less.has(article.id)) {
      delta += weights.recentDirect;
      kinds.push("reader.recent");
    }

    return {
      id: article.id,
      delta,
      rankScore: article.rankScore + delta,
      vehicleTier: article.vehicleTier ?? "none",
      reasons,
      kinds,
    };
  });

  const byId = new Map(adjustments.map((item) => [item.id, item]));
  const next = articles
    .map((article) => {
      const adjustment = byId.get(article.id);
      if (!adjustment) return article;
      return { ...article, rankScore: adjustment.rankScore };
    })
    .sort((left, right) => right.rankScore - left.rankScore || left.id - right.id);

  return { articles: next, adjustments };
}

export function parseIdListParam(value: string | string[] | null | undefined): number[] {
  if (value == null) return [];
  const parts = Array.isArray(value) ? value.flatMap((item) => item.split(",")) : value.split(",");
  return normalizeSavedArticleIds(parts);
}
