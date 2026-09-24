import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { classifyArticle } from "./classify";
import { isVideoStory } from "./video-story";
import { youtubeVideosToEngineItems } from "./adapters/youtube";
import { isIngestibleMediaSource } from "./youtube-sources";
import {
  canonicalizeYoutubeWatchUrl,
  editorialSourceRelevance,
  ingestYoutubeChannel,
  isMockYoutubeArticle,
  isYoutubeMediaSource,
  isYoutubeWatchUrl,
  mediaSourceIdForChannel,
  parseYoutubeChannelInput,
  parseYoutubeVideoId,
  youtubeMaxResults,
  youtubeWatchUrl,
} from "./youtube";
import { explainArticle, loadRankWeights } from "./rank";
import { evaluateRelevanceEngine } from "./relevance-engine";
import { evaluateQualityFilter } from "./quality-filter";
import { curateForYouHome } from "./for-you-home";
import { FOR_YOU_DEMO_PROFILES } from "./for-you-test";
import { contextFromTestProfile } from "./personalize";
import type { MediaSource } from "@/lib/db/schema";

const previousKey = process.env.YOUTUBE_API_KEY;
const previousMax = process.env.YOUTUBE_MAX_RESULTS;

afterEach(() => {
  if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = previousKey;
  if (previousMax === undefined) delete process.env.YOUTUBE_MAX_RESULTS;
  else process.env.YOUTUBE_MAX_RESULTS = previousMax;
});

function source(partial: Partial<MediaSource>): MediaSource {
  return {
    id: "auto_001",
    publication: "Bonnet",
    country: "UK",
    url: "https://readbonnet.com",
    rssUrl: "https://readbonnet.com/feed",
    websiteAvailable: true,
    scrapeDifficulty: "easy",
    editorialCategory: "Culture",
    marquesCovered: "various",
    relevance: "high",
    csvEnabled: true,
    enabled: true,
    sourceType: "rss",
    rssVerifiedStatus: "ok",
    rssConfidence: "high",
    priority: 1,
    maxArticles: 8,
    allowExcerpt: true,
    allowImage: true,
    lastSuccessAt: null,
    lastFailureAt: null,
    failureCount: 0,
    lastHttpStatus: null,
    lastError: null,
    lastMethod: null,
    lastArticleCount: 0,
    channelId: null,
    ...partial,
  };
}

describe("youtube channel parse", () => {
  it("accepts UC channel IDs, @handles, and channel URLs", () => {
    const id = parseYoutubeChannelInput("UC1234567890123456789012");
    assert.equal("error" in id ? null : id.kind, "channelId");
    const handle = parseYoutubeChannelInput("@Petrolicious");
    assert.equal("error" in handle ? null : handle.value, "@Petrolicious");
    const url = parseYoutubeChannelInput("https://www.youtube.com/@Petrolicious");
    assert.equal("error" in url ? null : url.value, "@Petrolicious");
    const channelUrl = parseYoutubeChannelInput(
      "https://www.youtube.com/channel/UC1234567890123456789012",
    );
    assert.equal("error" in channelUrl ? null : channelUrl.value, "UC1234567890123456789012");
  });

  it("rejects scrapes, watch URLs, and empty input", () => {
    assert.equal("error" in parseYoutubeChannelInput(""), true);
    assert.equal("error" in parseYoutubeChannelInput("https://example.com/cars"), true);
    assert.equal(
      "error" in parseYoutubeChannelInput("https://www.youtube.com/watch?v=dQw4w9wgWcQ"),
      true,
    );
  });
});

