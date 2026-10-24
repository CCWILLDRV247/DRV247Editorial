import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { EditorialDto } from "./queries";
import { KEEP_EXPLORING_MIN, selectKeepExploring } from "./keep-exploring";

function article(partial: Partial<EditorialDto> & Pick<EditorialDto, "id">): EditorialDto {
  return {
    id: partial.id,
    sourceId: "1",
    publication: "Test Pub",
    title: partial.title ?? `Story ${partial.id}`,
    url: "https://example.com/a",
    canonicalUrl: "https://example.com/a",
    author: null,
    publishedAt: partial.publishedAt ?? "2026-10-20T12:00:00.000Z",
    firstSeen: 1,
    lastProcessed: 1,
    imageUrl: null,
    imageSources: [],
    imageStatus: null,
    imageSourceType: null,
    excerpt: partial.excerpt ?? "Excerpt",
    editorialScore: 1,
    vehicleRelevanceScore: 1,
    rankScore: partial.rankScore ?? 50,
    ingestionMethod: "rss",
    aiSummary: null,
    makes: partial.makes ?? [],
    models: partial.models ?? [],
    generations: [],
    variants: [],
    categories: partial.categories ?? [],
    interests: partial.interests ?? [],
    locations: [],
    duplicateGroupId: partial.duplicateGroupId ?? null,
    primaryCategory: partial.primaryCategory ?? "cars",
    primaryConfidence: 80,
    classification: null,
    related: [],
    why: partial.why ?? [],
    rankSignals: [],
    vehicleTier: partial.vehicleTier ?? "none",
    desk: null,
    drvRelevance: 1,
    userRelevance: 1,
    passedQualityGate: true,
    relevanceGateNote: "",
    qualityBand: partial.qualityBand ?? "eligible",
    qualityReason: "",
    showInPrimaryFeed: partial.showInPrimaryFeed ?? true,
    qualityAutomotiveScore: 1,
    editorialEligible: partial.editorialEligible ?? true,
    editorialExclusionReason: null,
  };
}

describe("selectKeepExploring", () => {
  it("prefers shared topics before editorial fallback and excludes the current article", () => {
    const current = article({
      id: 1,
      interests: ["Classic"],
      makes: ["Ferrari"],
      primaryCategory: "cars",
    });
    const pool = [
      current,
      article({ id: 2, interests: ["Classic"], rankScore: 90, title: "Shared topic" }),
      article({ id: 3, rankScore: 99, title: "Generic top rank" }),
    ];
    const picks = selectKeepExploring(current, pool);
    assert.ok(picks.length >= KEEP_EXPLORING_MIN);
    assert.equal(picks[0]?.id, 2);
    assert.equal(picks[0]?.reason, "shared-topic");
    assert.ok(!picks.some((pick) => pick.id === 1));
  });

  it("dedupes duplicate groups and omits the section when fewer than two picks qualify", () => {
    const current = article({ id: 10, interests: ["Track"] });
    const pool = [
      current,
      article({
        id: 11,
        duplicateGroupId: "dup-a",
        interests: ["Track"],
        title: "Syndicated A",
      }),
      article({
        id: 12,
        duplicateGroupId: "dup-a",
        interests: ["Track"],
        title: "Syndicated B",
      }),
    ];
    const picks = selectKeepExploring(current, pool);
    assert.deepEqual(picks, []);
  });

  it("does not activate Phase 3B or add recommendation labels in the story article", () => {
    const phase3b = readFileSync(new URL("../engagement/phase-3b.ts", import.meta.url), "utf8");
    assert.match(phase3b, /DRV247_PHASE_3B/);
    const story = readFileSync(
      new URL("../../components/magazine/story-article.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(story.includes("Recommended for You"), false);
    assert.equal(story.includes("KeepExploringSection"), true);
    const exploring = readFileSync(
      new URL("../../components/magazine/keep-exploring-section.tsx", import.meta.url),
      "utf8",
    );
    assert.match(exploring, /IntersectionObserver/);
    assert.equal(exploring.includes("Recommended"), false);
  });
});
