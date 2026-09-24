import { capSummary, canonicalizeUrl } from "../text";

export const YOUTUBE_CHANNEL_ID = /^UC[\w-]{21,}$/;
export const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;
export const YOUTUBE_HANDLE = /^@[\w.-]{3,30}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export type YoutubeChannelInput =
  | { kind: "channelId"; value: string; displayHint: string }
  | { kind: "handle"; value: string; displayHint: string }
  | { kind: "username"; value: string; displayHint: string };

export type YoutubeChannel = {
  channelId: string;
  title: string;
  uploadsPlaylistId: string | null;
};

export type YoutubeVideo = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: number;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
};

export type YoutubeFetchResult = {
  channel: YoutubeChannel;
  items: YoutubeVideo[];
  usedMock: boolean;
  units: number;
};

type YoutubeErrorBody = { error?: { message?: string } };

export function youtubeApiKey() {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  return key || null;
}

export function youtubeMaxResults(sourceMax?: number | null) {
  const fromEnv = Number(process.env.YOUTUBE_MAX_RESULTS ?? "");
  const requested = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : sourceMax ?? 8;
  return Math.min(50, Math.max(1, Math.round(requested)));
}

export function isYoutubeHost(url: string) {
  try {
    return YOUTUBE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isYoutubeWatchUrl(url: string) {
  const videoId = parseYoutubeVideoId(url);
  return Boolean(videoId);
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeChannelUrl(channelId: string) {
  if (channelId.startsWith("@")) return `https://www.youtube.com/${channelId}`;
  if (YOUTUBE_CHANNEL_ID.test(channelId)) return `https://www.youtube.com/channel/${channelId}`;
  return `https://www.youtube.com/${channelId.startsWith("@") ? channelId : `@${channelId}`}`;
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_VIDEO_ID.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_VIDEO_ID.test(id) ? id : null;
    }
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
    const fromQuery = url.searchParams.get("v") ?? "";
    if (YOUTUBE_VIDEO_ID.test(fromQuery)) return fromQuery;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live" || parts[0] === "v") {
      const id = parts[1] ?? "";
      return YOUTUBE_VIDEO_ID.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function canonicalizeYoutubeWatchUrl(input: string): string | null {
  const videoId = parseYoutubeVideoId(input);
  if (!videoId) return null;
  return canonicalizeUrl(youtubeWatchUrl(videoId));
}

export function parseYoutubeChannelInput(
  raw: string,
): YoutubeChannelInput | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Channel URL or ID is required" };

  if (YOUTUBE_CHANNEL_ID.test(trimmed)) {
    return { kind: "channelId", value: trimmed, displayHint: trimmed };
  }
  if (YOUTUBE_HANDLE.test(trimmed)) {
    return { kind: "handle", value: trimmed, displayHint: trimmed };
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) || url.hostname.toLowerCase().includes("youtu.be")) {
      return { error: "Use a YouTube channel URL, @handle, or UC… channel ID" };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (["watch", "shorts", "embed", "live", "playlist", "results", "feed", "clip"].includes(parts[0] ?? "")) {
      return { error: "Use a YouTube channel URL, @handle, or UC… channel ID" };
    }
    if (parts[0] === "channel" && parts[1] && YOUTUBE_CHANNEL_ID.test(parts[1])) {
      return { kind: "channelId", value: parts[1], displayHint: parts[1] };
    }
    if (parts[0]?.startsWith("@") && YOUTUBE_HANDLE.test(parts[0])) {
      return { kind: "handle", value: parts[0], displayHint: parts[0] };
    }
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
      return { kind: "username", value: parts[1], displayHint: parts[1] };
    }
    if (parts.length === 1 && YOUTUBE_HANDLE.test(`@${parts[0]}`)) {
      return { kind: "handle", value: `@${parts[0]}`, displayHint: `@${parts[0]}` };
    }
  } catch {
    return { error: "Could not parse that channel URL or ID" };
  }

  return { error: "Use a YouTube channel URL, @handle, or UC… channel ID" };
}

export function mediaSourceIdForChannel(channelId: string) {
  const safe = channelId.replace(/^@/, "handle_").replace(/[^a-zA-Z0-9_-]/g, "");
  return `yt_${safe}`.slice(0, 64);
}

export function isYoutubeMediaSource(source: {
  sourceType?: string | null;
  url?: string | null;
  channelId?: string | null;
}) {
  if (source.sourceType === "youtube") return true;
  if (source.channelId) return true;
  return Boolean(source.url && isYoutubeHost(source.url));
}

