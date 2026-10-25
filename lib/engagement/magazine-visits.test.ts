import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPERIENCE_FEEDBACK_MIN_VISITS,
  isExperienceFeedbackVisitEligible,
  nextMagazineVisitCount,
  parseMagazineVisitCount,
} from "./magazine-visits";
import { shouldShowExperienceFeedback } from "./feedback";
import { EXPERIENCE_FEEDBACK_MIN_DWELL_MS } from "./feedback";

describe("magazine visit counting", () => {
  it("parses stored counts and ignores junk", () => {
    assert.equal(parseMagazineVisitCount(null), 0);
    assert.equal(parseMagazineVisitCount(""), 0);
    assert.equal(parseMagazineVisitCount("2"), 2);
    assert.equal(parseMagazineVisitCount("-1"), 0);
    assert.equal(parseMagazineVisitCount("nope"), 0);
  });

  it("increments once per session", () => {
    assert.equal(nextMagazineVisitCount(0, false), 1);
    assert.equal(nextMagazineVisitCount(1, false), 2);
    assert.equal(nextMagazineVisitCount(2, true), 2);
  });

  it("requires the third session before experience feedback is visit-eligible", () => {
    assert.equal(EXPERIENCE_FEEDBACK_MIN_VISITS, 3);
    assert.equal(isExperienceFeedbackVisitEligible(1), false);
    assert.equal(isExperienceFeedbackVisitEligible(2), false);
    assert.equal(isExperienceFeedbackVisitEligible(3), true);
    assert.equal(isExperienceFeedbackVisitEligible(4), true);
  });
});

describe("experience feedback visit gate", () => {
  const engaged = {
    firstPaint: false,
    dwellMs: EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
    scrolledPast: false,
    explicitEngage: false,
    alreadyResponded: false,
  };

  it("stays hidden on the first and second visits even when engaged", () => {
    assert.equal(shouldShowExperienceFeedback({ ...engaged, visitCount: 1 }), false);
    assert.equal(shouldShowExperienceFeedback({ ...engaged, visitCount: 2 }), false);
  });

  it("can open from the third visit when other gates pass", () => {
    assert.equal(shouldShowExperienceFeedback({ ...engaged, visitCount: 3 }), true);
  });
});
