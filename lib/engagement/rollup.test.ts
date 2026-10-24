import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDailyArticles,
  buildDailyDims,
  buildDailyTouches,
  buildVisitorFirstDays,
  rawRetentionCutoff,
  windowArticleCounts,
} from "./rollup";

const visitorA = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const visitorB = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

describe("intelligence rollups", () => {
  it("dedupes daily touches and counts returning on a later UTC day", () => {
    const rows = [
      { event: "impression", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-20T10:00:00.000Z") },
      { event: "impression", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-20T18:00:00.000Z") },
      { event: "story_open", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-20T10:01:00.000Z") },
      { event: "impression", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-21T09:00:00.000Z") },
      { event: "impression", articleId: 1, visitorKey: visitorB, createdAt: Date.parse("2026-10-21T09:00:00.000Z") },
      { event: "save", articleId: 1, visitorKey: visitorB, createdAt: Date.parse("2026-10-21T09:05:00.000Z") },
    ];
    const first = buildVisitorFirstDays(rows);
    assert.equal(first.get(visitorA), "2026-10-20");
    const touches = buildDailyTouches(rows);
    assert.equal(touches.filter((touch) => touch.event === "impression").length, 3);
    const daily = buildDailyArticles(touches, first);
    const day21 = daily.find((row) => row.day === "2026-10-21" && row.articleId === 1);
    assert.equal(day21?.impressionUniques, 2);
    assert.equal(day21?.saveUniques, 1);
    assert.equal(day21?.returningUniques, 1);
  });

  it("only rolls known interests and extracted marques", () => {
    const touches = buildDailyTouches([
      { event: "impression", articleId: 4, visitorKey: visitorA, createdAt: Date.parse("2026-10-21T09:00:00.000Z") },
      { event: "story_open", articleId: 4, visitorKey: visitorA, createdAt: Date.parse("2026-10-21T09:01:00.000Z") },
    ]);
    const dims = buildDailyDims(
      touches,
      new Map([
        [
          4,
          {
            interests: ["Tuning", "Hypercars"],
            marques: ["Porsche"],
            category: "cars",
            publisher: "Hagerty",
          },
        ],
      ]),
    );
    assert.equal(dims.some((row) => row.dimKind === "interest" && row.dimValue === "Tuning"), true);
    assert.equal(dims.some((row) => row.dimValue === "Hypercars"), false);
    assert.equal(dims.some((row) => row.dimKind === "marque" && row.dimValue === "Porsche"), true);
    assert.equal(dims.some((row) => row.dimKind === "publisher" && row.dimValue === "Hagerty"), true);
  });

  it("window counts are distinct visitors, not summed daily uniques", () => {
    const touches = buildDailyTouches([
      { event: "impression", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-20T10:00:00.000Z") },
      { event: "impression", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-21T10:00:00.000Z") },
      { event: "story_open", articleId: 1, visitorKey: visitorA, createdAt: Date.parse("2026-10-21T10:01:00.000Z") },
    ]);
    const first = buildVisitorFirstDays(touches.map((touch) => ({
      event: touch.event,
      articleId: touch.articleId,
      visitorKey: touch.visitorKey,
      createdAt: Date.parse(`${touch.day}T00:00:00.000Z`),
      dayUtc: touch.day,
    })));
    const window = windowArticleCounts(touches, first, "2026-10-20");
    assert.equal(window[0]?.impressionUniques, 1);
    assert.equal(window[0]?.openUniques, 1);
  });

  it("purges raw events after 90 UTC days", () => {
    const cutoff = rawRetentionCutoff(Date.parse("2026-10-24T00:00:00.000Z"));
    assert.equal(new Date(cutoff).toISOString().slice(0, 10), "2026-07-26");
  });
});
