import { extractPageSummary } from "./article-text";
import { fetchText } from "./http";

export async function extractOriginalSummary(
  canonicalUrl: string,
  title: string,
  teaser?: string | null,
): Promise<string | null> {
  const page = await fetchText(canonicalUrl, { timeoutMs: 12_000, accept: "text/html, */*" });
  if (!page.ok) return null;
  if (page.status === 401 || page.status === 403) return null;
  return extractPageSummary(page.text, { title, teaser });
}
