import { capSummary } from "@/lib/text";
import { ingestYoutubeChannel } from "@/lib/engine/youtube";
import { youtubeVideosToEngineItems } from "@/lib/engine/adapters/youtube";
import type { IngestedItem } from "./types";

export async function ingestYoutube(
  identifier: string,
): Promise<{ items: IngestedItem[]; usedMock: boolean }> {
  const fetched = await ingestYoutubeChannel(identifier, { maxResults: 15 });
  const items: IngestedItem[] = youtubeVideosToEngineItems(fetched.items).map((item) => ({
    title: item.title,
    summary: capSummary(item.excerpt),
    imageUrl: item.imageUrl,
    canonicalUrl: item.canonicalUrl,
    publishedAt: item.publishedAt,
  }));
  return { items, usedMock: fetched.usedMock };
}
