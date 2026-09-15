import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseFeedXml } from "./adapters/rss";
import { parseCsv } from "./csv";
import { extractEntities } from "./extract";
import { sameStoryKey } from "./normalize";
import { isPathAllowed, parseRobots } from "./robots";
import { scoreArticle } from "./rank";
import { isSitemapIndex, looksLikeArticleUrl, parseSitemapXml } from "./adapters/sitemap";
import { parseArticleMetadata, parseHomeLinks, robotsAllows } from "./adapters/scrape";

const rss = readFileSync(new URL("./__fixtures__/rss.xml", import.meta.url), "utf8");
const atom = readFileSync(new URL("./__fixtures__/atom.xml", import.meta.url), "utf8");
const bad = readFileSync(new URL("./__fixtures__/malformed.xml", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("./__fixtures__/sitemap.xml", import.meta.url), "utf8");

describe("csv", () => {
  it("parses quoted marque lists", () => {
    const rows = parseCsv(
      'id,publication,marques_covered\nauto_x,Flat 6,"Porsche only: 356; 911"\n',
    );
    assert.equal(rows[0].publication, "Flat 6");
    assert.match(rows[0].marques_covered, /911/);
  });
});

describe("rss/atom", () => {
  it("parses RSS 2.0 items", () => {
    const items = parseFeedXml(rss);
    assert.equal(items.length, 2);
    assert.equal(items[0].method, "rss");
    assert.match(items[0].canonicalUrl, /porsche-964/);
  });
  it("parses Atom entries", () => {
    const items = parseFeedXml(atom);
    assert.equal(items.length, 1);
    assert.equal(items[0].method, "atom");
    assert.match(items[0].title, /M3/);
  });
  it("rejects malformed HTML as a feed", () => {
    assert.throws(() => parseFeedXml(bad, "text/html"), /Not a genuine/);
  });
});

describe("sitemap", () => {
  it("extracts loc and filters article-like urls", () => {
    const urls = parseSitemapXml(sitemap);
    assert.equal(urls.length, 3);
    assert.equal(isSitemapIndex(sitemap), false);
    assert.equal(looksLikeArticleUrl("https://example.com/features/porsche-911", "https://example.com"), true);
    assert.equal(looksLikeArticleUrl("https://example.com/login", "https://example.com"), false);
  });
});

describe("scraper", () => {
  it("reads og metadata only", () => {
    const html = `<html><head>
      <meta property="og:title" content="Octane: Jaguar E-Type"/>
      <meta property="og:description" content="A classic feature."/>
      <meta property="og:url" content="https://octane.example/etype"/>
      <link rel="canonical" href="https://octane.example/etype"/>
    </head><body><p>Full body we must not store.</p></html>`;
    const item = parseArticleMetadata(html, "https://octane.example/etype");
    assert.equal(item?.title, "Octane: Jaguar E-Type");
    assert.doesNotMatch(item?.excerpt ?? "", /must not store/);
    const links = parseHomeLinks('<a href="/features/one">One</a>', "https://octane.example");
    assert.ok(links[0].includes("/features/one"));
  });
  it("returns null when scrape has no title", () => {
    assert.equal(parseArticleMetadata("<html></html>", "https://x.example"), null);
  });
});

describe("robots", () => {
  it("honours disallow unless a longer allow wins", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/ok\n");
    assert.equal(isPathAllowed("/news", rules), true);
    assert.equal(isPathAllowed("/private/secret", rules), false);
    assert.equal(robotsAllows("User-agent: *\nDisallow: /\n", "/anything"), false);
  });
});

describe("entities and ranking", () => {
  it("maps 964 Carrera RS to Porsche 911 964", () => {
    const extracted = extractEntities("Porsche 964 Carrera RS at Goodwood");
    assert.ok(extracted.makes.includes("Porsche"));
    assert.ok(extracted.models.includes("911"));
    assert.ok(extracted.generations.includes("964"));
  });
  it("maps Ferrari 355 aliases to F355", () => {
    const extracted = extractEntities("Ferrari 355 on the autostrada");
    assert.ok(extracted.makes.includes("Ferrari"));
    assert.ok(extracted.models.includes("F355"));
  });
  it("scores exact garage vehicle above generic news", () => {
    const porsche = extractEntities("Porsche 964 Carrera RS at Goodwood");
    const news = extractEntities("Industry briefing this week");
    const garage = [{ make: "Porsche", model: "911", generation: "964", variant: "Carrera RS" }];
    const vehicleScore = scoreArticle({
      ...porsche,
      excerpt: "A",
      relevance: "Excellent",
      vehicles: garage,
      userInterests: ["Classic"],
    });
    const generic = scoreArticle({
      ...news,
      excerpt: "A",
      relevance: "Good",
      vehicles: garage,
      userInterests: ["Classic"],
    });
    assert.ok(vehicleScore > generic);
  });
});

describe("dedupe", () => {
  it("groups the same title", () => {
    assert.equal(
      sameStoryKey("Porsche 911: The Last Fast Days"),
      sameStoryKey("porsche 911 the last fast days"),
    );
  });
});
