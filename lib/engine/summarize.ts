import { extractPageImage, extractPageImageCandidates, extractPageSummary } from "./article-text";
import { fetchText } from "./http";
import type { ImageCandidate } from "./images";

export async function extractOriginalPage(
  canonicalUrl: string,
  title: string,
  teaser?: string | null,
): Promise<{ summary: string | null; imageUrl: string | null; imageCandidates: ImageCandidate[] }> {
  const page = await fetchText(canonicalUrl, { timeoutMs: 12_000, accept: "text/html, */*" });
  if (!page.ok) return { summary: null, imageUrl: null, imageCandidates: [] };
  if (page.status === 401 || page.status === 403) {
    return { summary: null, imageUrl: null, imageCandidates: [] };
  }
  return {
    summary: extractPageSummary(page.text, { title, teaser }),
    imageUrl: extractPageImage(page.text),
    imageCandidates: extractPageImageCandidates(page.text),
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
