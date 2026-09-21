/** Cross-profile interlude rotation — lightweight ID history (cookie + localStorage). */
export const INTERLUDE_RECENT_STORAGE_KEY = "drv247-interlude-recent";
export const INTERLUDE_RECENT_COOKIE = "drv247-interlude-recent";
export const INTERLUDE_RECENT_MAX = 8;

export function parseInterludeRecentIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .slice(0, INTERLUDE_RECENT_MAX);
  } catch {
    return raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, INTERLUDE_RECENT_MAX);
  }
}

/** Most recent first. New picks prepend; duplicates move to front. */
export function mergeInterludeRecent(existing: readonly string[], selectedIds: readonly string[]): string[] {
  const fresh = selectedIds.filter(Boolean);
  const tail = existing.filter((id) => !fresh.includes(id));
  return [...fresh, ...tail].slice(0, INTERLUDE_RECENT_MAX);
}

/** Strongest penalty for index 0 (most recent), tapering for older history. */
export function recentUsePenaltyWeight(index: number, total: number) {
  if (index < 0) return 0;
  const age = index + Math.max(0, total - index - 1) * 0.35;
  return 1 / (1 + age);
}
