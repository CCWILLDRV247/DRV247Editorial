import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESK_LABELS,
  deskNote,
  isDeskPickLive,
  liveDeskByArticle,
  selectHomepagePicks,
} from "./desk-labels";
import { DEFAULT_RANK_WEIGHTS, explainArticle, scoreArticle, type RankInput } from "./rank";

function baseInput(overrides: Partial<RankInput> = {}): RankInput {
  return {
    makes: [],
    models: [],
    generations: [],
    variants: [],
    interests: [],
    categories: [],
    locations: [],
    excerpt: "A",
    relevance: "Good",
    vehicles: [],
    userInterests: [],
    ...overrides,
  };
}

describe("DRV247 Desk", () => {
  it("keeps a small label vocabulary", () => {
    assert.equal(DESK_LABELS.length, 5);
    assert.deepEqual(
      DESK_LABELS.map((label) => label.name),
      ["From the Desk", "Deep Cut", "Worth a Look", "One for the Garage", "Road Worth Taking"],
    );
  });

  it("never invents editorial notes", () => {
    assert.equal(deskNote(undefined), null);
    assert.equal(deskNote(null), null);
    assert.equal(deskNote(""), null);
    assert.equal(deskNote("   "), null);
    assert.equal(deskNote("A 1956 500 TR, painted by hand."), "A 1956 500 TR, painted by hand.");
  });

  it("drops inactive and expired picks from live maps", () => {
    const now = 1_700_000_000_000;
    const live = liveDeskByArticle(
      [
        {
          id: 1,
          articleId: 10,
          note: "Stay late.",
          curator: "DRV247 Desk",
          selectedAt: now - 10,
          expiresAt: null,
          featured: true,
          category: "cars",
          label: "from-the-desk",
          active: true,
        },
        {
          id: 2,
          articleId: 11,
          note: "Should not show",
          curator: "DRV247 Desk",
          selectedAt: now - 10,
          expiresAt: null,
          featured: false,
          category: null,
          label: "deep-cut",
          active: false,
        },
        {
          id: 3,
          articleId: 12,
          note: "Also gone",
          curator: "DRV247 Desk",
          selectedAt: now - 10,
          expiresAt: now - 1,
          featured: false,
          category: null,
          label: "worth-a-look",
          active: true,
        },
      ],
      now,
    );
    assert.equal(live.size, 1);
    assert.equal(live.get(10)?.note, "Stay late.");
    assert.equal(live.has(11), false);
    assert.equal(live.has(12), false);
    assert.equal(isDeskPickLive({ active: true, expiresAt: now }, now), false);
  });

  it("puts the featured story first and caps the homepage at three", () => {
    const picks = [
      { id: "a", featured: false, selectedAt: 30 },
      { id: "b", featured: true, selectedAt: 10 },
      { id: "c", featured: false, selectedAt: 20 },
      { id: "d", featured: false, selectedAt: 40 },
    ];
    const selected = selectHomepagePicks(picks, 3);
    assert.equal(selected.length, 3);
    assert.equal(selected[0]?.id, "b");
    assert.deepEqual(
      selected.slice(1).map((pick) => pick.id),
      ["d", "a"],
    );
  });

  it("adds only a modest ranking signal and never outranks a real car match", () => {
    const ferrariGarage = [{ make: "Ferrari", model: "F355", generation: "F355", variant: "GTB" }];
    const ferrariStory = scoreArticle(
      baseInput({
        makes: ["Ferrari"],
        vehicles: ferrariGarage,
      }),
    );
    const japanDesk = scoreArticle(
      baseInput({
        makes: ["Nissan"],
        interests: ["JDM"],
        vehicles: ferrariGarage,
        deskPick: true,
      }),
    );
    assert.ok(
      ferrariStory > japanDesk,
      `Ferrari make ${ferrariStory} must beat an irrelevant Desk pick ${japanDesk}`,
    );
    const porsche = scoreArticle(
      baseInput({
        makes: ["Porsche"],
        models: ["911"],
        vehicles: [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }],
      }),
    );
    const porscheDesk = scoreArticle(
      baseInput({
        makes: ["Porsche"],
        models: ["911"],
        vehicles: [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }],
        deskPick: true,
      }),
    );
    const lift = porscheDesk - porsche;
    assert.ok(porscheDesk > porsche, "relevant Desk pick gets a lift");
    assert.ok(
      lift <= DEFAULT_RANK_WEIGHTS.deskPick + DEFAULT_RANK_WEIGHTS.deskPickRelevant,
      `lift ${lift} should stay modest`,
    );
    const plain = explainArticle(baseInput({ makes: ["Ferrari"], vehicles: ferrariGarage }));
    assert.equal(
      plain.reasons.some((reason) => /from the drv247 desk/i.test(reason)),
      false,
    );
    const deskWhy = explainArticle(
      baseInput({ makes: ["Ferrari"], vehicles: ferrariGarage, deskPick: true }),
    );
    assert.ok(deskWhy.reasons.includes("From the DRV247 Desk"));
    assert.ok(deskWhy.signals.some((signal) => signal.kind === "desk"));
  });
});
