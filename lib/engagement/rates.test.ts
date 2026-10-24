import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRENDING_WEIGHTS } from "./trending";
import {
  INSUFFICIENT_DATA_COPY,
  RATE_WEIGHTS,
  exposureRates,
  formatRate,
  rankByOpenRate,
} from "./rates";

describe("exposure-adjusted rates", () => {
  it("divides action uniques by impression uniques and reuses trending weights", () => {
    assert.deepEqual(RATE_WEIGHTS, TRENDING_WEIGHTS);
    const rates = exposureRates({
      impressionUniques: 10,
      openUniques: 5,
      outboundUniques: 2,
      saveUniques: 1,
      shareUniques: 1,
      interestedUniques: 2,
      lessLikeUniques: 0,
    });
    assert.equal(rates.sufficient, true);
    assert.equal(rates.openRate, 0.5);
    assert.equal(rates.outboundRate, 0.2);
    assert.equal(rates.saveRate, 0.1);
    assert.equal(rates.shareRate, 0.1);
    assert.equal(
      rates.weightedScore,
      0.2 * 3 + 0.1 * 2 + 0.1 * 2 + 0.2 * 1,
    );
    assert.equal(formatRate(rates.openRate), "50%");
  });

  it("withholds the weighted score and ranking below 8 impression uniques", () => {
    const thin = exposureRates({
      impressionUniques: 7,
      openUniques: 7,
      outboundUniques: 7,
      saveUniques: 7,
      shareUniques: 7,
    });
    assert.equal(thin.sufficient, false);
    assert.equal(thin.weightedScore, null);
    assert.equal(thin.openRate, 1);
    const ranked = rankByOpenRate([
      { ...thin, impressionUniques: 7 },
      exposureRates({
        impressionUniques: 8,
        openUniques: 2,
        outboundUniques: 0,
        saveUniques: 0,
        shareUniques: 0,
      }),
    ]);
    assert.equal(ranked.ranked.length, 1);
    assert.equal(ranked.insufficient.length, 1);
    assert.match(INSUFFICIENT_DATA_COPY, /8 impression uniques/);
  });

  it("does not invent a rate when impressions are zero", () => {
    const empty = exposureRates({
      impressionUniques: 0,
      openUniques: 4,
      outboundUniques: 0,
      saveUniques: 0,
      shareUniques: 0,
    });
    assert.equal(empty.openRate, null);
    assert.equal(empty.weightedScore, null);
  });
});
