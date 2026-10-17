import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  interludeCompositionVariant,
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
    assert.match(MAGAZINE_LAYOUT.reading, /max-w-3xl/);
    assert.match(MAGAZINE_LAYOUT.storyRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.printRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.storyRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.heroHeight, /lg:h-\[420px\]/);
    assert.match(HOMEPAGE_COMPOSITION.sectionTitle, /lg:text-\[40px\]/);
  });
});
