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
    assert.equal(items[0].imageUrl, "https://cdn.example.com/964.jpg");
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

describe("admin ingest routing", () => {
  it("sends a bare ingest click to the culture engine", async () => {
    const { adminIngestMode } = await import("./admin-ingest");
    assert.equal(adminIngestMode({}), "culture");
    assert.equal(adminIngestMode(null), "culture");
    assert.equal(adminIngestMode({ pipeline: "v1" }), "v1");
    assert.equal(adminIngestMode({ sourceId: 3 }), "v1");
  });
});

describe("admin login path", () => {
  it("keeps desk paths and rejects open redirects", async () => {
    const { safeAdminPath } = await import("../auth");
    assert.equal(safeAdminPath("/admin/engine"), "/admin/engine");
    assert.equal(safeAdminPath("/admin"), "/admin");
    assert.equal(safeAdminPath("//evil.example"), "/admin/engine");
    assert.equal(safeAdminPath("https://evil.example"), "/admin/engine");
  });
});

describe("magazine mapping", () => {
  it("maps classic interests onto the Classic desk", async () => {
    const { articleMatchesNav, tagForArticle, resolveImageUrl } = await import("./magazine");
    const article = {
      categories: ["Classic"],
      interests: ["Restoration"],
      publication: "Octane",
      title: "E-Type restoration",
    };
    assert.equal(articleMatchesNav(article as never, "classic"), true);
    assert.equal(articleMatchesNav(article as never, "modified"), false);
    assert.equal(tagForArticle(article as never), "Classic");
    assert.equal(
      resolveImageUrl("/img/hero.jpg", "https://octane.example/story"),
      "https://octane.example/img/hero.jpg",
    );
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

describe("article text for AI summaries", () => {
  it("extracts article paragraphs and ignores boilerplate", async () => {
    const { extractArticleText, acceptAiSummary } = await import("./article-text");
    const html = `<html><head><title>Bizzarrini Corsa</title></head>
      <body>
        <article>
          <p>Words: James Elliott</p>
          <p>The last of the Bizzarrini 5300 GT Corsa Revival cars has been completed, barely two years after the project began to hand-build two dozen clones of the 1965 Le Mans class winner.</p>
          <p>Each Revival car uses a single-piece composite body over a steel frame, while there is a six-point roll-cage inside and a safety fuel cell that meets FIA Appendix K.</p>
          <p>The cars have been built in the UK and the company will now embark on its next project, the Giotto hypercar.</p>
          <p>Simon Busby, Bizzarrini CMO, said the Revival was envisioned as a reintroduction of the brand to the elite tiers of the automotive world.</p>
          <p>Never miss out on the latest classic car news from Octane, subscribe today!</p>
        </article>
        <script>document.title = "track this"</script>
      </body></html>`;
    const text = extractArticleText(html);
    assert.ok(text);
    assert.match(text!, /Giotto hypercar/);
    assert.doesNotMatch(text!, /subscribe today/);
    assert.doesNotMatch(text!, /track this/);
    assert.equal(acceptAiSummary("NONE", "Bizzarrini Corsa"), null);
    assert.equal(acceptAiSummary("Bizzarrini Corsa", "Bizzarrini Corsa"), null);
    assert.match(
      acceptAiSummary(
        "The last Revival cars are done in the UK. Bizzarrini now turns to the Giotto hypercar.",
        "Bizzarrini Corsa",
      ) ?? "",
      /Giotto/,
    );
  });

  it("returns null when the page is too thin to summarize", async () => {
    const { extractArticleText } = await import("./article-text");
    assert.equal(
      extractArticleText("<html><head><title>Paywall</title></head><body><p>Subscribe.</p></body></html>"),
      null,
    );
  });
});
