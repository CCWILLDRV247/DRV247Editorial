/** Persisted distinct magazine sessions (JSON string[] of tab session ids). */
export const MAGAZINE_VISIT_SESSIONS_STORAGE_KEY = "drv247-magazine-visit-sessions";

/** Legacy integer mirror of session count — kept in sync for DevTools inspection. */
export const MAGAZINE_VISIT_COUNT_STORAGE_KEY = "drv247-magazine-visit-count";

/** Unique id for this tab's browsing session (survives reloads, not duplicated-tab copies). */
export const MAGAZINE_VISIT_SESSION_STORAGE_KEY = "drv247-magazine-visit-session";

/** Experience feedback opens from the third session onward (visits 1–2 are silent). */
export const EXPERIENCE_FEEDBACK_MIN_VISITS = 3;

const MAX_SESSION_MERGE_ATTEMPTS = 8;

export function parseMagazineVisitCount(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function parseMagazineSessionIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

/** Register a tab session id in a persisted list (pure, for tests). */
export function mergeMagazineSessionId(sessions: readonly string[], tabSessionId: string): string[] {
  if (!tabSessionId || sessions.includes(tabSessionId)) return [...sessions];
  return [...sessions, tabSessionId];
}

export function magazineVisitCountFromStorage(input: {
  sessionsRaw: string | null | undefined;
  legacyCountRaw?: string | null | undefined;
}): number {
  const sessions = parseMagazineSessionIds(input.sessionsRaw);
  if (sessions.length > 0) return sessions.length;
  return parseMagazineVisitCount(input.legacyCountRaw);
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

function createTabSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readPersistedSessions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseMagazineSessionIds(
      window.localStorage.getItem(MAGAZINE_VISIT_SESSIONS_STORAGE_KEY),
    );
  } catch {
    return [];
  }
}

/** Current visit count from localStorage (browser only). */
export function getMagazineVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return magazineVisitCountFromStorage({
      sessionsRaw: window.localStorage.getItem(MAGAZINE_VISIT_SESSIONS_STORAGE_KEY),
      legacyCountRaw: window.localStorage.getItem(MAGAZINE_VISIT_COUNT_STORAGE_KEY),
    });
  } catch {
    return 0;
  }
}

function persistSessions(sessions: string[]): void {
  window.localStorage.setItem(MAGAZINE_VISIT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  window.localStorage.setItem(MAGAZINE_VISIT_COUNT_STORAGE_KEY, String(sessions.length));
}

function ensureTabSessionId(): string {
  let tabSessionId = window.sessionStorage.getItem(MAGAZINE_VISIT_SESSION_STORAGE_KEY);
  if (!tabSessionId) {
    tabSessionId = createTabSessionId();
    window.sessionStorage.setItem(MAGAZINE_VISIT_SESSION_STORAGE_KEY, tabSessionId);
  }
  return tabSessionId;
}

/**
 * Count one magazine session per tab (reload-safe). Retries merges so parallel new tabs
 * do not clobber each other's increments.
 */
export function recordMagazineSessionVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const tabSessionId = ensureTabSessionId();
    for (let attempt = 0; attempt < MAX_SESSION_MERGE_ATTEMPTS; attempt += 1) {
      const sessions = readPersistedSessions();
      if (sessions.includes(tabSessionId)) {
        return sessions.length || getMagazineVisitCount();
      }
      const next = mergeMagazineSessionId(sessions, tabSessionId);
      persistSessions(next);
      const verify = readPersistedSessions();
      if (verify.includes(tabSessionId)) return verify.length;
    }
    return getMagazineVisitCount();
  } catch {
    return 0;
  }
}
