import Parser from "rss-parser";
import { capSummary, canonicalizeUrl, firstImageFromHtml } from "@/lib/text";
import type { IngestedItem } from "./types";

type RssItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  contentEncoded?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[];
  mediaThumbnail?: { $?: { url?: string } };
};

const parser = new Parser<Record<string, unknown>, RssItem>({
  timeout: 15000,
  headers: {
    "User-Agent": "DRV247-Editorial/1.0 (+https://drv247.local)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

function mediaUrl(item: RssItem): string | null {
  const enclosure = item.enclosure?.url;
  if (enclosure) return enclosure;
  const thumb = item.mediaThumbnail?.$?.url;
  if (thumb) return thumb;
  const media = item.mediaContent;
  if (Array.isArray(media)) {
    const url = media.find((entry) => entry.$?.url)?.$?.url;
    if (url) return url;
  } else if (media?.$?.url) {
    return media.$.url;
  }
  return (
    firstImageFromHtml(item.contentEncoded) ??
    firstImageFromHtml(item.content) ??
    null
  );
}

export async function ingestRss(identifier: string): Promise<IngestedItem[]> {
  const feed = await parser.parseURL(identifier);
  const items: IngestedItem[] = [];

  for (const item of feed.items) {
    const canonicalUrl = canonicalizeUrl(item.link ?? "");
    const title = (item.title ?? "").trim();
    if (!canonicalUrl || !title) continue;

    const published =
      item.isoDate ?? item.pubDate
        ? Date.parse(item.isoDate ?? item.pubDate ?? "")
        : Date.now();

    items.push({
      title,
      summary: capSummary(
        item.contentSnippet ?? item.contentEncoded ?? item.content ?? title,
      ),
      imageUrl: mediaUrl(item),
      canonicalUrl,
      publishedAt: Number.isFinite(published) ? published : Date.now(),
    });
  }

  return items;
}
