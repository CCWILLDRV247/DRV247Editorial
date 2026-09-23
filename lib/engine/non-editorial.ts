import {
  NON_ARTICLE_EXACT_PATHS,
  NON_EDITORIAL_HOSTS,
  NON_EDITORIAL_PATH_SEGMENTS,
  UNUSABLE_PATH_SEGMENTS,
} from "../../config/non-editorial";

const PATH_SEGMENTS = new Set<string>(NON_EDITORIAL_PATH_SEGMENTS);
const UNUSABLE_SEGMENTS = new Set<string>(UNUSABLE_PATH_SEGMENTS);
const EXACT_PATHS = new Set<string>(NON_ARTICLE_EXACT_PATHS);
const SHOP_HOSTS = new Set<string>(NON_EDITORIAL_HOSTS.map((host) => host.replace(/^www\./, "")));

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.toLowerCase().split("/").filter(Boolean);
  } catch {
    return [];
  }
}

export function isUnusableArticleUrl(url: string): boolean {
  const raw = url?.trim() ?? "";
  if (!raw || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") return true;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
    if (!parsed.hostname) return true;
    const exact = parsed.pathname.replace(/\/+$/, "") || "/";
    if (EXACT_PATHS.has(exact)) {
      // WordPress shortlinks are /?p=123, not the site homepage.
      if (exact === "/" && parsed.searchParams.get("p")) return false;
      return true;
    }
    if (exact.endsWith(".rss")) return true;
    return pathSegments(raw).some((segment) => UNUSABLE_SEGMENTS.has(segment));
  } catch {
    return true;
  }
}

export function isNonEditorialPathUrl(url: string): boolean {
  return pathSegments(url).some((segment) => {
    if (PATH_SEGMENTS.has(segment)) return true;
    if (segment === "a-to-z" || segment.endsWith("-a-to-z")) return true;
    return segment.startsWith("subscribe-") || segment.startsWith("subscribe_");
  });
}

export function isNonEditorialHost(url: string): boolean {
  const host = hostnameOf(url);
  return Boolean(host && SHOP_HOSTS.has(host));
}

/** Magazine shop storefronts (`shop.kelsey.co.uk`), not a single-title ban. */
export function isShopHost(url: string): boolean {
  const host = hostnameOf(url);
  return Boolean(host && (host.startsWith("shop.") || host === "shop"));
}

/** Section index `/category/news` — `/category/news/a-story` stays. */
export function isCategoryIndexUrl(url: string): boolean {
  const segments = pathSegments(url);
  return segments[0] === "category" && segments.length === 2;
}

/** Photo-index leaf (`/f1/galleries`). `/gallery/a-story` stays. */
export function isGalleryIndexUrl(url: string): boolean {
  const segments = pathSegments(url);
  return segments[segments.length - 1] === "galleries";
}

export function isOffSiteUrl(url: string, sourceUrl: string): boolean {
  const articleHost = hostnameOf(url);
  const sourceHost = hostnameOf(sourceUrl);
  if (!articleHost || !sourceHost) return true;
  return articleHost !== sourceHost;
}

export function isNonEditorialUrl(url: string, sourceUrl?: string): boolean {
  if (isUnusableArticleUrl(url)) return true;
  if (isNonEditorialPathUrl(url)) return true;
  if (isCategoryIndexUrl(url) || isGalleryIndexUrl(url)) return true;
  if (isShopHost(url)) return true;
  if (isNonEditorialHost(url)) return true;
  if (sourceUrl && isOffSiteUrl(url, sourceUrl)) return true;
  return false;
}

export function isNonEditorialArticle(
  row: { url: string; canonicalUrl: string },
  sourceUrl?: string,
): boolean {
  return isNonEditorialUrl(row.canonicalUrl, sourceUrl) || isNonEditorialUrl(row.url, sourceUrl);
}
