import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRV247_USER_INTERESTS,
  canonicalInterest,
  normalizeInterestList,
} from "./interest-taxonomy";

describe("interest taxonomy", () => {
  it("maps legacy editorial tokens to Chris-verified product labels", () => {
    assert.equal(canonicalInterest("Classic"), "Classic");
    assert.equal(canonicalInterest("Classics"), "Classic");
    assert.equal(canonicalInterest("Air-cooled"), "Aircooled");
    assert.equal(canonicalInterest("Tuning"), "Tunning");
    assert.equal(canonicalInterest("Drift"), "Drifting");
    assert.equal(canonicalInterest("Collector Cars"), "Classic");
    assert.equal(canonicalInterest("Car Culture"), "Styling");
    assert.equal(canonicalInterest("Road Trips"), "Camper/Bus");
  });

  it("dedupes normalized interest lists", () => {
    assert.deepEqual(
      normalizeInterestList(["Classic", "Classics", "collector", "NotAThing"]),
      ["Classic"],
    );
  });

  it("exposes the verified app filter vocabulary", () => {
    assert.ok(DRV247_USER_INTERESTS.includes("Aircooled"));
    assert.ok(DRV247_USER_INTERESTS.includes("Tunning"));
    assert.equal(DRV247_USER_INTERESTS.length, 23);
  });
});
