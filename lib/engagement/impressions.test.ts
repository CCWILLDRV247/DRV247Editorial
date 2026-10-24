import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  IMPRESSION_EVENT,
  impressionDedupKey,
  intelligenceWindow,
  parseDeskWindow,
  parseImpressionWritePayload,
  uniquePositiveIds,
  utcDayFromMs,
} from "./impressions";
import { parseEngagementWritePayload } from "./ingest";

describe("eligible impressions", () => {
  it("dedupes visitor + article + UTC day + surface", () => {
    const day = utcDayFromMs(Date.parse("2026-10-24T23:30:00.000Z"));
    assert.equal(day, "2026-10-24");
    assert.equal(
      impressionDedupKey({
        visitorKey: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        articleId: 9,
        dayUtc: day,
        surface: "home",
      }),
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:9:2026-10-24:home",
    );
  });

  it("accepts a batched impression payload and rejects missing surface", () => {
    const parsed = parseImpressionWritePayload({
      articleIds: [4, 4, 9, 0, "12"],
      surface: "home",
    });
    assert.deepEqual(parsed, {
      event: IMPRESSION_EVENT,
      articleId: 4,
      articleIds: [4, 9, 12],
      surface: "home",
    });
    assert.equal("error" in parseImpressionWritePayload({ articleId: 4 }), true);
  });

  it("adds impression to the write allow-list without a Vercel analytics name", () => {
    const parsed = parseEngagementWritePayload({
      event: "impression",
      articleIds: [3],
      surface: "category",
    });
    assert.deepEqual(parsed, {
      event: "impression",
      articleId: 3,
      articleIds: [3],
      surface: "category",
    });
    const events = readFileSync(new URL("./events.ts", import.meta.url), "utf8");
    assert.equal(events.includes("impression"), false);
  });

  it("does not use viewport observers for served-id beacons", () => {
    const beacon = readFileSync(new URL("../../components/engagement/impression-beacon.tsx", import.meta.url), "utf8");
    assert.match(beacon, /requestIdleCallback|setTimeout/);
    assert.equal(beacon.includes("IntersectionObserver"), false);
  });

  it("labels 7 / 14 / 28 day UTC windows", () => {
    const window = intelligenceWindow(7, Date.parse("2026-10-24T12:00:00.000Z"));
    assert.equal(window.label, "Last 7 days (UTC)");
    assert.equal(window.startDay, "2026-10-18");
    assert.equal(window.endDay, "2026-10-24");
    assert.equal(window.previousStartDay, "2026-10-11");
    assert.equal(window.previousEndDay, "2026-10-17");
    assert.equal(parseDeskWindow("28"), 28);
    assert.equal(parseDeskWindow("99"), 7);
  });

  it("uniquePositiveIds drops junk", () => {
    assert.deepEqual(uniquePositiveIds([1, 1, 0, -2, undefined, 3.5, 4]), [1, 4]);
  });
});
