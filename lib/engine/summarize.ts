import { extractPageImage, extractPageSummary } from "./article-text";
import { fetchText } from "./http";

export async function extractOriginalPage(
  canonicalUrl: string,
  title: string,
  teaser?: string | null,
): Promise<{ summary: string | null; imageUrl: string | null }> {
  const page = await fetchText(canonicalUrl, { timeoutMs: 12_000, accept: "text/html, */*" });
  if (!page.ok) return { summary: null, imageUrl: null };
  if (page.status === 401 || page.status === 403) return { summary: null, imageUrl: null };
  return {
    summary: extractPageSummary(page.text, { title, teaser }),
    imageUrl: extractPageImage(page.text),
  };
}

export async function extractOriginalSummary(
  canonicalUrl: string,
  title: string,
  teaser?: string | null,
): Promise<string | null> {
  const page = await extractOriginalPage(canonicalUrl, title, teaser);
  return page.summary;
}
