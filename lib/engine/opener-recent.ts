/** Cross-week opening-card rotation — same cookie + localStorage pattern as interludes. */

export const OPENER_RECENT_STORAGE_KEY = "drv247-opener-recent";
export const OPENER_RECENT_COOKIE = "drv247-opener-recent";
export const OPENER_RECENT_MAX = 16;

export type OpenerRecentState = {
  weekStart: number;
  ids: number[];
  prevWeekStart: number;
  prevIds: number[];
};

export function weekStartUtc(now = Date.now()): number {
  const date = new Date(now);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset);
}

function uniqueIds(ids: readonly number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= OPENER_RECENT_MAX) break;
  }
  return out;
}

export function emptyOpenerRecent(now = Date.now()): OpenerRecentState {
  return { weekStart: weekStartUtc(now), ids: [], prevWeekStart: 0, prevIds: [] };
}

export function parseOpenerRecent(raw: string | null | undefined, now = Date.now()): OpenerRecentState {
  const fallback = emptyOpenerRecent(now);
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<OpenerRecentState> & { ids?: unknown };
    const ids = Array.isArray(parsed.ids)
      ? uniqueIds(parsed.ids.map((id) => Number(id)))
      : [];
    const prevIds = Array.isArray(parsed.prevIds)
      ? uniqueIds(parsed.prevIds.map((id) => Number(id)))
      : [];
    const storedWeek = typeof parsed.weekStart === "number" ? parsed.weekStart : 0;
    const storedPrevWeek = typeof parsed.prevWeekStart === "number" ? parsed.prevWeekStart : 0;
    return rollOpenerRecent(
      {
        weekStart: storedWeek || fallback.weekStart,
        ids,
        prevWeekStart: storedPrevWeek,
        prevIds,
      },
      now,
    );
  } catch {
    return fallback;
  }
}

/** If the stored week is in the past, shift current ids into last week. */
export function rollOpenerRecent(state: OpenerRecentState, now = Date.now()): OpenerRecentState {
  const current = weekStartUtc(now);
  if (state.weekStart === current) return state;
  if (state.weekStart > 0 && state.weekStart < current) {
    return {
      weekStart: current,
      ids: [],
      prevWeekStart: state.weekStart,
      prevIds: uniqueIds(state.ids),
    };
  }
  return { ...emptyOpenerRecent(now), prevWeekStart: state.prevWeekStart, prevIds: uniqueIds(state.prevIds) };
}

/** New opener ids prepend; duplicates move to front. Rolls the week first. */
export function mergeOpenerRecent(
  existing: OpenerRecentState,
  selectedIds: readonly number[],
  now = Date.now(),
): OpenerRecentState {
  const rolled = rollOpenerRecent(existing, now);
  const fresh = uniqueIds(selectedIds);
  const tail = rolled.ids.filter((id) => !fresh.includes(id));
  return {
    ...rolled,
    ids: uniqueIds([...fresh, ...tail]),
  };
}

export function lastWeekOpenerIds(state: OpenerRecentState): number[] {
  return uniqueIds(state.prevIds);
}

export function serializeOpenerRecent(state: OpenerRecentState): string {
  return JSON.stringify({
    weekStart: state.weekStart,
    ids: uniqueIds(state.ids),
    prevWeekStart: state.prevWeekStart,
    prevIds: uniqueIds(state.prevIds),
  });
}
