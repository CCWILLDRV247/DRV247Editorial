import { isMerchUrl } from "../merch";
import { isNonEditorialUrl } from "../non-editorial";

export function parseSitemapXml(xml: string): string[] {
  const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) =>
    match[1].trim(),
  );
  return [...new Set(locs)];
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

export function looksLikeArticleUrl(url: string, siteOrigin: string): boolean {
  try {
    const parsed = new URL(url);
    const site = new URL(siteOrigin);
    if (parsed.hostname.replace(/^www\./, "") !== site.hostname.replace(/^www\./, "")) {
      return false;
    }
    const path = parsed.pathname.toLowerCase();
    if (path === "/" || path.endsWith(".xml") || path.endsWith(".jpg") || path.endsWith(".png")) {
      return false;
    }
    if (/(login|account|privacy|cookie|contact|newsletter)/.test(path)) return false;
    if (isMerchUrl(url)) return false;
    if (isNonEditorialUrl(url, siteOrigin)) return false;
    const depth = path.split("/").filter(Boolean).length;
    return depth >= 1;
  } catch {
    return false;
  }
}
