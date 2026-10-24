import { normalizeSavedArticleIds } from "./saved";

export const RECENT_INTERACTIONS_STORAGE_KEY = "drv247-recent-interactions";
export const RECENT_INTERACTIONS_MAX = 30;

export const RECENT_INTERACTION_KINDS = ["open", "share", "outbound", "save"] as const;
export type RecentInteractionKind = (typeof RECENT_INTERACTION_KINDS)[number];

export type RecentInteraction = {
  articleId: number;
  kind: RecentInteractionKind;
  at: number;
};

export function isRecentInteractionKind(value: string): value is RecentInteractionKind {
  return (RECENT_INTERACTION_KINDS as readonly string[]).includes(value);
}

export function parseRecentInteractions(raw: string | null | undefined): RecentInteraction[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: RecentInteraction[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<RecentInteraction>;
      const articleId = Number(row.articleId);
      if (!Number.isInteger(articleId) || articleId <= 0) continue;
      if (!row.kind || !isRecentInteractionKind(row.kind)) continue;
      const at = typeof row.at === "number" && Number.isFinite(row.at) ? row.at : 0;
      const key = `${articleId}:${row.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ articleId, kind: row.kind, at });
      if (out.length >= RECENT_INTERACTIONS_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeRecentInteractions(items: readonly RecentInteraction[]): string {
  return JSON.stringify(parseRecentInteractions(JSON.stringify(items)));
}

/** Most recent first. Same article+kind moves to the front. */
export function recordRecentInteraction(
  items: readonly RecentInteraction[],
  input: RecentInteraction,
): RecentInteraction[] {
  if (!Number.isInteger(input.articleId) || input.articleId <= 0) {
    return parseRecentInteractions(JSON.stringify(items));
  }
  if (!isRecentInteractionKind(input.kind)) {
    return parseRecentInteractions(JSON.stringify(items));
  }
  const next = [
    { articleId: input.articleId, kind: input.kind, at: input.at },
    ...items.filter((item) => !(item.articleId === input.articleId && item.kind === input.kind)),
  ];
  return next.slice(0, RECENT_INTERACTIONS_MAX);
}

/** Ids only — ranking may recency-boost these articles, never their marques. */
export function recentInteractionArticleIds(items: readonly RecentInteraction[]): number[] {
  return normalizeSavedArticleIds(items.map((item) => item.articleId));
}

export function readRecentInteractions(): RecentInteraction[] {
  if (typeof window === "undefined") return [];
  return parseRecentInteractions(window.localStorage.getItem(RECENT_INTERACTIONS_STORAGE_KEY));
}

export function writeRecentInteractions(items: readonly RecentInteraction[]): RecentInteraction[] {
  const next = parseRecentInteractions(JSON.stringify(items));
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(RECENT_INTERACTIONS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function recordRecentInteractionInStorage(input: RecentInteraction): RecentInteraction[] {
  const next = recordRecentInteraction(readRecentInteractions(), input);
  return writeRecentInteractions(next);
}
