import type { TeaserCategoryFeed } from "../../../config/teaser-feeds";
import { canonicalizeUrl, capSummary, isUsableArticleImage, stripHtml } from "../../text";
import type { EngineItem } from "./rss";

const BLOCKED_SEGMENTS = new Set([
  "shop",
  "shops",
  "shopping",
  "product",
  "products",
  "collection",
  "collections",
  "cart",
  "checkout",
  "merch",
  "merchandise",
]);

type WpPost = {
  id?: number;
  date?: string;
  date_gmt?: string;
  link?: string;
  categories?: number[];
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  yoast_head_json?: {
    og_description?: string;
    author?: string;
    og_image?: { url?: string }[];
  };
};

/** Motors story permalinks only. Category indexes, shop, and other verticals stay out. */
export function isTeaserStoryUrl(url: string, feed: TeaserCategoryFeed): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== feed.host) return false;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const prefix = feed.storyPathPrefix.split("/").filter(Boolean);
    if (segments.length <= prefix.length) return false;
    if (!prefix.every((part, index) => segments[index]?.toLowerCase() === part.toLowerCase())) {
      return false;
    }
    return !segments.some((segment) => BLOCKED_SEGMENTS.has(segment.toLowerCase()));
  } catch {
    return false;
  }
}

export function skipsOriginalPageFetch(method: string | null | undefined): boolean {
  return method === "youtube" || method === "wp-json";
}

/** Title, excerpt, summary, and image URL. Ignores `content` (the full article). */
export function parseWpCategoryPosts(json: string, feed: TeaserCategoryFeed): EngineItem[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("Category feed did not return a post list");
  }
  const items: EngineItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const post = entry as WpPost;
    // Embed context omits `categories`. When the array is present, it must include Motors.
    if (post.categories != null && !post.categories.includes(feed.categoryId)) continue;
    const canonical = canonicalizeUrl(post.link ?? "");
    if (!canonical || !isTeaserStoryUrl(canonical, feed)) continue;
    const title = stripHtml(post.title?.rendered);
    if (!title) continue;
    const excerpt = capSummary(stripHtml(post.excerpt?.rendered) || title);
    const summary = capSummary(stripHtml(post.yoast_head_json?.og_description) || excerpt);
    const imageUrl = post.yoast_head_json?.og_image?.find((image) =>
      isUsableArticleImage(image.url),
    )?.url;
    const author =
      typeof post.yoast_head_json?.author === "string"
        ? stripHtml(post.yoast_head_json.author) || null
        : null;
    const publishedAt = Date.parse(post.date_gmt || post.date || "");
    items.push({
      title,
      url: canonical,
      canonicalUrl: canonical,
      guid: post.id != null ? String(post.id) : null,
      author,
      excerpt,
      summary,
      imageUrl: imageUrl ?? null,
      imageCandidates: imageUrl ? [{ url: imageUrl, sourceType: "article" }] : [],
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : Date.now(),
      method: "wp-json",
    });
  }
  return items;
}
