import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { experienceFeedbackEventData } from "./events";
import {
  EXPERIENCE_FEEDBACK_DISMISS_MS,
  EXPERIENCE_FEEDBACK_ENJOY_PROMPT,
  EXPERIENCE_FEEDBACK_IMPROVE_PROMPT,
  EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
  EXPERIENCE_FEEDBACK_PROMPT,
  EXPERIENCE_FEEDBACK_REASON_LABELS,
  alreadyRespondedToExperienceFeedback,
  experienceFeedbackCopy,
  experienceFeedbackSurface,
  experienceFollowUpPrompt,
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

const storyish = /article|teaser|story/i;

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
      alreadyRespondedToExperienceFeedback({ status: "submitted", rating: "good", at: now - 1 }, now),
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
    assert.deepEqual(
      parseExperienceFeedbackStored('{"status":"submitted","rating":"love_it","reason":"discovery","at":12}'),
      {
        status: "submitted",
        rating: "love_it",
        reason: "discovery",
        at: 12,
      },
    );
    assert.equal(parseExperienceFeedbackStored('{"status":"submitted","rating":"useful","at":12}'), null);
    assert.equal(parseExperienceFeedbackStored('{"status":"submitted","rating":"good","reason":"writing","at":12}'), null);
  });
});

describe("experience feedback copy", () => {
  it("asks about the magazine experience, never a single piece", () => {
    assert.equal(EXPERIENCE_FEEDBACK_PROMPT, "How’s your DRV247 experience?");
    assert.equal(experienceFollowUpPrompt("good"), EXPERIENCE_FEEDBACK_ENJOY_PROMPT);
    assert.equal(experienceFollowUpPrompt("love_it"), EXPERIENCE_FEEDBACK_ENJOY_PROMPT);
    assert.equal(experienceFollowUpPrompt("okay"), EXPERIENCE_FEEDBACK_IMPROVE_PROMPT);
    assert.equal(experienceFollowUpPrompt("not_great"), EXPERIENCE_FEEDBACK_IMPROVE_PROMPT);
    for (const line of experienceFeedbackCopy()) {
      assert.doesNotMatch(line, storyish);
    }
    assert.deepEqual(Object.values(EXPERIENCE_FEEDBACK_REASON_LABELS), [
      "Discovery",
      "Personalisation",
      "Mix of sources",
      "Pace",
      "Layout",
    ]);
  });

  it("records rating and reason without an article id", () => {
    const data = experienceFeedbackEventData({
      rating: "good",
      reason: "pace",
      surface: "home",
    });
    assert.deepEqual(data, { rating: "good", reason: "pace", surface: "home" });
    assert.equal("articleId" in data, false);
    assert.equal(experienceFeedbackSurface("/"), "home");
    assert.equal(experienceFeedbackSurface("/category/cars"), "category");
    assert.equal(experienceFeedbackSurface("/story/42"), "story");
    assert.equal(experienceFeedbackSurface("/saved"), "saved");
  });
});
