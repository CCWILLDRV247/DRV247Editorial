import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  communitySectionCopy,
  copyClaimsTrending,
  evaluateTrendingGate,
  TRENDING_FLOORS,
} from "./trending";

function rows(count: number, event = "interested") {
  return Array.from({ length: count }, (_, index) => ({
    event,
    articleId: (index % 3) + 1,
    visitorKey: `visitor-${index}`,
  }));
}

describe("trending gate", () => {
  it("falls back to discover when data is thin and never claims trending", () => {
    const snapshot = evaluateTrendingGate([
      { event: "interested", articleId: 1, visitorKey: "a" },
      { event: "save", articleId: 1, visitorKey: "b" },
    ]);
    assert.equal(snapshot.mode, "discover");
    assert.equal(snapshot.articles.length, 0);
    assert.match(snapshot.reason, /thin data/);
    const copy = communitySectionCopy(snapshot.mode);
    assert.equal(copyClaimsTrending(copy.heading), false);
    assert.equal(copyClaimsTrending(copy.dek), false);
    assert.equal(copy.heading, "Discover");
  });

  it("opens trending only when every floor passes", () => {
    const snapshot = evaluateTrendingGate(rows(24, "interested"));
    assert.ok(snapshot.observed.uniqueVisitors >= TRENDING_FLOORS.uniqueVisitors);
    assert.ok(snapshot.observed.positiveEvents >= TRENDING_FLOORS.positiveEvents);
    assert.equal(snapshot.mode, "trending");
    assert.ok(snapshot.articles.length >= TRENDING_FLOORS.distinctScoredArticles);
    const copy = communitySectionCopy(snapshot.mode);
    assert.equal(copy.heading, "Trending with enthusiasts");
    assert.match(copy.dek, /interested marks, saves, and shares/);
  });

  it("ignores story_open when scoring", () => {
    const snapshot = evaluateTrendingGate(
      Array.from({ length: 20 }, (_, index) => ({
        event: "story_open",
        articleId: 1,
        visitorKey: `v-${index}`,
      })),
    );
    assert.equal(snapshot.mode, "discover");
    assert.equal(snapshot.observed.positiveEvents, 0);
  });
});
