import { normalizeSavedArticleIds } from "./saved";

export const ARTICLE_RELEVANCE_STORAGE_KEY = "drv247-article-relevance";
export const ARTICLE_RELEVANCE_MAX = 50;

export type ArticleRelevancePolarity = "interested" | "less";

export type ArticleRelevanceState = {
  interested: number[];
  less: number[];
};

export const EMPTY_ARTICLE_RELEVANCE: ArticleRelevanceState = {
  interested: [],
  less: [],
};

function capIds(ids: readonly number[]): number[] {
  return normalizeSavedArticleIds(ids).slice(0, ARTICLE_RELEVANCE_MAX);
}

export function emptyArticleRelevance(): ArticleRelevanceState {
  return { interested: [], less: [] };
}

export function parseArticleRelevance(raw: string | null | undefined): ArticleRelevanceState {
  if (!raw?.trim()) return emptyArticleRelevance();
  try {
    const parsed = JSON.parse(raw) as Partial<ArticleRelevanceState>;
    return {
      interested: capIds(Array.isArray(parsed.interested) ? parsed.interested : []),
      less: capIds(Array.isArray(parsed.less) ? parsed.less : []),
    };
  } catch {
    return emptyArticleRelevance();
  }
}

export function serializeArticleRelevance(state: ArticleRelevanceState): string {
  return JSON.stringify({
    interested: capIds(state.interested),
    less: capIds(state.less),
  });
}

export function articleRelevancePolarity(
  state: ArticleRelevanceState,
  articleId: number,
): ArticleRelevancePolarity | null {
  if (state.interested.includes(articleId)) return "interested";
  if (state.less.includes(articleId)) return "less";
  return null;
}

/** Toggle a mark. The two poles are mutually exclusive. Toggling the active pole clears it. */
export function toggleArticleRelevance(
  state: ArticleRelevanceState,
  articleId: number,
  polarity: ArticleRelevancePolarity,
): { state: ArticleRelevanceState; polarity: ArticleRelevancePolarity | null } {
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return { state: parseArticleRelevance(serializeArticleRelevance(state)), polarity: null };
  }
  const current = articleRelevancePolarity(state, articleId);
  const interested = state.interested.filter((id) => id !== articleId);
  const less = state.less.filter((id) => id !== articleId);
  if (current === polarity) {
    return { state: { interested: capIds(interested), less: capIds(less) }, polarity: null };
  }
  if (polarity === "interested") {
    return {
      state: { interested: capIds([articleId, ...interested]), less: capIds(less) },
      polarity: "interested",
    };
  }
  return {
    state: { interested: capIds(interested), less: capIds([articleId, ...less]) },
    polarity: "less",
  };
}

export function readArticleRelevance(): ArticleRelevanceState {
  if (typeof window === "undefined") return emptyArticleRelevance();
  return parseArticleRelevance(window.localStorage.getItem(ARTICLE_RELEVANCE_STORAGE_KEY));
}

export function writeArticleRelevance(state: ArticleRelevanceState): ArticleRelevanceState {
  const next = parseArticleRelevance(serializeArticleRelevance(state));
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(ARTICLE_RELEVANCE_STORAGE_KEY, serializeArticleRelevance(next));
  return next;
}

export function toggleArticleRelevanceInStorage(
  articleId: number,
  polarity: ArticleRelevancePolarity,
): { state: ArticleRelevanceState; polarity: ArticleRelevancePolarity | null } {
  const result = toggleArticleRelevance(readArticleRelevance(), articleId, polarity);
  writeArticleRelevance(result.state);
  return result;
}
