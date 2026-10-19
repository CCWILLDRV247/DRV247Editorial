import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DEFAULT_RANKED_LIST_KEYS,
  RANKED_LIST_LIMIT,
  parseRankedListKey,
} from "./ranked-list";

describe("durable ranked lists", () => {
  it("parses section:limit keys used by listEditorial", () => {
    assert.deepEqual(parseRankedListKey("for-you:80"), {
      section: "for-you",
      limit: 80,
      profileQuery: null,
    });
    assert.deepEqual(parseRankedListKey("cars:80"), { section: "cars", limit: 80, profileQuery: null });
    assert.equal(parseRankedListKey("for-you:80:profile=A&make=Ferrari")?.profileQuery, "profile=A&make=Ferrari");
    assert.equal(parseRankedListKey("nope"), null);
  });

  it("covers For You and each primary slug at the homepage limit", () => {
    assert.equal(RANKED_LIST_LIMIT, 80);
    assert.ok(DEFAULT_RANKED_LIST_KEYS.includes("for-you:80"));
    assert.ok(DEFAULT_RANKED_LIST_KEYS.includes("cars:80"));
    assert.ok(DEFAULT_RANKED_LIST_KEYS.includes("culture:80"));
    assert.ok(DEFAULT_RANKED_LIST_KEYS.includes("driving:80"));
    assert.ok(DEFAULT_RANKED_LIST_KEYS.includes("events:80"));
  });

  it("reads snapshot IDs before scoring the corpus on the default list path", () => {
    const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
    assert.match(queries, /listEditorialFromSnapshot/);
    assert.match(queries, /if \(hydrated\?\.length\) return hydrated/);
    assert.match(queries, /extrasByArticleIds\(ids, true\)/);
    assert.match(queries, /persistDefaultRankedLists/);
    assert.doesNotMatch(
      queries.slice(queries.indexOf("async function listEditorialDurable"), queries.indexOf("export async function persistDefaultRankedLists")),
      /loadEditorialCorpus\(\)/,
    );
  });

  it("writes snapshots at the end of weekly ingest and on desk save", () => {
    const weekly = readFileSync(new URL("./weekly-ingest.ts", import.meta.url), "utf8");
    assert.match(weekly, /persistDefaultRankedLists/);
    const desk = readFileSync(new URL("../../app/api/admin/desk/route.ts", import.meta.url), "utf8");
    assert.match(desk, /persistDefaultRankedLists/);
    assert.match(desk, /after\(/);
  });

  it("skips schema/seed on a Turso that already has ranked IDs", () => {
    const db = readFileSync(new URL("../db/index.ts", import.meta.url), "utf8");
    assert.match(db, /magazineReadPathReady/);
    assert.match(db, /ranked_list_entries LIMIT 1/);
    assert.match(db, /if \(!ready\) \{/);
  });

  it("applies articleMatchesForYouTest only when hardFilter is true", () => {
    const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
    const block = queries.slice(queries.indexOf("const applyHardFilter"), queries.indexOf("let vehicles"));
    assert.match(block, /options\?\.hardFilter === true/);
    assert.doesNotMatch(block, /isContentPrimary/);
  });

  it("caches and persists demo garages A–D, not ad-hoc make/model filters", () => {
    const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
    const cacheFn = queries.slice(
      queries.indexOf("function editorialListCacheKey"),
      queries.indexOf("export function bustEditorialCorpusMemo"),
    );
    assert.match(cacheFn, /isForYouDemoId\(options\.testProfile\.preset\)/);
    assert.match(cacheFn, /return null;/);
    assert.match(queries, /for \(const id of \["A", "B", "C", "D"\]/);
    assert.match(queries, /for-you:\$\{RANKED_LIST_LIMIT\}:\$\{forYouTestSearchString\(profile\)\}/);
  });
});
