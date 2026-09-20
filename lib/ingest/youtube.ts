import { capSummary, canonicalizeUrl } from "@/lib/text";
import type { IngestedItem } from "./types";

const MOCK_VIDEOS: IngestedItem[] = [
  {
    title: "Goodwood Festival of Speed hillclimb",
    summary:
      "The Duke of Richmond's driveway turns into a timed hill. Mock local fallback while YOUTUBE_API_KEY is unset.",
    imageUrl: null,
    canonicalUrl: "https://www.youtube.com/watch?v=goodwood-fos-mock",
    publishedAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    title: "Members' Meeting: the lawn, the noise, the tweed",
    summary:
      "Concourse metal and race-bred specials share the same weekend. Mock YouTube item for local ingest.",
    imageUrl: null,
    canonicalUrl: "https://www.youtube.com/watch?v=goodwood-mm-mock",
    publishedAt: Date.now() - 1000 * 60 * 60 * 30,
  },
];

type YoutubeSearchResponse = {
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
  }[];
  error?: { message?: string };
};

export async function ingestYoutube(
  identifier: string,
): Promise<{ items: IngestedItem[]; usedMock: boolean }> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return {
      items: MOCK_VIDEOS.map((item) => ({
        ...item,
        canonicalUrl: `${item.canonicalUrl}?channel=${encodeURIComponent(identifier)}`,
      })),
      usedMock: true,
    };
  }

  const channelId = identifier.trim();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", "15");
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("key", key);

  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as YoutubeSearchResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `YouTube API ${response.status}`);
  }

  const items: IngestedItem[] = [];
  for (const entry of data.items ?? []) {
    const videoId = entry.id?.videoId;
    const title = entry.snippet?.title?.trim();
    if (!videoId || !title) continue;
    const canonicalUrl = canonicalizeUrl(
      `https://www.youtube.com/watch?v=${videoId}`,
    );
    if (!canonicalUrl) continue;
    const published = Date.parse(entry.snippet?.publishedAt ?? "");
    items.push({
      title,
      summary: capSummary(entry.snippet?.description ?? title),
      imageUrl:
        entry.snippet?.thumbnails?.high?.url ??
        entry.snippet?.thumbnails?.medium?.url ??
        null,
      canonicalUrl,
      publishedAt: Number.isFinite(published) ? published : Date.now(),
    });
  }

  return { items, usedMock: false };
}
