import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  forYouSectionIndices,
  interludeCompositionVariant,
  sectionIndexLabel,
} from "./editorial-composition";

describe("editorial composition", () => {
  it("assigns the strongest variant to before-categories", () => {
    assert.equal(interludeCompositionVariant("before-categories", "STATEMENT"), "statement");
  });

  it("uses different variants across homepage slots", () => {
    const variants = new Set([
      interludeCompositionVariant("before-categories", "OBSERVATION"),
      interludeCompositionVariant("after-picks", "OBSERVATION"),
      interludeCompositionVariant("mid-categories", "OBSERVATION"),
    ]);
    assert.ok(variants.size >= 2);
  });

  it("elevates provocation and short punch in the mid rail pause", () => {
    assert.equal(interludeCompositionVariant("mid-categories", "PROVOCATION"), "accent");
    assert.equal(interludeCompositionVariant("mid-categories", "SHORT_PUNCH"), "accent");
  });

  it("paints Picks as a full-width light grey band", () => {
    assert.match(HOMEPAGE_COMPOSITION.picksBand, /bg-\[#f6f6f6\]/);
    assert.match(HOMEPAGE_COMPOSITION.picksBand, /shadow-\[100vw_0_0_0_#f6f6f6/);
  });

  it("keeps a desktop reading measure and one rail scale", () => {
    assert.match(MAGAZINE_LAYOUT.page, /lg:max-w-\[1080px\]/);
    assert.match(MAGAZINE_LAYOUT.page, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.reading, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.header, /lg:px-8/);
    assert.match(MAGAZINE_LAYOUT.gutter, /lg:px-0/);
    assert.doesNotMatch(MAGAZINE_LAYOUT.page, /lg:px-8/);
    assert.match(MAGAZINE_LAYOUT.storyRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.printRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.storyRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.picksInner, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.featuredPick, /^block$/);
    assert.match(MAGAZINE_LAYOUT.heroHeight, /lg:h-\[420px\]/);
    assert.match(MAGAZINE_LAYOUT.posterHeight, /lg:h-\[min\(78vh,720px\)\]/);
    assert.match(MAGAZINE_LAYOUT.sectionKicker, /hidden/);
    assert.match(MAGAZINE_LAYOUT.sectionKicker, /lg:inline-flex/);
    assert.match(HOMEPAGE_COMPOSITION.sectionTitle, /lg:text-\[40px\]/);
  });

  it("numbers section kickers as /01 /02", () => {
    assert.equal(sectionIndexLabel(1), "/01");
    assert.equal(sectionIndexLabel(12), "/12");
  });

  it("assigns For You kickers in render order and skips empty blocks", () => {
    const full = forYouSectionIndices({
      interests: true,
      firstInterlude: true,
      picks: true,
      print: true,
      remainingInterludeCount: 1,
      carouselSlots: [
        { hasLane: true, hasMidInterlude: true },
        { hasLane: true, hasMidInterlude: false },
      ],
      beforeViewAll: true,
    });
    assert.equal(full.interests, 1);
    assert.equal(full.firstInterlude, 2);
    assert.equal(full.picks, 3);
    assert.equal(full.print, 4);
    assert.deepEqual(full.remainingInterludes, [5]);
    assert.deepEqual(full.carousels, [
      { lane: 6, midInterlude: 7 },
      { lane: 8, midInterlude: undefined },
    ]);
    assert.equal(full.beforeViewAll, 9);

    const sparse = forYouSectionIndices({
      interests: false,
      firstInterlude: false,
      picks: true,
      print: false,
      remainingInterludeCount: 0,
      carouselSlots: [{ hasLane: false, hasMidInterlude: true }],
      beforeViewAll: false,
    });
    assert.equal(sparse.picks, 1);
    assert.deepEqual(sparse.carousels, [{ lane: undefined, midInterlude: 2 }]);
    assert.equal(sparse.interests, undefined);
  });
});
