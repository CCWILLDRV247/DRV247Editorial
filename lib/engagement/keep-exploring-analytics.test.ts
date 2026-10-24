import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { KEEP_EXPLORING_ANALYTICS } from "./keep-exploring-analytics";
import { ENGAGEMENT_EVENTS } from "./events";

describe("keep exploring analytics", () => {
  it("uses dedicated Vercel event names and not Turso impression surfaces", () => {
    assert.equal(KEEP_EXPLORING_ANALYTICS.section, "keep_exploring_section_impression");
    assert.equal(KEEP_EXPLORING_ANALYTICS.card, "keep_exploring_card_impression");
    assert.equal(KEEP_EXPLORING_ANALYTICS.click, "keep_exploring_card_click");
    const ingest = readFileSync(new URL("./ingest.ts", import.meta.url), "utf8");
    assert.equal(ingest.includes("keep_exploring"), false);
    const events = Object.values(ENGAGEMENT_EVENTS);
    assert.equal(events.some((name) => name.includes("keep_exploring")), false);
  });
});
