import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ENABLED_SOURCE_IDS } from "../../config/wave1-sources";
import {
  WEEKLY_CRON_SLOTS,
  WEEKLY_SOURCE_BUDGET_MS,
  VERCEL_CRON_MAX_MS,
  completedSourceIdsThisWeek,
  orderSourceIds,
  planWeeklyBatch,
  remainingSourceIds,
  shouldStartNextSource,
  weeklyWindowStart,
  type IngestRunRecord,
} from "./weekly-ingest-plan";

const NEXT_MONDAY = Date.UTC(2026, 9, 12, 6, 0, 0, 0);
const PREV_MONDAY = Date.UTC(2026, 9, 5, 6, 0, 0, 0);

describe("weekly ingest window", () => {
  it("starts Monday 06:00 UTC, including the 12 Oct 2026 run", () => {
    assert.equal(weeklyWindowStart(NEXT_MONDAY), NEXT_MONDAY);
    assert.equal(weeklyWindowStart(Date.UTC(2026, 9, 12, 6, 0, 0, 1)), NEXT_MONDAY);
    assert.equal(weeklyWindowStart(Date.UTC(2026, 9, 12, 5, 59, 59, 999)), PREV_MONDAY);
    assert.equal(weeklyWindowStart(Date.UTC(2026, 9, 9, 8, 38, 0, 0)), PREV_MONDAY);
    assert.equal(weeklyWindowStart(Date.UTC(2026, 9, 11, 23, 0, 0, 0)), PREV_MONDAY);
    assert.equal(weeklyWindowStart(Date.UTC(2026, 9, 13, 0, 0, 0, 0)), NEXT_MONDAY);
  });
});

describe("weekly ingest resume", () => {
  const ids = ["auto_001", "auto_002", "auto_003", "auto_004"];

  it("skips sources with ok or error runs this week and retries timeouts", () => {
    const runs: IngestRunRecord[] = [
      { sourceId: "auto_001", startedAt: NEXT_MONDAY + 1_000, finishedAt: NEXT_MONDAY + 8_000, status: "ok" },
      { sourceId: "auto_002", startedAt: NEXT_MONDAY + 9_000, finishedAt: NEXT_MONDAY + 12_000, status: "error" },
      { sourceId: "auto_003", startedAt: NEXT_MONDAY + 13_000, finishedAt: NEXT_MONDAY + 300_000, status: "timeout" },
    ];
    const completed = completedSourceIdsThisWeek(runs, NEXT_MONDAY);
    assert.deepEqual([...completed], ["auto_001", "auto_002"]);
    assert.deepEqual(remainingSourceIds(ids, completed), ["auto_003", "auto_004"]);
  });

  it("resumes from the first source without a terminal run this week", () => {
    const plan = planWeeklyBatch({
      sourceIds: ids,
      runs: [
        { id: 1, sourceId: "auto_001", startedAt: NEXT_MONDAY + 1_000, finishedAt: NEXT_MONDAY + 8_000, status: "ok" },
        { id: 2, sourceId: "auto_002", startedAt: NEXT_MONDAY + 9_000, finishedAt: NEXT_MONDAY + 16_000, status: "ok" },
      ],
      windowStart: NEXT_MONDAY,
      nowMs: NEXT_MONDAY + 20_000,
    });
    assert.equal(plan.action, "ingest");
    assert.deepEqual(plan.remainingIds, ["auto_003", "auto_004"]);
    assert.equal(plan.firstOfWeek, false);
    assert.equal(plan.completedCount, 2);
  });

  it("retries a source killed mid-flight (stale running, no terminal row)", () => {
    const plan = planWeeklyBatch({
      sourceIds: ids,
      runs: [
        { id: 1, sourceId: "auto_001", startedAt: NEXT_MONDAY + 1_000, finishedAt: NEXT_MONDAY + 8_000, status: "ok" },
        {
          id: 2,
          sourceId: "auto_002",
          startedAt: NEXT_MONDAY + 9_000,
          finishedAt: null,
          status: "running",
        },
      ],
      windowStart: NEXT_MONDAY,
      nowMs: NEXT_MONDAY + 9_000 + VERCEL_CRON_MAX_MS + 1,
    });
    assert.equal(plan.action, "ingest");
    assert.deepEqual(plan.staleRunIds, [2]);
    assert.deepEqual(plan.remainingIds, ["auto_002", "auto_003", "auto_004"]);
  });

  it("locks while another slot is still running so sources stay sequential", () => {
    const plan = planWeeklyBatch({
      sourceIds: ids,
      runs: [
        {
          id: 1,
          sourceId: "auto_001",
          startedAt: NEXT_MONDAY + 1_000,
          finishedAt: null,
          status: "running",
        },
      ],
      windowStart: NEXT_MONDAY,
      nowMs: NEXT_MONDAY + 30_000,
    });
    assert.equal(plan.action, "locked");
    assert.equal(plan.lockSourceId, "auto_001");
    assert.deepEqual(plan.remainingIds, ids);
  });

  it("returns complete when every enabled source already ran this week", () => {
    const plan = planWeeklyBatch({
      sourceIds: ids,
      runs: ids.map((sourceId, index) => ({
        id: index + 1,
        sourceId,
        startedAt: NEXT_MONDAY + index * 1_000,
        finishedAt: NEXT_MONDAY + index * 1_000 + 500,
        status: "ok" as const,
      })),
      windowStart: NEXT_MONDAY,
      nowMs: NEXT_MONDAY + 20_000,
    });
    assert.equal(plan.action, "complete");
    assert.deepEqual(plan.remainingIds, []);
  });

  it("stops starting sources before the 300s cap", () => {
    assert.equal(shouldStartNextSource(NEXT_MONDAY, NEXT_MONDAY + WEEKLY_SOURCE_BUDGET_MS - 1), true);
    assert.equal(shouldStartNextSource(NEXT_MONDAY, NEXT_MONDAY + WEEKLY_SOURCE_BUDGET_MS), false);
    assert.ok(WEEKLY_SOURCE_BUDGET_MS < VERCEL_CRON_MAX_MS);
  });
});

