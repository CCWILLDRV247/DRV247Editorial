export const SAVED_ARTICLES_STORAGE_KEY = "drv247-saved-articles";
export const SAVED_ARTICLES_MAX = 50;

export function parseSavedArticleIds(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return normalizeSavedArticleIds(parsed);
  } catch {
    // Comma-separated fallback if a hand edit or older payload is not JSON.
  }
  return normalizeSavedArticleIds(raw.split(","));
}

export function serializeSavedArticleIds(ids: readonly number[]): string {
  return JSON.stringify(normalizeSavedArticleIds(ids));
}

export function normalizeSavedArticleIds(values: readonly unknown[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of values) {
    const id = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= SAVED_ARTICLES_MAX) break;
  }
  return out;
}

export function isArticleSaved(ids: readonly number[], articleId: number): boolean {
  return ids.includes(articleId);
}

/** Most recently saved first. Toggling an existing id removes it. */
export function toggleSavedArticleId(
  ids: readonly number[],
  articleId: number,
): { ids: number[]; saved: boolean } {
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return { ids: normalizeSavedArticleIds(ids), saved: false };
  }
  if (ids.includes(articleId)) {
    return { ids: ids.filter((id) => id !== articleId), saved: false };
  }
  return { ids: normalizeSavedArticleIds([articleId, ...ids]), saved: true };
}

export function readSavedArticleIds(): number[] {
  if (typeof window === "undefined") return [];
  return parseSavedArticleIds(window.localStorage.getItem(SAVED_ARTICLES_STORAGE_KEY));
}

export function writeSavedArticleIds(ids: readonly number[]): number[] {
  const next = normalizeSavedArticleIds(ids);
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(SAVED_ARTICLES_STORAGE_KEY, serializeSavedArticleIds(next));
  return next;
}

export function toggleSavedArticleInStorage(articleId: number): { ids: number[]; saved: boolean } {
  const result = toggleSavedArticleId(readSavedArticleIds(), articleId);
  writeSavedArticleIds(result.ids);
  return result;
}
