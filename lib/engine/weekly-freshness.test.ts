import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recencyBonus, DEFAULT_RANK_WEIGHTS } from "./rank";
import {
  mergeOpenerRecent,
  parseOpenerRecent,
  rollOpenerRecent,
  weekStartUtc,
  type OpenerRecentState,
} from "./opener-recent";
import {
  applyWeeklyHomepageOpening,
  CATEGORY_PAGE_OPENING_MAX,
  FOR_YOU_OPENING_MAX,
  isThisWeekStory,
  latestIngestAt,
  selectOpeningStories,
  THIS_WEEK_DAYS,
  type FreshnessCard,
} from "./weekly-freshness";

const NOW = Date.parse("2026-10-09T09:00:00Z");
const DAY = 86_400_000;

function card(
  id: number,
  opts: Partial<FreshnessCard> & { daysAgo?: number; firstSeenDaysAgo?: number } = {},
): FreshnessCard {
  const published = NOW - (opts.daysAgo ?? 2) * DAY;
  const firstSeen =
    opts.firstSeen ??
    (opts.firstSeenDaysAgo != null ? NOW - opts.firstSeenDaysAgo * DAY : published);
  return {
    id,
    publication: opts.publication ?? `Pub ${id}`,
    publishedAt: opts.publishedAt ?? published,
    firstSeen,
    lastProcessed: opts.lastProcessed ?? firstSeen,
    deskPick: opts.deskPick ?? false,
  };
}

describe("weekly freshness — this-week pool", () => {
  it("treats published or first-seen in the last 7 days as this-week", () => {
    const ingestAt = NOW - 20 * DAY;
    assert.equal(isThisWeekStory(card(1, { daysAgo: 3 }), NOW, ingestAt), true);
    assert.equal(isThisWeekStory(card(2, { daysAgo: 40, firstSeenDaysAgo: 2 }), NOW, ingestAt), true);
    assert.equal(isThisWeekStory(card(3, { daysAgo: 40, firstSeenDaysAgo: 30 }), NOW, ingestAt), false);
  });

  it("treats the latest ingest batch as this-week even when publisher dates are old", () => {
    const batch = NOW - 2 * DAY;
    const stories = [
      card(1, { daysAgo: 400, firstSeen: batch, lastProcessed: batch }),
      card(2, { daysAgo: 400, firstSeen: batch - 3_600_000, lastProcessed: batch }),
      card(3, { daysAgo: 400, firstSeen: NOW - 40 * DAY, lastProcessed: NOW - 40 * DAY }),
    ];
    const ingestAt = latestIngestAt(stories);
    assert.equal(isThisWeekStory(stories[0]!, NOW, ingestAt), true);
    assert.equal(isThisWeekStory(stories[1]!, NOW, ingestAt), true);
    assert.equal(isThisWeekStory(stories[2]!, NOW, ingestAt), false);
  });
});