/** Desk-added YouTube rows store `relevance: "high"`, which the ranker treats as base (8). Map them onto the same Good band as culture RSS so videos can pass the For You quality gate without changing RSS scoring. */
export function editorialSourceRelevance(source?: {
  relevance?: string | null;
  sourceType?: string | null;
  url?: string | null;
  channelId?: string | null;
} | null) {
  const raw = source?.relevance?.trim() ?? "";
  if (!source || !isYoutubeMediaSource(source)) return raw;
  const token = raw.toLowerCase();
  if (token.startsWith("excellent")) return raw;
  if (token.startsWith("good")) return raw;
  return "Good";
}

export async function ingestYoutubeChannel(
  raw: string,
  options?: { maxResults?: number; titleHint?: string },
): Promise<YoutubeFetchResult> {
  const parsed = parseYoutubeChannelInput(raw);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  const maxResults = youtubeMaxResults(options?.maxResults);
  const key = youtubeApiKey();
  if (!key) {
    return mockYoutubeFetch(parsed, maxResults, options?.titleHint);
  }

  const channel = await resolveLiveChannel(parsed, key);
  const { items, units } = await fetchLiveVideos(channel, maxResults, key);
  return { channel, items, usedMock: false, units: units + 1 };
}

async function resolveLiveChannel(
  parsed: YoutubeChannelInput,
  key: string,
): Promise<YoutubeChannel> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("key", key);
  if (parsed.kind === "channelId") url.searchParams.set("id", parsed.value);
  else if (parsed.kind === "handle") url.searchParams.set("forHandle", parsed.value.replace(/^@/, ""));
  else url.searchParams.set("forUsername", parsed.value);

  const data = await youtubeJson<{
    items?: {
      id?: string;
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  }>(url);
  const row = data.items?.[0];
  const channelId = row?.id;
  if (!channelId) {
    throw new Error(`YouTube channel not found: ${parsed.displayHint}`);
  }
  return {
    channelId,
    title: row.snippet?.title?.trim() || parsed.displayHint,
    uploadsPlaylistId: row.contentDetails?.relatedPlaylists?.uploads ?? uploadsPlaylistId(channelId),
  };
}

async function fetchLiveVideos(channel: YoutubeChannel, maxResults: number, key: string) {
  const playlistId = channel.uploadsPlaylistId ?? uploadsPlaylistId(channel.channelId);
  const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  playlistUrl.searchParams.set("part", "contentDetails,snippet");
  playlistUrl.searchParams.set("playlistId", playlistId);
  playlistUrl.searchParams.set("maxResults", String(maxResults));
  playlistUrl.searchParams.set("key", key);

  const playlist = await youtubeJson<{
    items?: {
      contentDetails?: { videoId?: string };
      snippet?: { title?: string; resourceId?: { videoId?: string } };
    }[];
  }>(playlistUrl);

  const videoIds = (playlist.items ?? [])
    .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter((id): id is string => Boolean(id && YOUTUBE_VIDEO_ID.test(id)));
  const unique = [...new Set(videoIds)].slice(0, maxResults);
  if (!unique.length) {
    return { items: [] as YoutubeVideo[], units: 1 };
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet");
  videosUrl.searchParams.set("id", unique.join(","));
  videosUrl.searchParams.set("key", key);

  const videos = await youtubeJson<{
    items?: {
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        channelId?: string;
        channelTitle?: string;
        liveBroadcastContent?: string;
        thumbnails?: {
          maxres?: { url?: string };
          standard?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
        };
      };
    }[];
  }>(videosUrl);

  const items: YoutubeVideo[] = [];
  for (const entry of videos.items ?? []) {
    const videoId = entry.id;
    const title = entry.snippet?.title?.trim();
    if (!videoId || !title) continue;
    if (entry.snippet?.liveBroadcastContent === "upcoming") continue;
    const published = Date.parse(entry.snippet?.publishedAt ?? "");
    items.push({
      videoId,
      title,
      description: capSummary(entry.snippet?.description ?? title),
      publishedAt: Number.isFinite(published) ? published : Date.now(),
      channelId: entry.snippet?.channelId || channel.channelId,
      channelTitle: entry.snippet?.channelTitle?.trim() || channel.title,
      thumbnailUrl:
        entry.snippet?.thumbnails?.maxres?.url ||
        entry.snippet?.thumbnails?.standard?.url ||
        entry.snippet?.thumbnails?.high?.url ||
        entry.snippet?.thumbnails?.medium?.url ||
        youtubeThumbnailUrl(videoId),
    });
  }
  return { items, units: 2 };
}

