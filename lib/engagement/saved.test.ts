import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAVED_ARTICLES_MAX,
  isArticleSaved,
  normalizeSavedArticleIds,
  parseSavedArticleIds,
  serializeSavedArticleIds,
  toggleSavedArticleId,
} from "./saved";

describe("saved article ids", () => {
  it("parses JSON and comma lists, dropping junk", () => {
    assert.deepEqual(parseSavedArticleIds(null), []);
    assert.deepEqual(parseSavedArticleIds(""), []);
    assert.deepEqual(parseSavedArticleIds("[12,8,12,\"3\",0,-1,\"x\"]"), [12, 8, 3]);
    assert.deepEqual(parseSavedArticleIds("9, 4, 9, nope"), [9, 4]);
  });

  it("persists a stable JSON array of article ids", () => {
    const ids = toggleSavedArticleId([], 21).ids;
    assert.deepEqual(ids, [21]);
    assert.equal(serializeSavedArticleIds(ids), "[21]");
    assert.deepEqual(parseSavedArticleIds(serializeSavedArticleIds(ids)), [21]);
  });

  it("toggles save and keeps most-recent first", () => {
    const first = toggleSavedArticleId([], 10);
    assert.equal(first.saved, true);
    const second = toggleSavedArticleId(first.ids, 11);
    assert.deepEqual(second.ids, [11, 10]);
    assert.equal(isArticleSaved(second.ids, 10), true);
    const removed = toggleSavedArticleId(second.ids, 10);
    assert.equal(removed.saved, false);
    assert.deepEqual(removed.ids, [11]);
  });

  it("caps the clip at 50 unique ids", () => {
    const overflow = Array.from({ length: SAVED_ARTICLES_MAX + 5 }, (_, index) => index + 1);
    const capped = normalizeSavedArticleIds(overflow);
    assert.equal(capped.length, SAVED_ARTICLES_MAX);
    assert.equal(capped[0], 1);
    const prepended = toggleSavedArticleId(capped, 999);
    assert.equal(prepended.ids[0], 999);
    assert.equal(prepended.ids.length, SAVED_ARTICLES_MAX);
    assert.ok(!prepended.ids.includes(SAVED_ARTICLES_MAX));
  });
});
