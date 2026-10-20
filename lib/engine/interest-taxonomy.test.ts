import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRV247_USER_INTERESTS,
  canonicalInterest,
  normalizeInterestList,
} from "./interest-taxonomy";

describe("interest taxonomy", () => {
  it("maps legacy editorial and product synonyms to canonical labels", () => {
    assert.equal(canonicalInterest("Classic"), "Classics");
    assert.equal(canonicalInterest("classics"), "Classics");
    assert.equal(canonicalInterest("Collector Cars"), "Collecting");
    assert.equal(canonicalInterest("Design"), "Automotive Design");
    assert.equal(canonicalInterest("Culture"), "Car Culture");
    assert.equal(canonicalInterest("Engine Swaps"), "Modified");
    assert.equal(canonicalInterest("sports_cars"), "Sports Cars");
  });

  it("dedupes normalized interest lists", () => {
    assert.deepEqual(
      normalizeInterestList(["Classic", "Classics", "collector", "NotAThing"]),
      ["Classics", "Collecting"],
    );
  });

  it("exposes the product filter vocabulary", () => {
    assert.ok(DRV247_USER_INTERESTS.includes("Classics"));
    assert.ok(DRV247_USER_INTERESTS.includes("Air-cooled"));
    assert.equal(DRV247_USER_INTERESTS.length, 25);
  });
});
