import type { EngineItem } from "./rss";
import {
  canonicalizeYoutubeWatchUrl,
  youtubeWatchUrl,
  type YoutubeVideo,
} from "../youtube";

export function youtubeVideosToEngineItems(videos: YoutubeVideo[]): EngineItem[] {
  const items: EngineItem[] = [];
  for (const video of videos) {
    const canonicalUrl = canonicalizeYoutubeWatchUrl(youtubeWatchUrl(video.videoId));
    if (!canonicalUrl) continue;
    items.push({
      title: video.title,
      url: canonicalUrl,
      canonicalUrl,
      guid: video.videoId,
      author: video.channelTitle,
      excerpt: video.description,
      imageUrl: video.thumbnailUrl,
      imageCandidates: video.thumbnailUrl
        ? [{ url: video.thumbnailUrl, sourceType: "youtube" }]
        : [],
      publishedAt: video.publishedAt,
      method: "youtube",
    });
  }
  return items;
}
