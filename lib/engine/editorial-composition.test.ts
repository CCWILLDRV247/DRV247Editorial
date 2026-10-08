import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOMEPAGE_COMPOSITION, interludeCompositionVariant } from "./editorial-composition";

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
    assert.match(HOMEPAGE_COMPOSITION.picksBandFill, /w-screen/);
    assert.match(HOMEPAGE_COMPOSITION.picksBandFill, /bg-\[#f6f6f6\]/);
  });
});