describe("weekly freshness — opening slots", () => {
  it("pins this-week stories ahead of higher-ranked stale cards", () => {
    const stale = card(1, { daysAgo: 40, publication: "Octane" });
    const fresh = card(2, { daysAgo: 1, publication: "Hagerty" });
    const opening = selectOpeningStories([stale, fresh], [stale, fresh], {
      count: FOR_YOU_OPENING_MAX,
      now: NOW,
    });
    assert.equal(opening[0]?.id, 2);
    assert.equal(opening.length, 2);
  });

  it("keeps one publication in the opening band", () => {
    const a = card(1, { daysAgo: 1, publication: "Octane" });
    const b = card(2, { daysAgo: 1, publication: "Octane" });
    const c = card(3, { daysAgo: 1, publication: "Hagerty" });
    const opening = selectOpeningStories([a, b, c], [a, b, c], { count: 3, now: NOW });
    assert.deepEqual(
      opening.map((item) => item.id),
      [1, 3, 2],
    );
    assert.equal(opening[0]?.publication, "Octane");
    assert.equal(opening[1]?.publication, "Hagerty");
  });

  it("does not let last week's opener open this week", () => {
    const lastWeek = card(1, { daysAgo: 1, publication: "Octane" });
    const other = card(2, { daysAgo: 2, publication: "Hagerty" });
    const opening = selectOpeningStories([lastWeek, other], [lastWeek, other], {
      count: 1,
      now: NOW,
      lastWeekOpenerIds: [1],
    });
    assert.equal(opening[0]?.id, 2);
  });

  it("fills remaining lead slots from normal rank when this-week is thin", () => {
    const fresh = card(1, { daysAgo: 1, publication: "Octane" });
    const staleA = card(2, { daysAgo: 40, publication: "Hagerty" });
    const staleB = card(3, { daysAgo: 41, publication: "Petrolicious" });
    const opening = selectOpeningStories([fresh, staleA, staleB], [fresh, staleA, staleB], {
      count: 3,
      now: NOW,
    });
    assert.deepEqual(
      opening.map((item) => item.id),
      [1, 2, 3],
    );
    assert.equal(opening.length, CATEGORY_PAGE_OPENING_MAX);
  });

  it("does not leave holes when the this-week pool is empty", () => {
    const stale = [card(1, { daysAgo: 40 }), card(2, { daysAgo: 41 }), card(3, { daysAgo: 42 })];
    const opening = selectOpeningStories(stale, stale, { count: 2, now: NOW });
    assert.deepEqual(
      opening.map((item) => item.id),
      [1, 2],
    );
  });

  it("does not let a stale Desk pick occupy the visual lead when this-week stories exist", () => {
    const desk = card(1, { daysAgo: 40, publication: "Octane", deskPick: true });
    const fresh = card(2, { daysAgo: 1, publication: "Hagerty" });
    const opening = selectOpeningStories([desk, fresh], [desk, fresh], {
      count: 1,
      now: NOW,
      avoidStaleDeskLead: true,
    });
    assert.equal(opening[0]?.id, 2);
  });

  it("still uses a Desk pick as lead when no this-week stories exist", () => {
    const desk = card(1, { daysAgo: 40, publication: "Octane", deskPick: true });
    const stale = card(2, { daysAgo: 41, publication: "Hagerty" });
    const opening = selectOpeningStories([desk, stale], [desk, stale], {
      count: 1,
      now: NOW,
      avoidStaleDeskLead: true,
    });
    assert.equal(opening[0]?.id, 1);
  });

  it("pins rail openers independently and shares publication uniqueness with For You", () => {
    const hero = card(1, { daysAgo: 1, publication: "Octane" });
    const railFreshSamePub = card(2, { daysAgo: 1, publication: "Octane" });
    const railOther = card(3, { daysAgo: 2, publication: "Hagerty" });
    const staleRail = card(4, { daysAgo: 40, publication: "Petrolicious" });
    const pinned = applyWeeklyHomepageOpening({
      forYou: [hero],
      ranked: [hero, railFreshSamePub, railOther, staleRail],
      rails: [{ slug: "cars", stories: [staleRail, railFreshSamePub, railOther] }],
      forYouCount: 1,
      now: NOW,
    });
    assert.equal(pinned.forYou[0]?.id, 1);
    assert.equal(pinned.rails[0]?.stories[0]?.id, 3);
    assert.ok(!pinned.openerIds.includes(4));
  });
});

describe("weekly freshness — half-life unchanged below the fold", () => {
  it("keeps the 12-day freshness half-life on rank scores", () => {
    assert.equal(DEFAULT_RANK_WEIGHTS.freshnessHalfLifeDays, 12);
    assert.equal(THIS_WEEK_DAYS, 7);
    const twelve = recencyBonus(NOW - 12 * DAY, NOW, DEFAULT_RANK_WEIGHTS);
    const zero = recencyBonus(NOW, NOW, DEFAULT_RANK_WEIGHTS);
    assert.equal(zero, DEFAULT_RANK_WEIGHTS.freshnessMax);
    assert.ok(twelve < zero);
    assert.equal(twelve, Math.round(DEFAULT_RANK_WEIGHTS.freshnessMax * 0.5));
  });
});

describe("opener recency — last week cannot open this week", () => {
  it("rolls last week's ids into prevIds on the following Monday", () => {
    const monday = weekStartUtc(NOW);
    const lastMonday = monday - 7 * DAY;
    const stored: OpenerRecentState = {
      weekStart: lastMonday,
      ids: [11, 12],
      prevWeekStart: lastMonday - 7 * DAY,
      prevIds: [99],
    };
    const rolled = rollOpenerRecent(stored, NOW);
    assert.equal(rolled.weekStart, monday);
    assert.deepEqual(rolled.ids, []);
    assert.deepEqual(rolled.prevIds, [11, 12]);
    const merged = mergeOpenerRecent(rolled, [21], NOW);
    assert.deepEqual(merged.ids, [21]);
    assert.deepEqual(merged.prevIds, [11, 12]);
  });

  it("parses a cookie payload and exposes last-week ids", () => {
    const lastMonday = weekStartUtc(NOW) - 7 * DAY;
    const raw = JSON.stringify({
      weekStart: lastMonday,
      ids: [7],
      prevWeekStart: lastMonday - 7 * DAY,
      prevIds: [8],
    });
    const parsed = parseOpenerRecent(raw, NOW);
    assert.deepEqual(parsed.prevIds, [7]);
    assert.deepEqual(parsed.ids, []);
  });
});
