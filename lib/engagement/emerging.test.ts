import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deskRecommendations, emergingInterests, knownInterestLabel, type DimRateRow } from "./emerging";
import { exposureRates } from "./rates";

function dim(kind: DimRateRow["dimKind"], value: string, impressions: number, opens: number): DimRateRow {
  return {
    dimKind: kind,
    dimValue: value,
    ...exposureRates({
      impressionUniques: impressions,
      openUniques: opens,
      outboundUniques: 0,
      saveUniques: 0,
      shareUniques: 0,
    }),
  };
}

describe("emerging interests and desk recs", () => {
  it("only compares the 23 product interests and requires both floors", () => {
    assert.equal(knownInterestLabel("Tuning"), "Tuning");
    assert.equal(knownInterestLabel("Hypercars"), null);
    const current = [dim("interest", "Tuning", 12, 6), dim("interest", "Hypercars", 20, 19)];
    const previous = [dim("interest", "Tuning", 12, 2)];
    const emerging = emergingInterests(current, previous);
    assert.equal(emerging.length, 1);
    assert.equal(emerging[0].dimValue, "Tuning");
    assert.equal(emerging[0].sufficientBoth, true);
    assert.equal(emerging[0].openRateDelta, 0.5 - 2 / 12);
  });

  it("writes deterministic recs only when n clears the floor", () => {
    const recs = deskRecommendations({
      windowDays: 7,
      publishers: [dim("publisher", "Hagerty", 18, 9)],
      interests: emergingInterests([dim("interest", "Tuning", 12, 6)], [dim("interest", "Tuning", 12, 2)]),
      content: [
        {
          articleId: 4,
          title: "A test of the 911",
          ...exposureRates({
            impressionUniques: 10,
            openUniques: 6,
            outboundUniques: 1,
            saveUniques: 1,
            shareUniques: 0,
          }),
        },
      ],
    });
    assert.equal(recs.length >= 1, true);
    assert.match(recs[0], /Hagerty/);
    assert.match(recs[0], /n=18/);
    assert.equal(
      deskRecommendations({
        windowDays: 7,
        publishers: [dim("publisher", "Hagerty", 3, 3)],
        interests: [],
        content: [],
      }).length,
      0,
    );
  });
});
