import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENGAGEMENT_EVENTS, engagementEventNames, isEngagementEventName } from "./events";

describe("engagement event names", () => {
  it("keeps the Phase 1 Vercel Analytics names stable", () => {
    assert.deepEqual(ENGAGEMENT_EVENTS, {
      share: "story_share",
      save: "story_save",
      unsave: "story_unsave",
      feedback: "experience_feedback",
      outbound: "outbound_original_click",
    });
    assert.deepEqual(engagementEventNames(), [
      "story_share",
      "story_save",
      "story_unsave",
      "experience_feedback",
      "outbound_original_click",
    ]);
  });

  it("rejects unknown event names", () => {
    assert.equal(isEngagementEventName("story_share"), true);
    assert.equal(isEngagementEventName("plausible_pageview"), false);
    assert.equal(isEngagementEventName("ga4_event"), false);
    assert.equal(isEngagementEventName(""), false);
  });

  it("keeps experience_feedback off an article id", async () => {
    const { experienceFeedbackEventData } = await import("./events");
    const data = experienceFeedbackEventData({ rating: "okay", reason: "layout" });
    assert.deepEqual(Object.keys(data).sort(), ["rating", "reason"]);
    assert.equal("articleId" in data, false);
  });
});
