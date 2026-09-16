import { stripHtml } from "../text";

const MIN_ARTICLE_CHARS = 400;
const MAX_LLM_CHARS = 8000;

const BOILERPLATE =
  /subscribe today|never miss out|share with your network|accept (all )?cookies|cookie policy|sign in to continue|log in to continue|create an account|this site uses cookies/i;

export function extractArticleText(html: string): string | null {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const article =
    isolate(cleaned, "article") ||
    isolateAttr(cleaned, "itemprop", "articleBody") ||
    isolate(cleaned, "main") ||
    cleaned;

  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 40 && !BOILERPLATE.test(text));

  let text = paragraphs.join("\n\n");
  if (text.length < MIN_ARTICLE_CHARS) {
    text = stripHtml(article);
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length < MIN_ARTICLE_CHARS) return null;
  return text.slice(0, MAX_LLM_CHARS);
}

export function acceptAiSummary(text: string, title: string): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (/^none\.?$/i.test(cleaned)) return null;
  if (cleaned.toLowerCase() === title.trim().toLowerCase()) return null;
  if (cleaned.length < 40) return null;
  if (cleaned.length <= 420) return cleaned;
  const sliced = cleaned.slice(0, 420);
  const lastStop = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf("? "));
  return `${(lastStop > 80 ? sliced.slice(0, lastStop + 1) : sliced).trim()}`;
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
