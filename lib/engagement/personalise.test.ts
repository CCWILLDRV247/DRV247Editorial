import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyReaderSignals, READER_SIGNAL_WEIGHTS } from "./personalise";

const base = {
  makes: ["Ferrari"] as string[],
  interests: ["Classic"] as string[],
  rankScore: 20,
  vehicleTier: "none",
};

describe("reader signal ranking", () => {
  it("lets an explicit mark beat a similar-save inference", () => {
    const { articles, adjustments } = applyReaderSignals(
      [
        { id: 1, ...base, rankScore: 10 },
        { id: 2, makes: ["Porsche"], interests: ["Track"], rankScore: 40, vehicleTier: "none" },
      ],
      { interestedIds: [1], savedIds: [2] },
    );
    assert.equal(articles[0]?.id, 1);
    const marked = adjustments.find((item) => item.id === 1);
    const saved = adjustments.find((item) => item.id === 2);
    assert.ok((marked?.delta ?? 0) > (saved?.delta ?? 0));
    assert.equal(marked?.vehicleTier, "none");
    assert.equal(saved?.vehicleTier, "none");
  });

  it("demotes Less like this and similar stories", () => {
    const { adjustments } = applyReaderSignals(
      [
        { id: 1, ...base, rankScore: 80 },
        { id: 2, makes: ["Ferrari"], interests: ["Classic"], rankScore: 10, vehicleTier: "make" },
      ],
      { lessLikeIds: [1] },
    );
    const marked = adjustments.find((item) => item.id === 1);
    const similar = adjustments.find((item) => item.id === 2);
    assert.ok((marked?.delta ?? 0) < 0);
    assert.ok((similar?.delta ?? 0) < 0);
    assert.ok((marked?.delta ?? 0) < (similar?.delta ?? 0));
    assert.equal(marked?.vehicleTier, "none");
  });

  it("does not infer ownership from reads — recent ids never change vehicleTier or similar makes", () => {
    const { adjustments } = applyReaderSignals(
      [
        { id: 1, ...base, vehicleTier: "none" },
        { id: 2, makes: ["Ferrari"], interests: ["Classic"], rankScore: 20, vehicleTier: "none" },
      ],
      { recentIds: [1] },
    );
    const opened = adjustments.find((item) => item.id === 1);
    const neighbour = adjustments.find((item) => item.id === 2);
    assert.equal(opened?.delta, READER_SIGNAL_WEIGHTS.recentDirect);
    assert.equal(opened?.vehicleTier, "none");
    assert.equal(neighbour?.delta, 0);
    assert.equal(neighbour?.kinds.includes("reader.recent.similar"), false);
    assert.deepEqual(opened?.reasons, []);
  });

  it("saves boost the article without setting a vehicle tier", () => {
    const { adjustments } = applyReaderSignals(
      [{ id: 8, ...base, vehicleTier: "none" }],
      { savedIds: [8] },
    );
    assert.equal(adjustments[0]?.delta, READER_SIGNAL_WEIGHTS.savedDirect);
    assert.equal(adjustments[0]?.vehicleTier, "none");
    assert.ok(adjustments[0]?.reasons.includes("You saved this"));
  });
});