describe("weekly ingest order", () => {
  it("keeps wave order then extra YouTube ids, never shuffling for parallel", () => {
    assert.deepEqual(
      orderSourceIds(ENABLED_SOURCE_IDS, ["yt_later", "auto_016", "auto_001", "auto_055"]),
      ["auto_001", "auto_016", "auto_055", "yt_later"],
    );
    assert.equal(ENABLED_SOURCE_IDS[0], "auto_001");
  });
});

describe("weekly cron slots", () => {
  it("keeps Monday 06:00 UTC as slot 1 and spaces later slots past the 300s cap", () => {
    assert.equal(WEEKLY_CRON_SLOTS[0].schedule, "0 6 * * 1");
    assert.equal(WEEKLY_CRON_SLOTS[0].path, "/api/cron/ingest");
    const minutes = WEEKLY_CRON_SLOTS.map((slot) => Number(slot.schedule.split(" ")[0]));
    for (let index = 1; index < minutes.length; index += 1) {
      assert.ok(minutes[index] - minutes[index - 1] >= 5, `${minutes[index - 1]} -> ${minutes[index]}`);
    }
    assert.ok(!minutes.some((minute) => minute > 12 && minute < 21));
  });

  it("matches vercel.json so Vercel fires the same sequential slots", () => {
    const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as {
      crons: { path: string; schedule: string }[];
      functions: Record<string, { maxDuration: number }>;
    };
    for (const slot of WEEKLY_CRON_SLOTS) {
      const cron = vercel.crons.find((row) => row.path === slot.path);
      assert.ok(cron, slot.path);
      assert.equal(cron?.schedule, slot.schedule);
      const file = `app${slot.path}/route.ts`;
      assert.equal(vercel.functions[file]?.maxDuration, 300);
    }
    const intelligence = vercel.crons.find((row) => row.path === "/api/cron/intelligence-ingest");
    assert.equal(intelligence?.schedule, "15 6 * * 1");
  });

  it("gives five sequential 220s windows enough headroom for 75 sources at the measured Monday rate", () => {
    const measuredMsPerSource = 285_000 / 32;
    const capacity = WEEKLY_CRON_SLOTS.length * WEEKLY_SOURCE_BUDGET_MS;
    assert.ok(capacity > ENABLED_SOURCE_IDS.length * measuredMsPerSource);
    assert.equal(ENABLED_SOURCE_IDS.length, 75);
  });
});
