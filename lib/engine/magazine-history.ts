import { withTestQuery } from "./for-you-test";

export const MAGAZINE_HISTORY_KEY = "drv247-magazine-history";

/**
 * Stamp a magazine href with the active garage query.
 * If the href already has a query string, leave it (caller already resolved it).
 */
export function magazineHref(href: string, query?: string) {
  if (!query || href.includes("?")) return href;
  return withTestQuery(href, query);
}

export function isMagazinePath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/category/") || pathname.startsWith("/story/");
}

export function magazineLocation(pathname: string, search = "") {
  const query = !search || search.startsWith("?") ? search : `?${search}`;
  return `${pathname}${query}`;
}

/** Append this visit unless it is a refresh of the current entry. */
export function recordMagazineVisit(stack: string[], href: string) {
  if (!href) return stack;
  if (stack[stack.length - 1] === href) return stack;
  return [...stack.slice(-19), href];
}

/**
 * Previous magazine URL in this tab, if we arrived from For You / a category / a story.
 * Does not use document.referrer — many phones send none.
 */
export function previousMagazineHref(stack: string[], currentHref: string) {
  if (stack.length === 0) return undefined;
  const last = stack[stack.length - 1];
  if (last === currentHref) return stack[stack.length - 2];
  return last;
}

export function popMagazineVisit(stack: string[], currentHref: string) {
  if (stack[stack.length - 1] === currentHref) return stack.slice(0, -1);
  return stack;
}

export function shouldPopMagazineHistory(previous: string | undefined) {
  return Boolean(previous);
}

export function readMagazineHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function writeMagazineHistory(stack: string[]) {
  return JSON.stringify(stack);
}
