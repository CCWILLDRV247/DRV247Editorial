import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  experienceFeedbackHeadingLines,
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
  visitCount: 3,
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
    assert.equal(experienceFeedbackHeadingLines(EXPERIENCE_FEEDBACK_PROMPT).join(" "), EXPERIENCE_FEEDBACK_PROMPT);
    assert.equal(experienceFeedbackHeadingLines(EXPERIENCE_FEEDBACK_ENJOY_PROMPT).join(" "), EXPERIENCE_FEEDBACK_ENJOY_PROMPT);
    assert.equal(experienceFeedbackHeadingLines(EXPERIENCE_FEEDBACK_IMPROVE_PROMPT).join(" "), EXPERIENCE_FEEDBACK_IMPROVE_PROMPT);
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

describe("experience feedback panel matches personalisation modal", () => {
  it("reuses the Figma 1:254 card, heading, chip, and close tokens", () => {
    const modal = readFileSync(new URL("../../components/personalization-interests-modal.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../../components/engagement/experience-feedback.tsx", import.meta.url), "utf8");
    const tokens = [
      "rounded-[15px]",
      "border-[1.5px] border-[#c4c4c4]",
      "shadow-[0px_2px_4px_0px_rgba(0,0,0,0.16)]",
      "font-display text-[clamp(3.75rem,17.1vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]",
      "px-[17px] pt-[44px] pb-5",
      "gap-5",
      "h-[52px]",
      "rounded-[5px] border border-[#1b1d1f]",
      "font-display text-[18px] font-extrabold uppercase leading-6",
      "top-[16.5px] right-[20px]",
      "/personalization-close.svg",
      "w-[calc(100%-20px)] max-w-[468px]",
    ];
    for (const token of tokens) {
      assert.match(modal, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(panel, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
});

describe("personalisation interests modal copy and skip link", () => {
  it("uses updated body copy and 16px mobile skip typography", () => {
    const modal = readFileSync(new URL("../../components/personalization-interests-modal.tsx", import.meta.url), "utf8");
    assert.match(
      modal,
      /Choose one or more marques and a few interests, we&apos;ll shape content around them\./,
    );
    assert.match(modal, /Not now/);
    assert.match(
      modal,
      /text-\[16px\][^"]*leading-\[22px\][^"]*md:text-\[18px\][^"]*md:leading-6/,
    );
  });
});
