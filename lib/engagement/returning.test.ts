import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReturningVisitor, mergeFirstDay } from "./returning";

describe("returning visitor", () => {
  it("is a visitor whose first impression day is before the labelled window", () => {
    assert.equal(isReturningVisitor("2026-10-01", "2026-10-18"), true);
    assert.equal(isReturningVisitor("2026-10-18", "2026-10-18"), false);
    assert.equal(isReturningVisitor("2026-10-20", "2026-10-18"), false);
    assert.equal(isReturningVisitor(null, "2026-10-18"), false);
  });

  it("keeps the earliest first-seen day", () => {
    assert.equal(mergeFirstDay("2026-10-10", "2026-10-02"), "2026-10-02");
    assert.equal(mergeFirstDay(undefined, "2026-10-02"), "2026-10-02");
  });
});
