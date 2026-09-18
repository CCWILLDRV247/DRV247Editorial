import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUsableArticleImage } from "../text";
import {
  displayImageUrls,
  interpretImageHeaders,
  mergeImageMetadata,
  parseImagePayload,
  pickBestImage,
  rankImageCandidates,
  selectPrimaryImage,
  validateImageUrl,
} from "./images";

describe("image ranking", () => {
  it("picks RSS media over enclosure, og, twitter, and article images", () => {
    const best = pickBestImage([
      { url: "https://cdn.example.com/body.jpg", sourceType: "article" },
      { url: "https://cdn.example.com/og.jpg", sourceType: "og" },
      { url: "https://cdn.example.com/enclosure.jpg", sourceType: "rss_enclosure" },
      { url: "https://cdn.example.com/media.jpg", sourceType: "rss_media" },
      { url: "https://cdn.example.com/twitter.jpg", sourceType: "twitter" },
      { url: "https://cdn.example.com/itunes.jpg", sourceType: "publication" },
    ]);
    assert.equal(best?.url, "https://cdn.example.com/media.jpg");
    assert.equal(best?.sourceType, "rss_media");
  });

  it("keeps enclosure above open graph when the feed has no media tag", () => {
    const ranked = rankImageCandidates([
      { url: "https://cdn.example.com/og.jpg", sourceType: "og" },
      { url: "https://cdn.example.com/enclosure.jpg", sourceType: "rss_enclosure" },
    ]);
    assert.equal(ranked[0]?.url, "https://cdn.example.com/enclosure.jpg");
  });

  it("dedupes the same URL and keeps the better source type", () => {
    const ranked = rankImageCandidates([
      { url: "https://cdn.example.com/hero.jpg", sourceType: "article" },
      { url: "https://cdn.example.com/hero.jpg", sourceType: "og" },
    ]);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.sourceType, "og");
  });
});

describe("image validation", () => {
  it("rejects html, tiny pixels, and forbidden hotlink responses", () => {
    assert.equal(
      interpretImageHeaders("https://cdn.example.com/gone.jpg", {
        ok: true,
        status: 200,
        contentType: "text/html",
        contentLength: 8000,
        finalUrl: "https://cdn.example.com/login",
      }).reason,
      "not_image",
    );
    assert.equal(
      interpretImageHeaders("https://cdn.example.com/pixel.jpg", {
        ok: true,
        status: 200,
        contentType: "image/gif",
        contentLength: 40,
        finalUrl: "https://cdn.example.com/pixel.jpg",
      }).reason,
      "too_small",
    );
    assert.equal(
      interpretImageHeaders("https://cdn.example.com/hero.jpg", {
        ok: false,
        status: 403,
        contentType: "image/jpeg",
        contentLength: 80_000,
        finalUrl: "https://cdn.example.com/hero.jpg",
      }).reason,
      "hotlink_or_forbidden",
    );
  });

  it("accepts a jpeg with a redirect to another image URL", () => {
    const result = interpretImageHeaders("https://cdn.example.com/old.jpg", {
      ok: true,
      status: 200,
      contentType: "image/jpeg",
      contentLength: 48_000,
      finalUrl: "https://cdn.example.com/new.jpg",
    });
    assert.equal(result.ok, true);
    assert.equal(result.finalUrl, "https://cdn.example.com/new.jpg");
  });

  it("tries the next source after a broken primary", async () => {
    const payload = await selectPrimaryImage(
      [
        { url: "https://cdn.example.com/broken.jpg", sourceType: "og" },
        { url: "https://cdn.example.com/ok.jpg", sourceType: "twitter" },
      ],
      {
        fetchHeaders: async (url) =>
          url.includes("broken")
            ? {
                ok: false,
                status: 404,
                contentType: "",
                contentLength: null,
                finalUrl: url,
              }
            : {
                ok: true,
                status: 200,
                contentType: "image/jpeg",
                contentLength: 20_000,
                finalUrl: url,
              },
      },
    );
    assert.equal(payload.primary, "https://cdn.example.com/ok.jpg");
    assert.equal(payload.sourceType, "twitter");
    assert.equal(payload.sources[0]?.status, "failed");
    assert.equal(payload.sources[1]?.status, "ok");
  });

  it("falls back to a missing payload when every source fails", async () => {
    const payload = await selectPrimaryImage([{ url: "https://cdn.example.com/gone.jpg", sourceType: "og" }], {
      fetchHeaders: async (url) => ({
        ok: false,
        status: 0,
        contentType: "",
        contentLength: null,
        finalUrl: url,
      }),
    });
    assert.equal(payload.primary, null);
    assert.equal(payload.status, "failed");
    assert.equal(payload.fallback, "drv247");
  });

  it("caches validation so ingest does not refetch the same URL", async () => {
    let calls = 0;
    const fetchHeaders = async (url: string) => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        contentType: "image/jpeg",
        contentLength: 12_000,
        finalUrl: url,
      };
    };
    await validateImageUrl("https://cdn.example.com/cached.jpg", { fetchHeaders, now: 1 });
    await validateImageUrl("https://cdn.example.com/cached.jpg", { fetchHeaders, now: 2 });
    assert.equal(calls, 1);
  });
});

describe("image payload", () => {
  it("round-trips structured sources through article metadata", () => {
    const encoded = mergeImageMetadata('{"duplicateKey":"Autocar::Dodge"}', {
      primary: "https://cdn.example.com/hero.jpg",
      sources: [
        { url: "https://cdn.example.com/hero.jpg", sourceType: "og", status: "ok" },
        { url: "https://cdn.example.com/alt.jpg", sourceType: "article", status: "pending" },
      ],
      fallback: "drv247",
      status: "ok",
      lastValidated: 100,
      sourceType: "og",
    });
    const parsed = parseImagePayload(encoded);
    assert.equal(parsed?.primary, "https://cdn.example.com/hero.jpg");
    assert.equal(parsed?.sources.length, 2);
    assert.deepEqual(displayImageUrls(null, parsed), [
      "https://cdn.example.com/hero.jpg",
      "https://cdn.example.com/alt.jpg",
    ]);
  });

  it("skips tracking pixels and theme chrome before they are stored", () => {
    assert.equal(isUsableArticleImage("https://cdn.example.com/tracking/pixel.gif"), false);
    assert.equal(isUsableArticleImage("https://cdn.example.com/spacer.gif"), false);
    assert.equal(isUsableArticleImage("https://cdn.example.com/hero.jpg?w=1&h=1"), false);
    assert.equal(
      isUsableArticleImage(
        "https://bonnetmagazine.com/cdn/fonts/assistant/assistant_n4.9120912a469cad1cc292572851508ca49d12e768.woff2",
      ),
      false,
    );
    assert.equal(
      isUsableArticleImage("https://www.timeattack.co.uk/wp-content/uploads/2026/01/ta-2026.png"),
      false,
    );
    assert.equal(
      isUsableArticleImage("https://www.timeattack.co.uk/wp-content/uploads/2026/09/Volkov.jpg"),
      true,
    );
    assert.equal(isUsableArticleImage("https://cdn.example.com/uploads/964.jpg"), true);
  });
});
