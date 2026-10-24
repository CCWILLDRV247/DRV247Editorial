import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARTICLE_RELEVANCE_MAX,
  emptyArticleRelevance,
  parseArticleRelevance,
  toggleArticleRelevance,
} from "./relevance";

describe("article relevance marks", () => {
  it("parses empty and malformed payloads", () => {
    assert.deepEqual(parseArticleRelevance(null), emptyArticleRelevance());
    assert.deepEqual(parseArticleRelevance("{"), emptyArticleRelevance());
    assert.deepEqual(parseArticleRelevance('{"interested":[12],"less":[9]}'), {
      interested: [12],
      less: [9],
    });
  });

  it("toggles Interested / Less like this as mutually exclusive relevance marks", () => {
    const first = toggleArticleRelevance(emptyArticleRelevance(), 4, "interested");
    assert.equal(first.polarity, "interested");
    assert.deepEqual(first.state.interested, [4]);

    const flipped = toggleArticleRelevance(first.state, 4, "less");
    assert.equal(flipped.polarity, "less");
    assert.deepEqual(flipped.state, { interested: [], less: [4] });

    const cleared = toggleArticleRelevance(flipped.state, 4, "less");
    assert.equal(cleared.polarity, null);
    assert.deepEqual(cleared.state, emptyArticleRelevance());
  });

  it("caps each pole and ignores invalid ids", () => {
    const ids = Array.from({ length: ARTICLE_RELEVANCE_MAX + 5 }, (_, index) => index + 1);
    const state = parseArticleRelevance(JSON.stringify({ interested: ids, less: [0, -2, 3] }));
    assert.equal(state.interested.length, ARTICLE_RELEVANCE_MAX);
    assert.deepEqual(state.less, [3]);
    const ignored = toggleArticleRelevance(state, 0, "interested");
    assert.equal(ignored.polarity, null);
  });
});
