import { capSummary, canonicalizeUrl, firstImageFromHtml, stripHtml } from "../../text";
import { resolveImageUrl } from "../magazine";
import { isPathAllowed, parseRobots } from "../robots";
import type { EngineItem } from "./rss";

export function parseHomeLinks(html: string, baseUrl: string): string[] {
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((match) =>
    match[1],
  );
  const urls: string[] = [];
  for (const href of hrefs) {
    try {
      const resolved = new URL(href, baseUrl).toString();
      const canonical = canonicalizeUrl(resolved);
      if (canonical) urls.push(canonical);
    } catch {
      // ignore
    }
  }
  return [...new Set(urls)];
}

export function parseArticleMetadata(html: string, pageUrl: string): EngineItem | null {
  const title =
    meta(html, "og:title") ||
    tag(html, "title") ||
    "";
  const canonical =
    canonicalizeUrl(meta(html, "og:url") || canonicalLink(html) || pageUrl) ??
    canonicalizeUrl(pageUrl);
  if (!title.trim() || !canonical) return null;
  const description = meta(html, "og:description") || meta(html, "description") || "";
  const image = meta(html, "og:image") || firstImageFromHtml(html);
  const published = meta(html, "article:published_time") || meta(html, "date") || "";
  const author = meta(html, "author") || "";
  return {
    title: stripHtml(title),
    url: canonical,
    canonicalUrl: canonical,
    author: author || null,
    excerpt: capSummary(description || title),
    imageUrl: resolveImageUrl(image, canonical || pageUrl),
    publishedAt: published ? Date.parse(published) || Date.now() : Date.now(),
    method: "scrape",
  };
}

export function robotsAllows(robotsText: string, pathname: string): boolean {
  const rules = parseRobots(robotsText, "drv247-editorial");
  return isPathAllowed(pathname, rules);
}

function meta(html: string, name: string): string {
  const property = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  const contentFirst = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
  );
  return property?.[1] || contentFirst?.[1] || "";
}

function canonicalLink(html: string): string {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const hrefFirst = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return match?.[1] || hrefFirst?.[1] || "";
}

function tag(html: string, name: string): string {
  const match = html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1] ?? "";
}
