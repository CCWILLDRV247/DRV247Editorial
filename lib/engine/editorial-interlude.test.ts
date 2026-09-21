import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EDITORIAL_INTERLUDES,
  HOMEPAGE_INTERLUDE_SLOTS,
  getEditorialInterlude,
  interludeForHomepageSlot,
  interludeFromText,
  listActiveEditorialInterludes,
} from "./editorial-interlude";
import {
  EDITORIAL_VOICE_SEED_IDS,
  editorialInterludeTypeBreakdown,
} from "./editorial-voice-library";

describe("editorial interlude", () => {
  it("keeps THE TRUTH SHALL SET YOU FREE as the first seed entry", () => {
    assert.equal(EDITORIAL_INTERLUDES[0]?.id, "truth-shall-set-you-free");
    assert.equal(EDITORIAL_INTERLUDES[0]?.text, "THE TRUTH SHALL SET YOU FREE");
    assert.equal(EDITORIAL_INTERLUDES[0]?.type, "STATEMENT");
  });

  it("preserves the seven Task 1 seed lines at the head of the library", () => {
    assert.deepEqual(
      EDITORIAL_INTERLUDES.slice(0, 7).map((item) => item.id),
      [...EDITORIAL_VOICE_SEED_IDS],
    );
  });

  it("keeps the truth line as the legacy default id for before-categories", () => {
    assert.equal(HOMEPAGE_INTERLUDE_SLOTS["before-categories"], "truth-shall-set-you-free");
    const interlude = interludeForHomepageSlot("before-categories");
    assert.equal(interlude?.text, "THE TRUTH SHALL SET YOU FREE");
  });

  it("looks up interludes by id and maps legacy copy text", () => {
    assert.equal(getEditorialInterlude("garage-to-grid")?.type, "TRANSITION");
    assert.equal(
      interludeFromText("THE TRUTH SHALL SET YOU FREE").id,
      "truth-shall-set-you-free",
    );
  });

  it("lists active interludes by priority", () => {
    const active = listActiveEditorialInterludes();
    assert.ok(active.every((item) => item.active));
    assert.equal(active[0]?.id, "truth-shall-set-you-free");
  });
});
