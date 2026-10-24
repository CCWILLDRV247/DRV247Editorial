import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPERIENCE_FEEDBACK_DISMISS_MS,
  EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
  alreadyRespondedToExperienceFeedback,
  parseExperienceFeedbackStored,
  shouldShowExperienceFeedback,
} from "./feedback";

const closed = {
  firstPaint: false,
  dwellMs: 0,
  scrolledPast: false,
  explicitEngage: false,
  alreadyResponded: false,
};

describe("experience feedback gating", () => {
  it("stays hidden on first paint", () => {
    assert.equal(
      shouldShowExperienceFeedback({
        ...closed,
        firstPaint: true,
        dwellMs: EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
        scrolledPast: true,
        explicitEngage: true,
      }),
      false,
    );
  });

  it("opens after dwell, scroll, or an explicit engage", () => {
    assert.equal(shouldShowExperienceFeedback(closed), false);
    assert.equal(
      shouldShowExperienceFeedback({ ...closed, dwellMs: EXPERIENCE_FEEDBACK_MIN_DWELL_MS }),
      true,
    );
    assert.equal(shouldShowExperienceFeedback({ ...closed, dwellMs: EXPERIENCE_FEEDBACK_MIN_DWELL_MS - 1 }), false);
    assert.equal(shouldShowExperienceFeedback({ ...closed, scrolledPast: true }), true);
    assert.equal(shouldShowExperienceFeedback({ ...closed, scrolledPast: true, scrollArmed: false }), false);
    assert.equal(shouldShowExperienceFeedback({ ...closed, explicitEngage: true }), true);
  });

  it("stays hidden after a real response", () => {
    assert.equal(
      shouldShowExperienceFeedback({ ...closed, explicitEngage: true, alreadyResponded: true }),
      false,
    );
  });

  it("treats submit as permanent and dismiss as a 14-day cool-off", () => {
    const now = 1_700_000_000_000;
    assert.equal(alreadyRespondedToExperienceFeedback(null, now), false);
    assert.equal(
      alreadyRespondedToExperienceFeedback({ status: "submitted", rating: "useful", at: now - 1 }, now),
      true,
    );
    assert.equal(
      alreadyRespondedToExperienceFeedback({ status: "dismissed", at: now - 1_000 }, now),
      true,
    );
    assert.equal(
      alreadyRespondedToExperienceFeedback(
        { status: "dismissed", at: now - EXPERIENCE_FEEDBACK_DISMISS_MS },
        now,
      ),
      false,
    );
  });

  it("parses stored feedback and ignores junk", () => {
    assert.equal(parseExperienceFeedbackStored(null), null);
    assert.equal(parseExperienceFeedbackStored("{"), null);
    assert.deepEqual(parseExperienceFeedbackStored('{"status":"submitted","rating":"browsing","at":12}'), {
      status: "submitted",
      rating: "browsing",
      at: 12,
    });
    assert.equal(parseExperienceFeedbackStored('{"status":"submitted","rating":"love-it","at":12}'), null);
  });
});
