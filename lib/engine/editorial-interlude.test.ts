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

describe("editorial interlude", () => {
  it("keeps THE TRUTH SHALL SET YOU FREE as the first seed entry", () => {
    assert.equal(EDITORIAL_INTERLUDES[0]?.id, "truth-shall-set-you-free");
    assert.equal(EDITORIAL_INTERLUDES[0]?.text, "THE TRUTH SHALL SET YOU FREE");
    assert.equal(EDITORIAL_INTERLUDES[0]?.type, "STATEMENT");
  });

  it("ships the curated example set from the brief", () => {
    assert.equal(EDITORIAL_INTERLUDES.length, 7);
    assert.deepEqual(
      EDITORIAL_INTERLUDES.map((item) => item.text),
      [
        "THE TRUTH SHALL SET YOU FREE",
        "SOME CARS JUST GET UNDER YOUR SKIN.",
        "HOW MUCH POWER IS TOO MUCH?",
        "THE BEST BUILDS ARE NEVER FINISHED.",
        "FROM THE GARAGE TO THE GRID.",
        "MORE. LOUDER. FASTER.",
        "SOME CARS ARE BUILT TO BE DRIVEN. OTHERS ARE BUILT TO BE REMEMBERED.",
      ],
    );
  });

  it("resolves homepage before-categories slot to the truth interlude", () => {
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
