import { withTestQuery } from "./for-you-test";

/**
 * Stamp a magazine href with the active garage query.
 * If the href already has a query string, leave it (caller already resolved it).
 */
export function magazineHref(href: string, query?: string) {
  if (!query || href.includes("?")) return href;
  return withTestQuery(href, query);
}

/** Use history.back() only when the previous document is this magazine origin. */
export function shouldUseHistoryBack(referrer: string, currentOrigin: string) {
  if (!referrer) return false;
  try {
    return new URL(referrer).origin === currentOrigin;
  } catch {
    return false;
  }
}
