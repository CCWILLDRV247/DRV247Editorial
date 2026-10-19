import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { shouldSetInterludeCookie } from "./interlude-recent";
import { shouldSetOpenerCookie } from "./opener-recent";
import { selectHomeLead } from "./home-lead";
import type { StoryDto } from "@/lib/stories";

function story(id: number, title = `Story ${id}`): StoryDto {
  return {
    id,
    title,
    summary: "",
    aiSummary: null,
    imageUrl: null,
    imageSources: [],
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: "2026-10-19T00:00:00.000Z",
    hidden: false,
    relevanceExplanation: null,
    category: { id: 0, slug: "cars", name: "Cars" },
    source: { id: 0, name: "Test", type: "rss" },
    desk: null,
  };
}

describe("anonymous CDN cookies", () => {
  it("does not set opener or interlude cookies on default /", () => {
    assert.equal(shouldSetOpenerCookie("/"), false);
    assert.equal(shouldSetInterludeCookie("/"), false);
  });

  it("sets cookies off the default path", () => {
    assert.equal(shouldSetOpenerCookie("/category/cars"), true);
    assert.equal(shouldSetInterludeCookie("/category/cars"), true);
  });

  it("writes last-week opener to localStorage and gates the cookie", () => {
    const src = readFileSync(new URL("../../components/opener-recent-sync.tsx", import.meta.url), "utf8");
    assert.match(src, /localStorage\.setItem\(OPENER_RECENT_STORAGE_KEY/);
    assert.match(src, /shouldSetOpenerCookie\(window\.location\.pathname\)/);
  });

  it("does not call cookies\(\) on the default homepage path", () => {
    const feed = readFileSync(new URL("../../components/magazine/home-feed.tsx", import.meta.url), "utf8");
    assert.match(feed, /if \(!active\)/);
    assert.match(feed, /emptyOpenerRecent\(\)/);
    assert.match(feed, /forYouTestIsActive\(testProfile\)/);
    const category = readFileSync(new URL("../../components/magazine/category-feed.tsx", import.meta.url), "utf8");
    assert.match(category, /testActive\s*\n\s*\? parseOpenerRecent/);
  });
});

describe("home lead split", () => {
  it("picks the first non-pick vehicle story as hero", () => {
    const pick = story(1, "Pick");
    pick.desk = { label: "from-the-desk", labelName: "From the desk", note: null, curator: "Desk", featured: true };
    const lead = selectHomeLead(
      { stories: [pick, story(2, "Lead"), story(3, "Second")] },
      { stories: [story(4, "Interest")] },
      [pick],
    );
    assert.equal(lead.hero?.id, 2);
    assert.deepEqual(
      lead.leadCards.map((item) => item.id),
      [3],
    );
  });

  it("falls back to interests when the vehicle lane is empty", () => {
    const lead = selectHomeLead({ stories: [] }, { stories: [story(9, "Interest")] }, []);
    assert.equal(lead.hero?.id, 9);
    assert.equal(lead.leadCards.length, 0);
  });

  it("streams hero from getMagazineHero behind its own Suspense", () => {
    const feed = readFileSync(new URL("../../components/magazine/home-feed.tsx", import.meta.url), "utf8");
    assert.match(feed, /getMagazineHero/);
    assert.match(feed, /getMagazineHome/);
    assert.match(feed, /<Suspense fallback=\{<HomeHeroFallback \/>\}>/);
    assert.match(feed, /<Suspense fallback=\{<HomeRestFallback \/>\}>/);
    const magazine = readFileSync(new URL("./magazine.ts", import.meta.url), "utf8");
    assert.match(magazine, /export async function getMagazineHero/);
    assert.match(magazine, /loadMagazineHomePlan/);
    assert.match(magazine, /finishMagazineHome/);
    assert.match(magazine, /curateForYouHome/);
    assert.match(magazine, /applyWeeklyHomepageOpening/);
  });
});
