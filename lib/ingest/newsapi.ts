import { capSummary, canonicalizeUrl } from "@/lib/text";
import type { IngestedItem } from "./types";

const MOCK_ARTICLES: IngestedItem[] = [
  {
    title: "Why the restomod boom still has a soul",
    summary:
      "Local NewsAPI fallback: shops keep the silhouette and throw out the wiring loom. No NEWSAPI_KEY is set, so this mock stands in.",
    imageUrl: null,
    canonicalUrl: "https://example.com/mock/restomod-soul",
    publishedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    title: "The paddock as a culture, not a result sheet",
    summary:
      "Mock NewsAPI item: club racers, concours d'elegance, and the people who sleep in the transporter.",
    imageUrl: null,
    canonicalUrl: "https://example.com/mock/paddock-culture",
    publishedAt: Date.now() - 1000 * 60 * 90,
  },
];

type NewsApiResponse = {
  status?: string;
  message?: string;
  articles?: {
    title?: string;
    description?: string;
    url?: string;
    urlToImage?: string;
    publishedAt?: string;
  }[];
};

export async function ingestNewsApi(
  identifier: string,
): Promise<{ items: IngestedItem[]; usedMock: boolean }> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    return {
      items: MOCK_ARTICLES.map((item) => ({
        ...item,
        canonicalUrl: `${item.canonicalUrl}?q=${encodeURIComponent(identifier)}`,
      })),
      usedMock: true,
    };
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", identifier);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "15");
  url.searchParams.set("apiKey", key);

  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as NewsApiResponse;
  if (!response.ok || data.status === "error") {
    throw new Error(data.message ?? `NewsAPI ${response.status}`);
  }

  const items: IngestedItem[] = [];
  for (const article of data.articles ?? []) {
    const canonicalUrl = canonicalizeUrl(article.url ?? "");
    const title = article.title?.trim();
    if (!canonicalUrl || !title) continue;
    const published = Date.parse(article.publishedAt ?? "");
    items.push({
      title,
      summary: capSummary(article.description ?? title),
      imageUrl: article.urlToImage ?? null,
      canonicalUrl,
      publishedAt: Number.isFinite(published) ? published : Date.now(),
    });
  }

  return { items, usedMock: false };
}
