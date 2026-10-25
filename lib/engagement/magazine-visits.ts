/** Persisted count of distinct browser sessions on the magazine (increment once per session). */
export const MAGAZINE_VISIT_COUNT_STORAGE_KEY = "drv247-magazine-visit-count";

/** Marks the current tab session so we do not double-count reloads in the same session. */
export const MAGAZINE_VISIT_SESSION_STORAGE_KEY = "drv247-magazine-visit-session";

/** Experience feedback opens from the third session onward (visits 1–2 are silent). */
export const EXPERIENCE_FEEDBACK_MIN_VISITS = 3;

export function parseMagazineVisitCount(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function isExperienceFeedbackVisitEligible(
  visitCount: number,
  minVisits = EXPERIENCE_FEEDBACK_MIN_VISITS,
): boolean {
  return visitCount >= minVisits;
}

/** Pure increment used by tests and by {@link recordMagazineSessionVisit}. */
export function nextMagazineVisitCount(current: number, sessionAlreadyCounted: boolean): number {
  if (sessionAlreadyCounted) return current;
  return current + 1;
}

export function recordMagazineSessionVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const sessionCounted = Boolean(window.sessionStorage.getItem(MAGAZINE_VISIT_SESSION_STORAGE_KEY));
    const current = parseMagazineVisitCount(
      window.localStorage.getItem(MAGAZINE_VISIT_COUNT_STORAGE_KEY),
    );
    const next = nextMagazineVisitCount(current, sessionCounted);
    if (!sessionCounted) {
      window.localStorage.setItem(MAGAZINE_VISIT_COUNT_STORAGE_KEY, String(next));
      window.sessionStorage.setItem(MAGAZINE_VISIT_SESSION_STORAGE_KEY, "1");
    }
    return next;
  } catch {
    return 0;
  }
}
