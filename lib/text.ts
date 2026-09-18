const SUMMARY_MAX = 320;

export function decodeXmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/gi, "&");
}

export function stripHtml(input: string | undefined | null): string {
  if (!input) return "";
  return decodeXmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function capSummary(input: string, max = SUMMARY_MAX): string {
  const text = stripHtml(input);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function canonicalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
    ]);
    [...url.searchParams.keys()].forEach((key) => {
      if (drop.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    });
    let href = url.toString();
    if (href.endsWith("/") && url.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

export function isUsableArticleImage(raw: string | null | undefined): raw is string {
  if (!raw?.trim()) return false;
  const value = decodeXmlEntities(raw.trim());
  const lower = value.toLowerCase();
  if (lower.startsWith("data:") || lower.startsWith("javascript:")) return false;
  if (!/^(?:https?:)?\/\//i.test(lower) && !lower.startsWith("/")) return false;
  if (/\.svg(\?|#|$)/i.test(lower)) return false;
  if (/[?&]w=undefined(?:&|$)/i.test(lower)) return false;
  if (/(?:^|\/)[^/?#]*logo[^/?#]*\.(?:jpe?g|png|gif|webp)/i.test(lower)) return false;
  if (/\/(?:logo|logos)\//i.test(lower)) return false;
  // RaceFans (and similar WP themes) put Amazon merch buttons in the first <img>.
  if (/\/wp-content\/themes\//i.test(lower)) return false;
  if (/\/buttons\/[^/?#]*amazon[^/?#]*\.(?:jpe?g|png|gif|webp)/i.test(lower)) return false;
  // Curves ProcessWire chrome: back-to-top, branding, /site/images header art.
  // Editorial photos live in /site/assets/files/{id}/.
  if (/\/site\/assets\/images\//i.test(lower)) return false;
  if (/\/site\/images\//i.test(lower)) return false;
  if (/(?:^|\/)[^/?#]*arrow-up[^/?#]*\.(?:jpe?g|png|gif|webp)/i.test(lower)) return false;
  if (/(?:^|\/)[^/?#]*branding[^/?#]*\.(?:jpe?g|png|gif|webp)/i.test(lower)) return false;
  if (/(?:^|\/)(?:favicon|apple-touch-icon|sprite)[^/?#]*\.(?:jpe?g|png|gif|webp|ico)/i.test(lower)) {
    return false;
  }
  if (/\.(?:woff2?|ttf|otf|eot|css|js)(\?|#|$)/i.test(lower)) return false;
  if (/\/(?:fonts?|font-files)\//i.test(lower)) return false;
  if (/(?:\/|_)(?:1x1|pixel|spacer|tracking)(?:[._/-]|$)/i.test(lower)) return false;
  if (/[?&](?:w|width|h|height)=1(?:&|$)/i.test(lower)) return false;
  return true;
}

function usableImage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = decodeXmlEntities(raw.trim());
  return isUsableArticleImage(value) ? value : null;
}

export function htmlImageUrls(html: string | undefined | null): string[] {
  if (!html) return [];
  const decoded = decodeXmlEntities(html);
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const match of decoded.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const candidates = [
      tag.match(/\b(?:data-src|data-lazy-src|data-original)=["']([^"']+)["']/i)?.[1],
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1],
      tag.match(/\bsrcset=["']\s*([^"'\s,]+)/i)?.[1],
    ];
    for (const candidate of candidates) {
      const usable = usableImage(candidate);
      if (!usable || seen.has(usable)) continue;
      seen.add(usable);
      urls.push(usable);
      break;
    }
  }
  return urls;
}

export function firstImageFromHtml(html: string | undefined | null): string | null {
  return htmlImageUrls(html)[0] ?? null;
}

function enclosureUrls(xml: string): string[] {
  const urls: string[] = [];
  const tags = xml.match(/<enclosure\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "";
    const medium = tag.match(/\bmedium=["']([^"']+)["']/i)?.[1] ?? "";
    if (!url) continue;
    if (type.toLowerCase().startsWith("image/") || medium.toLowerCase() === "image") {
      const usable = usableImage(url);
      if (usable) urls.push(usable);
      continue;
    }
    const usable = usableImage(url);
    if (usable && /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(usable)) urls.push(usable);
  }
  return urls;
}

export type FeedImageCandidate = {
  url: string;
  sourceType: "rss_media" | "rss_enclosure" | "article" | "publication";
};

export function feedImageCandidates(xml: string | undefined | null): FeedImageCandidate[] {
  if (!xml) return [];
  const decoded = decodeXmlEntities(xml);
  const candidates: FeedImageCandidate[] = [];
  const push = (url: string | null | undefined, sourceType: FeedImageCandidate["sourceType"]) => {
    const usable = usableImage(url);
    if (usable) candidates.push({ url: usable, sourceType });
  };
  for (const match of decoded.matchAll(/<media:(?:content|thumbnail)\b[^>]*\burl=["']([^"']+)["']/gi)) {
    push(match[1], "rss_media");
  }
  for (const match of decoded.matchAll(/<itunes:image[^>]+href=["']([^"']+)["']/gi)) {
    push(match[1], "publication");
  }
  for (const url of enclosureUrls(decoded)) push(url, "rss_enclosure");
  for (const match of decoded.matchAll(/<link\b[^>]*rel=["']enclosure["'][^>]*href=["']([^"']+)["']/gi)) {
    push(match[1], "rss_enclosure");
  }
  for (const match of decoded.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']enclosure["']/gi)) {
    push(match[1], "rss_enclosure");
  }
  for (const url of htmlImageUrls(decoded)) push(url, "article");
  return candidates;
}

export function feedImageUrl(xml: string | undefined | null): string | null {
  const rank: Record<FeedImageCandidate["sourceType"], number> = {
    rss_media: 1,
    rss_enclosure: 2,
    article: 5,
    publication: 6,
  };
  const sorted = [...feedImageCandidates(xml)].sort(
    (left, right) => rank[left.sourceType] - rank[right.sourceType],
  );
  return sorted[0]?.url ?? null;
}
