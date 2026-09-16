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
import { isEnglish } from "./language";

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

describe("enabled sources", () => {
  it("keeps wave 1 and adds ten CSV titles plus Turnpike", async () => {
    const {
      WAVE1_SOURCE_IDS,
      WAVE2_SOURCE_IDS,
      ENABLED_SOURCE_IDS,
      DISABLED_SOURCE_IDS,
      ENABLED_SOURCE_SET,
    } = await import("../../config/wave1-sources");
    assert.equal(WAVE1_SOURCE_IDS.length, 10);
    assert.equal(WAVE2_SOURCE_IDS.length, 11);
    assert.equal(ENABLED_SOURCE_IDS.length, 19);
    assert.ok((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_051"));
    assert.equal((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.deepEqual([...DISABLED_SOURCE_IDS], ["auto_012", "auto_048"]);
    assert.equal(ENABLED_SOURCE_SET.has("auto_012"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_048"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_008"), true);
  });
});

describe("english-only ingest", () => {
  it("keeps English teasers and mixed titles with English copy", () => {
    assert.equal(
      isEnglish(
        "Bizzarrini finishes Corsa Revival cars and moves on to new Giotto hypercar project - Octane Magazine",
        "With 24 homages to a 1965 Le Mans class winner now finished, the next project for Bizzarrini is a hypercar.",
      ),
      true,
    );
    assert.equal(isEnglish("Shop | ramp.space", "Shop | ramp.space"), true);
    assert.equal(
      isEnglish("Handmade in Zuffenhausen • Curves Magazin", "Handmade in Zuffenhausen • Curves Magazin"),
      true,
    );
    assert.equal(
      isEnglish(
        "Postkarte von der Autobahn",
        "After a gruelling Denmark-Switzerland trip in 2023 I swore off using motorways for continental journeys.",
      ),
      true,
    );
    assert.equal(
      isEnglish(
        "Concorso d’Eleganza Villa d’Este 2026: Another Unforgettable Weekend on Lake Como",
        "Two world premieres, 54 motoring jewels and a 1937 one-off roadster crowned Best of Show.",
      ),
      true,
    );
  });

  it("skips French, German, and non-Latin items without disabling mixed sources", () => {
    assert.equal(
      isEnglish(
        "Top 10 des plus belles livrées Porsche Motorsport",
        "Gulf, Rothmans, Pink Pig… Depuis plus de soixante ans, Porsche décore ses voitures de course avec autant de savoir-faire et de passion qu’elle en a mis à les concevoir.",
      ),
      false,
    );
    assert.equal(
      isEnglish(
        "#49 – Strassenrennen in Mugello 1914–1970 - AUTOMOBILSPORT Magazin",
        "Die Liebe zum AUTOMOBILSPORT verbindet uns und unsere Leser. AUTOMOBILSPORT berichtet vierteljährlich über Motorsport-Events im Bereich des Historischen Motorsports.",
      ),
      false,
    );
    assert.equal(
      isEnglish(
        "ramp.space - World's best luxury magazines | ramp.space",
        "Als multimediale Impact-Medienmarke steht ramp mit seinen vielfach ausgezeichneten Avantgarde-Luxus-Magazinen seit über 15 Jahren authentisch für Werte, Haltung und Exzellenz.",
      ),
      false,
    );
    assert.equal(isEnglish("保时捷 911 经典回归", "最新一期介绍了这台车的历史。"), false);
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
  it("maps classic restoration onto Cars, not Motorsport", async () => {
    const { articleMatchesNav, tagForArticle, primaryForArticle, resolveImageUrl } = await import(
      "./magazine"
    );
    const article = {
      categories: ["Classic"],
      interests: ["Restoration"],
      publication: "Octane",
      title: "E-Type restoration",
      excerpt: "A barn-find Jaguar E-Type restoration.",
    };
    assert.equal(primaryForArticle(article as never), "cars");
    assert.equal(articleMatchesNav(article as never, "cars"), true);
    assert.equal(articleMatchesNav(article as never, "classic"), true);
    assert.equal(articleMatchesNav(article as never, "motorsport"), false);
    assert.equal(tagForArticle(article as never), "Classic");
    assert.equal(
      resolveImageUrl("/img/hero.jpg", "https://octane.example/story"),
      "https://octane.example/img/hero.jpg",
    );
  });
});

describe("primary taxonomy", () => {
  it("assigns exactly one primary from the brief examples", async () => {
    const { classifyPrimary } = await import("./taxonomy");
    assert.equal(
      classifyPrimary({
        title: "Why the Porsche 964 is the ultimate analogue 911",
        excerpt: "The last of the air-cooled cars still feels like a collector performance 911.",
        categories: ["Classic", "Collector", "Performance"],
      }),
      "cars",
    );
    assert.equal(
      classifyPrimary({
        title: "The designers who changed Ferrari forever",
        excerpt: "An interview with the people who shaped Ferrari design history.",
        categories: ["Design", "People", "History"],
      }),
      "culture",
    );
    assert.equal(
      classifyPrimary({
        title: "Driving the Stelvio Pass in a Porsche 911",
        excerpt: "A road trip through the Alpine passes worth touring.",
        categories: ["Road Trips", "Driving", "Travel"],
      }),
      "driving",
    );
    assert.equal(
      classifyPrimary({
        title: "Ferrari racing history at Le Mans",
        excerpt: "The championship years and the drivers who won them.",
        categories: ["Motorsport", "History"],
      }),
      "motorsport",
    );
    assert.equal(
      classifyPrimary({
        title: "New concours announced at Villa d'Este",
        excerpt: "The gathering returns to the lawns this summer.",
        categories: ["Events", "News"],
      }),
      "events",
    );
  });

  it("maps the old magazine lanes onto the new primaries", async () => {
    const { LEGACY_NAV_TO_PRIMARY } = await import("../../config/magazine-nav");
    assert.equal(LEGACY_NAV_TO_PRIMARY.racing, "motorsport");
    assert.equal(LEGACY_NAV_TO_PRIMARY.classic, "cars");
    assert.equal(LEGACY_NAV_TO_PRIMARY.modified, "cars");
    assert.equal(LEGACY_NAV_TO_PRIMARY.concourse, "events");
    assert.equal(LEGACY_NAV_TO_PRIMARY.culture, "culture");
  });
});

describe("for you test profile", () => {
  it("only accepts catalog make/model and known interests", async () => {
    const { parseForYouTestProfile, forYouTestIsActive } = await import("./for-you-test");
    const profile = parseForYouTestProfile({
      make: "Porsche",
      model: "911",
      generation: "964",
      interest: ["Classic", "NotAThing"],
      location: "Goodwood",
    });
    assert.deepEqual(profile, {
      make: "Porsche",
      model: "911",
      generation: "964",
      interests: ["Classic"],
      location: "Goodwood",
    });
    assert.equal(forYouTestIsActive(profile), true);
    const rejected = parseForYouTestProfile({ make: "Honda", model: "Civic", interest: "Vibes" });
    assert.equal(rejected.make, undefined);
    assert.equal(rejected.model, undefined);
    assert.deepEqual(rejected.interests, []);
    assert.equal(forYouTestIsActive(rejected), false);
  });

  it("does not invent a vehicle match when the story has no entities", async () => {
    const { scoreArticle } = await import("./rank");
    const unmatched = scoreArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: ["Design"],
      categories: ["Design"],
      locations: [],
      excerpt: "A design essay with no car entities.",
      relevance: "Excellent",
      vehicles: [{ make: "Porsche", model: "911", generation: "964" }],
      userInterests: ["Classic"],
    });
    const matched = scoreArticle({
      makes: ["Porsche"],
      models: ["911"],
      generations: ["964"],
      variants: [],
      interests: ["Classic"],
      categories: ["Classic"],
      locations: [],
      excerpt: "Why the Porsche 964 is the ultimate analogue 911.",
      relevance: "Excellent",
      vehicles: [{ make: "Porsche", model: "911", generation: "964" }],
      userInterests: ["Classic"],
    });
    assert.ok(matched > unmatched);
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

describe("page summary extract", () => {
  it("prefers a standfirst over later paragraphs", async () => {
    const { extractPageSummary } = await import("./article-text");
    const html = `<html><body>
      <p class="standfirst">A hand-built revival of the 1965 Le Mans class winner is done.</p>
      <article>
        <p>The last of the Bizzarrini 5300 GT Corsa Revival cars has been completed in the UK.</p>
      </article>
    </body></html>`;
    assert.equal(
      extractPageSummary(html, { title: "Bizzarrini Corsa", teaser: "RSS teaser about a hypercar." }),
      "A hand-built revival of the 1965 Le Mans class winner is done.",
    );
  });

  it("skips a meta description that duplicates the RSS teaser and uses the first paragraph", async () => {
    const { extractPageSummary } = await import("./article-text");
    const teaser =
      "With 24 homages to a 1965 Le Mans class winner now finished, the next project for Bizzarrini is a hypercar.";
    const html = `<html><head>
      <meta property="og:description" content="${teaser}"/>
    </head><body><article>
      <p class="credits">Words: James Elliott</p>
      <p>The last of the Bizzarrini 5300 GT Corsa Revival cars has been completed, barely two years after the project began to hand-build two dozen clones of the 1965 Le Mans class winner.</p>
      <p>Never miss out on the latest classic car news from Octane, subscribe today!</p>
    </article></body></html>`;
    const extract = extractPageSummary(html, { title: "Bizzarrini finishes Corsa Revival", teaser });
    assert.match(extract ?? "", /last of the Bizzarrini 5300 GT Corsa Revival/);
    assert.doesNotMatch(extract ?? "", /24 homages/);
  });

  it("hides empty, title-only, or teaser-duplicate extracts", async () => {
    const { extractPageSummary, acceptExtract } = await import("./article-text");
    const teaser = "A classic feature about the Jaguar E-Type restoration.";
    assert.equal(acceptExtract("A classic feature about the Jaguar E-Type restoration.", "E-Type", teaser), null);
    assert.equal(acceptExtract("E-Type restoration", "E-Type restoration", teaser), null);
    assert.equal(
      extractPageSummary(
        `<html><head><meta name="description" content="${teaser}"/></head><body><p>Subscribe.</p></body></html>`,
        { title: "E-Type restoration", teaser },
      ),
      null,
    );
  });
});
