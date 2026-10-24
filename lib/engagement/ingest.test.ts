import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createVisitorKey,
  isVisitorKey,
  parseEngagementWritePayload,
  writeEventFromAnalyticsName,
} from "./ingest";

describe("engagement ingest", () => {
  it("accepts the allow-list and rejects unknown events", () => {
    assert.deepEqual(parseEngagementWritePayload({ event: "interested", articleId: 4 }), {
      event: "interested",
      articleId: 4,
    });
    assert.equal("error" in parseEngagementWritePayload({ event: "pageview", articleId: 4 }), true);
    assert.equal("error" in parseEngagementWritePayload({ event: "save" }), true);
    assert.equal(
      "error" in parseEngagementWritePayload({ event: "impression", articleId: 4, surface: "home" }),
      false,
    );
  });

  it("keeps experience_feedback off an article id", () => {
    const parsed = parseEngagementWritePayload({
      event: "experience_feedback",
      articleId: 99,
      cohort: "Ferrari",
    });
    assert.deepEqual(parsed, { event: "experience_feedback", articleId: null, cohort: "Ferrari" });
  });

  it("maps Phase 1 analytics names onto write events", () => {
    assert.equal(writeEventFromAnalyticsName("story_save"), "save");
    assert.equal(writeEventFromAnalyticsName("story_share"), "share");
    assert.equal(writeEventFromAnalyticsName("plausible_pageview"), null);
  });

  it("validates visitor keys", () => {
    const key = createVisitorKey(() => 0.5);
    assert.equal(isVisitorKey(key), true);
    assert.equal(isVisitorKey("not-a-uuid"), false);
    assert.equal(isVisitorKey(""), false);
  });
});
