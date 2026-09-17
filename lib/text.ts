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
  return true;
}

function usableImage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = decodeXmlEntities(raw.trim());
  return isUsableArticleImage(value) ? value : null;
}

export function firstImageFromHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const decoded = decodeXmlEntities(html);
  for (const match of decoded.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const candidates = [
      tag.match(/\b(?:data-src|data-lazy-src|data-original)=["']([^"']+)["']/i)?.[1],
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1],
      tag.match(/\bsrcset=["']\s*([^"'\s,]+)/i)?.[1],
    ];
    for (const candidate of candidates) {
      const usable = usableImage(candidate);
      if (usable) return usable;
    }
  }
  return null;
}

function enclosureUrl(xml: string): string | null {
  const tags = xml.match(/<enclosure\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "";
    const medium = tag.match(/\bmedium=["']([^"']+)["']/i)?.[1] ?? "";
    if (!url) continue;
    if (type.toLowerCase().startsWith("image/") || medium.toLowerCase() === "image") {
      return usableImage(url);
    }
    const usable = usableImage(url);
    if (usable && /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(usable)) return usable;
  }
  return null;
}

export function feedImageUrl(xml: string | undefined | null): string | null {
  if (!xml) return null;
  const decoded = decodeXmlEntities(xml);
  const media = decoded.match(/<media:(?:content|thumbnail)\b[^>]*\burl=["']([^"']+)["']/i);
  const mediaUrl = usableImage(media?.[1]);
  if (mediaUrl) return mediaUrl;
  const itunes = decoded.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);
  const itunesUrl = usableImage(itunes?.[1]);
  if (itunesUrl) return itunesUrl;
  const enclosure = enclosureUrl(decoded);
  if (enclosure) return enclosure;
  const atomEnclosure = decoded.match(
    /<link\b[^>]*rel=["']enclosure["'][^>]*href=["']([^"']+)["']/i,
  );
  const atomUrl = usableImage(atomEnclosure?.[1]);
  if (atomUrl) return atomUrl;
  const hrefFirst = decoded.match(
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']enclosure["']/i,
  );
  const hrefUrl = usableImage(hrefFirst?.[1]);
  if (hrefUrl) return hrefUrl;
  return firstImageFromHtml(decoded);
}
