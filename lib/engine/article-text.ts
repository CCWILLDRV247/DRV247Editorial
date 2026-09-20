import { capSummary, firstImageFromHtml, isUsableArticleImage, stripHtml } from "../text";

const MIN_EXTRACT_CHARS = 40;

const BOILERPLATE =
  /subscribe today|never miss out|share with your network|accept (all )?cookies|cookie policy|sign in to continue|log in to continue|create an account|this site uses cookies/i;

const BYLINE = /^(words|by|author|photography|photos|written by|pictured)\b/i;

export function extractPageImage(html: string): string | null {
  const candidates = [
    metaContent(html, "og:image:secure_url"),
    metaContent(html, "og:image:url"),
    metaContent(html, "og:image"),
    metaContent(html, "twitter:image:src"),
    metaContent(html, "twitter:image"),
    firstImageFromHtml(html),
  ];
  for (const candidate of candidates) {
    if (isUsableArticleImage(candidate)) return candidate;
  }
  return null;
}

export function extractPageSummary(
  html: string,
  options: { title: string; teaser?: string | null },
): string | null {
  const title = options.title.trim();
  const teaser = options.teaser?.trim() ?? "";
  const candidates = [
    ...standfirsts(html),
    metaDescription(html),
    firstSubstantialParagraph(html),
  ];
  for (const candidate of candidates) {
    const accepted = acceptExtract(candidate, title, teaser);
    if (accepted) return accepted;
  }
  return null;
}

export function acceptExtract(
  text: string,
  title: string,
  teaser = "",
): string | null {
  const cleaned = stripHtml(text).replace(/\s+/g, " ").trim();
  if (cleaned.length < MIN_EXTRACT_CHARS) return null;
  if (sameCopy(cleaned, title) || sameCopy(cleaned, teaser)) return null;
  if (cleaned.length <= 320) return cleaned;
  const sentence = cleaned.match(/^[\s\S]{40,}?[.!?](?=\s|$)/)?.[0]?.trim();
  if (sentence && sentence.length <= 320 && !sameCopy(sentence, title) && !sameCopy(sentence, teaser)) {
    return sentence;
  }
  return capSummary(cleaned);
}

function standfirsts(html: string): string[] {
  const matches = [
    ...html.matchAll(
      /<(p|div|span|h2|h3)\b[^>]*(?:class|id)=["'][^"']*(?:stand-?first|\bdek\b|\blede\b|sub-?head(?:ing)?)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi,
    ),
  ];
  return matches.map((match) => stripHtml(match[2])).filter(Boolean);
}

function metaDescription(html: string): string {
  return (
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description")
  );
}

function firstSubstantialParagraph(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const article =
    isolate(cleaned, "article") ||
    isolateAttr(cleaned, "itemprop", "articleBody") ||
    isolate(cleaned, "main") ||
    cleaned;
  for (const match of article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(match[1]).replace(/\s+/g, " ").trim();
    if (text.length < MIN_EXTRACT_CHARS) continue;
    if (BOILERPLATE.test(text) || BYLINE.test(text)) continue;
    return text;
  }
  return "";
}

function sameCopy(left: string, right: string): boolean {
  const a = fold(left);
  const b = fold(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, name: string): string {
  const property = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  const contentFirst = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
  );
  return stripHtml(property?.[1] || contentFirst?.[1] || "");
}

function isolate(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ?? null;
}

function isolateAttr(html: string, attr: string, value: string): string | null {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*${attr}=["']${value}["'][^>]*>([\\s\\S]*?)</\\1>`, "i"),
  );
  return match?.[2] ?? null;
}
