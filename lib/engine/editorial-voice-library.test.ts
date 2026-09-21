import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EDITORIAL_INTERLUDE_CATEGORIES,
  EDITORIAL_VOICE_LIBRARY,
  EDITORIAL_VOICE_SEED_IDS,
  editorialInterludeTypeBreakdown,
  interludesForCategory,
  interludesForTag,
} from "./editorial-voice-library";

describe("editorial voice library", () => {
  it("ships 30–40 curated interludes", () => {
    assert.ok(EDITORIAL_VOICE_LIBRARY.length >= 30);
    assert.ok(EDITORIAL_VOICE_LIBRARY.length <= 40);
    assert.equal(new Set(EDITORIAL_VOICE_LIBRARY.map((item) => item.id)).size, EDITORIAL_VOICE_LIBRARY.length);
  });

  it("keeps all seven seed ids and texts", () => {
    for (const id of EDITORIAL_VOICE_SEED_IDS) {
      const item = EDITORIAL_VOICE_LIBRARY.find((entry) => entry.id === id);
      assert.ok(item, `missing seed ${id}`);
      assert.equal(item?.active, true);
    }
  });

  it("breaks down by editorial type", () => {
    const breakdown = editorialInterludeTypeBreakdown();
    assert.equal(
      Object.values(breakdown).reduce((sum, count) => sum + count, 0),
      EDITORIAL_VOICE_LIBRARY.length,
    );
    assert.equal(breakdown.STATEMENT, 6);
    assert.equal(breakdown.OBSERVATION, 10);
    assert.equal(breakdown.PROVOCATION, 7);
    assert.equal(breakdown.TRANSITION, 5);
    assert.equal(breakdown.SHORT_PUNCH, 5);
    assert.equal(breakdown.EDITORIAL_THOUGHT, 7);
  });

  it("tags with existing categories and interest vocabulary", () => {
    assert.deepEqual([...EDITORIAL_INTERLUDE_CATEGORIES], [
      "cars",
      "culture",
      "driving",
      "events",
      "motorsport",
    ]);
    const driving = interludesForCategory("driving");
    assert.ok(driving.length >= 10);
    const classicTagged = interludesForTag("Classic");
    assert.ok(classicTagged.some((item) => item.id === "some-cars-under-your-skin"));
    const marqueSpecific = EDITORIAL_VOICE_LIBRARY.filter((item) => item.marques?.length);
    assert.ok(marqueSpecific.length >= 1);
    assert.ok(marqueSpecific.length <= 3);
  });

  it("includes broad untagged lines for cross-category use", () => {
    const broad = EDITORIAL_VOICE_LIBRARY.filter(
      (item) => !item.categories?.length && !item.tags?.length,
    );
    assert.ok(broad.length >= 2);
    assert.ok(broad.some((item) => item.id === "desk-never-neutral"));
  });
});