describe("youtube watch URLs", () => {
  it("always canonicalises to youtube.com/watch?v=", () => {
    assert.equal(youtubeWatchUrl("dQw4w9wgWcQ"), "https://www.youtube.com/watch?v=dQw4w9wgWcQ");
    assert.equal(
      canonicalizeYoutubeWatchUrl("https://youtu.be/dQw4w9wgWcQ"),
      "https://www.youtube.com/watch?v=dQw4w9wgWcQ",
    );
    assert.equal(parseYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9wgWcQ"), "dQw4w9wgWcQ");
    assert.equal(isYoutubeWatchUrl("https://www.youtube.com/watch?v=dQw4w9wgWcQ"), true);
    assert.equal(isYoutubeWatchUrl("https://readbonnet.com/story"), false);
  });
});

describe("youtube ingest mock", () => {
  it("returns mock videos when YOUTUBE_API_KEY is missing", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const result = await ingestYoutubeChannel("@Petrolicious", { titleHint: "Petrolicious" });
    assert.equal(result.usedMock, true);
    assert.ok(result.items.length >= 3);
    assert.match(result.items[0].title, /Ferrari F355|Porsche 964|Skyline|M3|Members/);
    const items = youtubeVideosToEngineItems(result.items);
    assert.ok(items.every((item) => item.method === "youtube"));
    assert.ok(items.every((item) => item.canonicalUrl.startsWith("https://www.youtube.com/watch?v=")));
  });

  it("keeps mock videos unique per channel so two sources do not collide", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const a = await ingestYoutubeChannel("@Petrolicious");
    const b = await ingestYoutubeChannel("@Hagerty");
    assert.notEqual(a.items[0].videoId, b.items[0].videoId);
    const ids = a.items.map((item) => item.videoId);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => id.length === 11));
  });

  it("flags placeholder mock videos so they can be purged from the feed", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const result = await ingestYoutubeChannel("@Petrolicious");
    const item = youtubeVideosToEngineItems(result.items)[0];
    assert.equal(isMockYoutubeArticle(item), true);
    assert.equal(
      isMockYoutubeArticle({
        title: "A Ferrari F355 on the autostrada, filmed properly",
        excerpt: "Mock local fallback while YOUTUBE_API_KEY is unset.",
        canonicalUrl: "https://www.youtube.com/watch?v=aqdrvF355mo",
      }),
      true,
    );
    assert.equal(
      isMockYoutubeArticle({
        title: "The Coastal Road: Proteus Jaguar D-Type",
        excerpt: "No roof. No windscreen on the passenger side.",
        canonicalUrl: "https://www.youtube.com/watch?v=poDVIycl7SU",
      }),
      false,
    );
  });
});

describe("youtube source filter", () => {
  it("lets enabled YouTube sources through without adding them to the RSS wave list", () => {
    const youtube = source({
      id: "yt_petrolicious",
      sourceType: "youtube",
      url: "https://www.youtube.com/@Petrolicious",
      channelId: "@Petrolicious",
    });
    assert.equal(isYoutubeMediaSource(youtube), true);
    assert.equal(isIngestibleMediaSource(youtube), true);
    assert.equal(isIngestibleMediaSource({ ...youtube, enabled: false }), false);
    assert.equal(isIngestibleMediaSource(source({ id: "auto_999_not_enabled" })), false);
    assert.equal(isIngestibleMediaSource(source({ id: "auto_001" })), true);
  });

  it("keeps a failed YouTube id from blocking a second YouTube or RSS source", () => {
    const failed = source({
      id: "yt_bad",
      sourceType: "youtube",
      enabled: true,
      url: "https://www.youtube.com/@Nope",
    });
    const other = source({
      id: "yt_good",
      sourceType: "youtube",
      enabled: true,
      url: "https://www.youtube.com/@Petrolicious",
    });
    const rss = source({ id: "auto_001" });
    const selected = [failed, other, rss].filter((row) => isIngestibleMediaSource(row));
    assert.deepEqual(
      selected.map((row) => row.id),
      ["yt_bad", "yt_good", "auto_001"],
    );
  });
});

describe("youtube cards", () => {
  it("marks watch URLs and youtube sources as video", () => {
    assert.equal(
      isVideoStory({
        source: { type: "youtube" },
        canonicalUrl: "https://www.youtube.com/watch?v=drvF355mock",
      }),
      true,
    );
    assert.equal(
      isVideoStory({
        source: { type: "rss" },
        canonicalUrl: "https://readbonnet.com/story",
      }),
      false,
    );
  });
});

describe("youtube taxonomy", () => {
  it("tags YouTube items as Video without a new classifier", () => {
    const classified = classifyArticle(
      "A Ferrari F355 on the autostrada, filmed properly",
      "Evening light and the road south of Milan.",
      "",
      "Petrolicious",
      "video",
    );
    assert.ok(classified.contentTypes.some((row) => row.name === "Video"));
    assert.ok(classified.makes.includes("Ferrari"));
    assert.ok(classified.models.includes("F355"));
  });
});

