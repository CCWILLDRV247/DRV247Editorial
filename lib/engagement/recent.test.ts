import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseRecentInteractions,
  recentInteractionArticleIds,
  recordRecentInteraction,
} from "./recent";

describe("recent interactions", () => {
  it("stores ids only — no make or ownership fields", () => {
    const items = recordRecentInteraction([], { articleId: 11, kind: "open", at: 100 });
    assert.deepEqual(recentInteractionArticleIds(items), [11]);
    assert.deepEqual(Object.keys(items[0]!).sort(), ["articleId", "at", "kind"]);
    assert.equal("make" in items[0]!, false);
  });

  it("parses and moves the same article+kind to the front", () => {
    const first = recordRecentInteraction(
      parseRecentInteractions('[{"articleId":2,"kind":"open","at":1}]'),
      { articleId: 3, kind: "share", at: 2 },
    );
    const again = recordRecentInteraction(first, { articleId: 2, kind: "open", at: 3 });
    assert.equal(again[0]?.articleId, 2);
    assert.equal(again.length, 2);
  });
});
