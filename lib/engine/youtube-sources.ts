import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { mediaSources, type MediaSource } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { DISABLED_SOURCE_SET, ENABLED_SOURCE_SET } from "@/config/wave1-sources";
import {
  ingestYoutubeChannel,
  isYoutubeMediaSource,
  mediaSourceIdForChannel,
  parseYoutubeChannelInput,
  youtubeChannelUrl,
  youtubeMaxResults,
} from "./youtube";

export const DEMO_YOUTUBE_SOURCE_ID = "yt_petrolicious";

export const DEMO_YOUTUBE_SOURCE = {
  id: DEMO_YOUTUBE_SOURCE_ID,
  publication: "Petrolicious",
  country: "US",
  url: "https://www.youtube.com/@Petrolicious",
  channelId: "@Petrolicious",
  sourceType: "youtube",
  maxArticles: 8,
} as const;

export async function seedYoutubeDemoSource(db: LibSQLDatabase<typeof schema>) {
  const existing = (
    await db.select().from(mediaSources).where(eq(mediaSources.id, DEMO_YOUTUBE_SOURCE_ID)).limit(1)
  )[0];
  if (existing) return existing;
  await db.insert(mediaSources).values({
    id: DEMO_YOUTUBE_SOURCE_ID,
    publication: DEMO_YOUTUBE_SOURCE.publication,
    country: DEMO_YOUTUBE_SOURCE.country,
    url: DEMO_YOUTUBE_SOURCE.url,
    rssUrl: null,
    websiteAvailable: true,
    scrapeDifficulty: "api",
    editorialCategory: "Culture",
    marquesCovered: "various",
    relevance: "Good: first-class video culture",
    csvEnabled: false,
    enabled: true,
    sourceType: "youtube",
    rssVerifiedStatus: "api",
    rssConfidence: "channel",
    priority: 200,
    maxArticles: DEMO_YOUTUBE_SOURCE.maxArticles,
    allowExcerpt: true,
    allowImage: true,
    channelId: DEMO_YOUTUBE_SOURCE.channelId,
  });
  return (
    await db.select().from(mediaSources).where(eq(mediaSources.id, DEMO_YOUTUBE_SOURCE_ID)).limit(1)
  )[0];
}

export function isIngestibleMediaSource(source: MediaSource, ids?: string[]) {
  if (!source.enabled) return false;
  if (DISABLED_SOURCE_SET.has(source.id)) return false;
  if (ids?.length && !ids.includes(source.id)) return false;
  if (isYoutubeMediaSource(source)) return true;
  return ENABLED_SOURCE_SET.has(source.id);
}

export async function addYoutubeMediaSource(input: {
  raw: string;
  publication?: string;
  country?: string;
  maxArticles?: number;
  enabled?: boolean;
}) {
  const parsed = parseYoutubeChannelInput(input.raw);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }

  const maxArticles = youtubeMaxResults(input.maxArticles);
  const fetched = await ingestYoutubeChannel(parsed.value, {
    maxResults: 1,
    titleHint: input.publication,
  });
  const channelId = fetched.channel.channelId;
  const publication =
    input.publication?.trim() || fetched.channel.title || parsed.displayHint;
  const id = mediaSourceIdForChannel(channelId);
  const url = youtubeChannelUrl(
    parsed.kind === "channelId" ? parsed.value : fetched.channel.channelId.startsWith("mock_")
      ? parsed.displayHint
      : fetched.channel.channelId,
  );

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const existingByChannel = (await db.select().from(mediaSources)).find(
    (row) =>
      row.id === id ||
      row.channelId === channelId ||
      row.channelId === parsed.displayHint ||
      row.url === url,
  );
  if (existingByChannel) {
    const next = {
      publication,
      url,
      channelId,
      sourceType: "youtube" as const,
      maxArticles,
      enabled: input.enabled ?? existingByChannel.enabled,
      lastError: fetched.usedMock
        ? "Used local mock (no YOUTUBE_API_KEY). Channel stored; live ingest needs a server key."
        : existingByChannel.lastError,
    };
    await db.update(mediaSources).set(next).where(eq(mediaSources.id, existingByChannel.id));
    return {
      source: {
        ...(
          await db.select().from(mediaSources).where(eq(mediaSources.id, existingByChannel.id)).limit(1)
        )[0],
        ...next,
      },
      created: false,
      usedMock: fetched.usedMock,
    };
  }

  await db.insert(mediaSources).values({
    id,
    publication,
    country: input.country?.trim() || "UK",
    url,
    rssUrl: fetched.channel.uploadsPlaylistId,
    websiteAvailable: true,
    scrapeDifficulty: "api",
    editorialCategory: "Culture",
    marquesCovered: "various",
    relevance: "Good: first-class video culture",
    csvEnabled: false,
    enabled: input.enabled ?? true,
    sourceType: "youtube",
    rssVerifiedStatus: "api",
    rssConfidence: fetched.usedMock ? "mock" : "channel",
    priority: 200,
    maxArticles,
    allowExcerpt: true,
    allowImage: true,
    channelId,
    lastError: fetched.usedMock
      ? "Used local mock (no YOUTUBE_API_KEY). Channel stored; live ingest needs a server key."
      : null,
  });

  const source = (await db.select().from(mediaSources).where(eq(mediaSources.id, id)).limit(1))[0];
  return { source, created: true, usedMock: fetched.usedMock };
}