describe("youtube For You ranking", () => {
  const weights = loadRankWeights();

  function videoQuality(input: {
    makes: string[];
    models: string[];
    excerpt: string;
    relevance: string;
    profile: (typeof FOR_YOU_DEMO_PROFILES)[keyof typeof FOR_YOU_DEMO_PROFILES];
    contentTypes?: string[];
  }) {
    const personal = contextFromTestProfile(input.profile);
    const meta = {
      makes: input.makes,
      models: input.models,
      generations: [] as string[],
      variants: [] as string[],
      interests: ["Classic"],
      categories: ["Classic"],
      locations: [] as string[],
      excerpt: input.excerpt,
      relevance: editorialSourceRelevance({
        relevance: input.relevance,
        sourceType: "youtube",
      }),
      vehicles: personal.vehicles,
      userInterests: personal.interests,
      publishedAt: Date.now() - 1000 * 60 * 60 * 8,
      primaryCategory: "culture",
      contentTypes: input.contentTypes ?? ["Video"],
      deskPick: false,
    };
    const breakdown = explainArticle(meta, weights);
    const engine = evaluateRelevanceEngine(breakdown, meta, weights);
    const quality = evaluateQualityFilter(engine, meta, weights);
    return { breakdown, engine, quality, meta };
  }

  it("maps desk-added high relevance onto the Good RSS band, not base 8", () => {
    assert.equal(
      editorialSourceRelevance({ relevance: "high", sourceType: "youtube" }),
      "Good",
    );
    assert.equal(
      editorialSourceRelevance({ relevance: "Excellent: culture", sourceType: "youtube" }),
      "Excellent: culture",
    );
    assert.equal(
      editorialSourceRelevance({ relevance: "high", sourceType: "rss", url: "https://readbonnet.com" }),
      "high",
    );
  });

  it("lets a vehicle-tagged YouTube film into the For You primary mix", () => {
    const ferrari = videoQuality({
      makes: ["Ferrari"],
      models: ["F355"],
      excerpt: "No roof. No windscreen. A long-stroke Jaguar six, filmed on the coast.",
      relevance: "high",
      profile: FOR_YOU_DEMO_PROFILES.A,
    });
    assert.equal(ferrari.engine.passedQualityGate, true);
    assert.notEqual(ferrari.quality.band, "excluded");
    assert.equal(ferrari.quality.showInPrimaryFeed, true);

    const rssHigh = videoQuality({
      makes: ["Ferrari"],
      models: ["F355"],
      excerpt: "No roof. No windscreen. A long-stroke Jaguar six, filmed on the coast.",
      relevance: "high",
      profile: FOR_YOU_DEMO_PROFILES.A,
    });
    // editorialSourceRelevance already mapped; compare raw RSS high via engine with unmapped relevance
    const rawRss = explainArticle(
      { ...ferrari.meta, relevance: "high", contentTypes: ["Feature"] },
      weights,
    );
    const rawEngine = evaluateRelevanceEngine(rawRss, { ...ferrari.meta, relevance: "high" }, weights);
    assert.ok(ferrari.engine.drvRelevance > rawEngine.drvRelevance);
  });

  it("keeps A–D different: Ferrari video is for-your-car on A, not on C", () => {
    const ferrari = videoQuality({
      makes: ["Ferrari"],
      models: ["F355"],
      excerpt: "Pacific Coast Highway. Proteus Jaguar D-Type and a Ferrari in the cut.",
      relevance: "high",
      profile: FOR_YOU_DEMO_PROFILES.A,
    });
    const skyline = videoQuality({
      makes: ["Nissan"],
      models: ["Skyline"],
      excerpt: "An R32 at dusk, Group A history in the background, no narration.",
      relevance: "high",
      profile: FOR_YOU_DEMO_PROFILES.C,
    });
    const candidate = (
      id: number,
      title: string,
      result: ReturnType<typeof videoQuality>,
      makes: string[],
      models: string[],
    ) => ({
      id,
      title,
      publication: "Petrolicious",
      makes,
      models,
      interests: ["Classic"],
      categories: ["Classic"],
      why: result.breakdown.reasons,
      vehicleTier: result.breakdown.vehicleTier,
      duplicateGroupId: null,
      rankScore: result.breakdown.score,
      imageUrl: "https://i.ytimg.com/vi/example/hqdefault.jpg",
      showInPrimaryFeed: result.quality.showInPrimaryFeed,
      qualityBand: result.quality.band,
    });
    const a = curateForYouHome(
      [
        candidate(1, "The Coastal Road: Ferrari F355", ferrari, ["Ferrari"], ["F355"]),
        candidate(2, "Nissan Skyline GT-R R32", skyline, ["Nissan"], ["Skyline"]),
      ],
      FOR_YOU_DEMO_PROFILES.A,
    );
    const c = curateForYouHome(
      [
        candidate(1, "The Coastal Road: Ferrari F355", ferrari, ["Ferrari"], ["F355"]),
        candidate(2, "Nissan Skyline GT-R R32", skyline, ["Nissan"], ["Skyline"]),
      ],
      FOR_YOU_DEMO_PROFILES.C,
    );
    assert.ok(a.forYourCar.stories.some((row) => row.id === 1));
    assert.ok(c.forYourCar.stories.some((row) => row.id === 2));
    assert.notDeepEqual(
      a.forYourCar.stories.map((row) => row.id),
      c.forYourCar.stories.map((row) => row.id),
    );
  });
});

describe("youtube config", () => {
  it("caps recent count at 50 and prefers the env override", () => {
    delete process.env.YOUTUBE_MAX_RESULTS;
    assert.equal(youtubeMaxResults(8), 8);
    process.env.YOUTUBE_MAX_RESULTS = "12";
    assert.equal(youtubeMaxResults(8), 12);
    process.env.YOUTUBE_MAX_RESULTS = "99";
    assert.equal(youtubeMaxResults(8), 50);
    assert.equal(mediaSourceIdForChannel("UC1234567890123456789012"), "yt_UC1234567890123456789012");
  });
});