async function youtubeJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & YoutubeErrorBody;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `YouTube API ${response.status}`);
  }
  return data;
}

export const YOUTUBE_MOCK_MARKER = "Mock local fallback while YOUTUBE_API_KEY is unset";

function uploadsPlaylistId(channelId: string) {
  return channelId.replace(/^UC/, "UU");
}

function mockYoutubeFetch(
  parsed: YoutubeChannelInput,
  maxResults: number,
  titleHint?: string,
): YoutubeFetchResult {
  const channelId = parsed.value;
  const title = titleHint?.trim() || displayNameFromInput(parsed);
  const items = MOCK_VIDEOS.slice(0, maxResults).map((item, index) => ({
    ...item,
    channelId,
    channelTitle: title,
    videoId: mockVideoId(channelId, index, item.videoId),
    thumbnailUrl: item.thumbnailUrl,
  }));
  return {
    channel: {
      channelId,
      title,
      uploadsPlaylistId: parsed.kind === "channelId" ? uploadsPlaylistId(parsed.value) : null,
    },
    items,
    usedMock: true,
    units: 0,
  };
}

function displayNameFromInput(parsed: YoutubeChannelInput) {
  if (parsed.kind === "handle") return parsed.value.replace(/^@/, "");
  if (parsed.kind === "username") return parsed.value;
  return parsed.displayHint;
}

function mockVideoId(channelId: string, index: number, fallback: string) {
  let hash = 0;
  for (const char of channelId) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const prefix = `${(index + 10).toString(36)}${(hash % 36).toString(36)}`;
  const id = `${prefix}${fallback}`.replace(/[^a-zA-Z0-9_-]/g, "x");
  return id.slice(0, 11).padEnd(11, "x");
}

const MOCK_VIDEOS: Omit<YoutubeVideo, "channelId" | "channelTitle">[] = [
  {
    videoId: "drvF355mock",
    title: "A Ferrari F355 on the autostrada, filmed properly",
    description: `${YOUTUBE_MOCK_MARKER}. A 355 GTB, evening light, and the road south of Milan.`,
    publishedAt: Date.now() - 1000 * 60 * 60 * 8,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80",
  },
  {
    videoId: "drv964C2mock",
    title: "Porsche 964 Carrera 2: air-cooled, unassisted, enough",
    description: `${YOUTUBE_MOCK_MARKER}. A 964 C2 on a wet B-road, no narration over the flat-six.`,
    publishedAt: Date.now() - 1000 * 60 * 60 * 26,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
  },
  {
    videoId: "drvR32mock1",
    title: "Nissan Skyline GT-R R32: the one that started the legend",
    description: `${YOUTUBE_MOCK_MARKER}. An R32 at dusk, Group A history in the background.`,
    publishedAt: Date.now() - 1000 * 60 * 60 * 40,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=80",
  },
  {
    videoId: "drvE46M3mok",
    title: "BMW E46 M3: the last analogue one, still the one",
    description: `${YOUTUBE_MOCK_MARKER}. An E46 M3 through a set of English lanes.`,
    publishedAt: Date.now() - 1000 * 60 * 60 * 54,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    videoId: "drvGoodwood",
    title: "Members' Meeting: the lawn, the noise, the tweed",
    description: `${YOUTUBE_MOCK_MARKER}. Concourse metal and race-bred specials share the same weekend.`,
    publishedAt: Date.now() - 1000 * 60 * 60 * 72,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
  },
];

export function isMockYoutubeVideoId(videoId: string) {
  if (!videoId) return false;
  return MOCK_VIDEOS.some((item) => {
    if (item.videoId === videoId) return true;
    const stem = item.videoId.replace(/x+$/i, "").slice(0, 8);
    return stem.length >= 6 && videoId.includes(stem);
  });
}

export function isMockYoutubeArticle(row: {
  excerpt?: string | null;
  aiSummary?: string | null;
  summary?: string | null;
  title?: string | null;
  canonicalUrl?: string | null;
  url?: string | null;
}) {
  const blob = `${row.excerpt ?? ""} ${row.aiSummary ?? ""} ${row.summary ?? ""}`;
  if (blob.includes(YOUTUBE_MOCK_MARKER)) return true;
  if (row.title && MOCK_VIDEOS.some((item) => item.title === row.title)) return true;
  const videoId =
    parseYoutubeVideoId(row.canonicalUrl ?? "") || parseYoutubeVideoId(row.url ?? "");
  return Boolean(videoId && isMockYoutubeVideoId(videoId));
}
