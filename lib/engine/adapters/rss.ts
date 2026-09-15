import { capSummary, canonicalizeUrl, firstImageFromHtml, stripHtml } from "../../text";
import { looksLikeFeed } from "../http";

export type EngineItem = {
  title: string;
  url: string;
  canonicalUrl: string;
  guid?: string | null;
  author?: string | null;
  excerpt: string;
  imageUrl: string | null;
  publishedAt: number;
  method: "rss" | "atom" | "sitemap" | "scrape";
};

export function parseFeedXml(xml: string, contentType = ""): EngineItem[] {
  if (!looksLikeFeed(xml, contentType)) {
    throw new Error("Not a genuine RSS or Atom feed");
  }
  const atom = /<feed[\s>]/i.test(xml);
  if (atom) return parseAtom(xml);
  return parseRss(xml);
}

function parseRss(xml: string): EngineItem[] {
  const items: EngineItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = decode(tag(block, "title"));
    const link =
      tag(block, "link") ||
      (attr(block, "guid", "isPermaLink") === "true" ? tag(block, "guid") : "");
    const guid = tag(block, "guid");
    const canonical = canonicalizeUrl(link || guid || "");
    if (!title || !canonical) continue;
    const encoded = tag(block, "content:encoded") || tag(block, "description");
    const date = tag(block, "pubDate") || tag(block, "dc:date");
    items.push({
      title,
      url: canonical,
      canonicalUrl: canonical,
      guid,
      author: decode(tag(block, "dc:creator") || tag(block, "author")) || null,
      excerpt: capSummary(encoded || title),
      imageUrl: enclosure(block) || firstImageFromHtml(encoded),
      publishedAt: parseDate(date),
      method: "rss",
    });
  }
  return items;
}

function parseAtom(xml: string): EngineItem[] {
  const items: EngineItem[] = [];
  const blocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks) {
    const title = decode(tag(block, "title"));
    const href =
      attrTag(block, "link", "rel", "alternate") ||
      attrTag(block, "link", "rel", "self") ||
      hrefOf(block);
    const canonical = canonicalizeUrl(href || "");
    if (!title || !canonical) continue;
    const summary = tag(block, "summary") || tag(block, "content");
    items.push({
      title,
      url: canonical,
      canonicalUrl: canonical,
      guid: tag(block, "id"),
      author: decode(tag(block, "name")) || null,
      excerpt: capSummary(summary || title),
      imageUrl: firstImageFromHtml(summary),
      publishedAt: parseDate(tag(block, "updated") || tag(block, "published")),
      method: "atom",
    });
  }
  return items;
}

function tag(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? stripCdata(match[1]) : "";
}

function attr(xml: string, name: string, attribute: string): string {
  const match = xml.match(new RegExp(`<${name}[^>]*${attribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function attrTag(xml: string, name: string, attribute: string, value: string): string {
  const regex = new RegExp(`<${name}[^>]*${attribute}=["']${value}["'][^>]*>`, "i");
  const tagMatch = xml.match(regex);
  if (!tagMatch) return "";
  const href = tagMatch[0].match(/href=["']([^"']+)["']/i);
  return href?.[1] ?? "";
}

function hrefOf(xml: string): string {
  const match = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ?? "";
}

function enclosure(xml: string): string | null {
  const match = xml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decode(value: string): string {
  return stripHtml(value);
}

function parseDate(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Date.now();
}
