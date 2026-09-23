import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseFeedXml } from "./adapters/rss";
import { ENGINE_UA } from "./http";
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

describe("http", () => {
  it("uses a browser user-agent so Autocar and Top Gear do not 403", () => {
    assert.match(ENGINE_UA, /^Mozilla\/5\.0 /);
  });
});

describe("rss/atom", () => {
  it("parses RSS 2.0 items", () => {
    const items = parseFeedXml(rss);
    assert.equal(items.length, 4);
    assert.equal(items[0].method, "rss");
    assert.match(items[0].canonicalUrl, /porsche-964/);
    assert.equal(items[0].imageUrl, "https://cdn.example.com/964.jpg");
  });
  it("reads HTML-entity-encoded img tags in RSS descriptions", () => {
    const items = parseFeedXml(rss);
    const encoded = items.find((item) => item.title === "Autocar encoded image");
    assert.equal(encoded?.imageUrl, "https://cdn.example.com/volvo.jpg?itok=1");
  });
  it("reads enclosure images when type comes before url", () => {
    const items = parseFeedXml(rss);
    const enclosure = items.find((item) => item.title === "Enclosure type first");
    assert.equal(enclosure?.imageUrl, "https://cdn.example.com/hero-untyped-path");
  });
  it("prefers media:content over enclosure and html images", () => {
    const items = parseFeedXml(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
        <item>
          <title>Both media and enclosure</title>
          <link>https://example.com/both</link>
          <enclosure type="image/jpeg" url="https://cdn.example.com/enclosure.jpg" />
          <media:content url="https://cdn.example.com/media.jpg" medium="image" />
          <description><![CDATA[<img src="https://cdn.example.com/body.jpg" />]]></description>
        </item>
      </channel></rss>`);
    assert.equal(items[0]?.imageUrl, "https://cdn.example.com/media.jpg");
    assert.equal(items[0]?.imageCandidates?.[0]?.sourceType, "rss_media");
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
    assert.equal(looksLikeArticleUrl("https://www.euro-stance.com/collections/hoodies-eurostance", "https://www.euro-stance.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.euro-stance.com/products/hoodie", "https://www.euro-stance.com"), false);
    assert.equal(looksLikeArticleUrl("https://ramp.space/en/shop/magazine", "https://ramp.space"), false);
    assert.equal(looksLikeArticleUrl("https://theroadrat.com/shop/magazine", "https://theroadrat.com"), false);
    assert.equal(looksLikeArticleUrl("https://example.com/cart", "https://example.com"), false);
    assert.equal(looksLikeArticleUrl("https://example.com/merch", "https://example.com"), false);
    assert.equal(looksLikeArticleUrl("https://example.com/checkout", "https://example.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.pistonheads.com/undefined", "https://www.pistonheads.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.pistonheads.com/news", "https://www.pistonheads.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.pistonheads.com/buy/auctions", "https://www.pistonheads.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.pistonheads.com/sell", "https://www.pistonheads.com"), false);
    assert.equal(looksLikeArticleUrl("https://www.autosport.com/subscribe", "https://www.autosport.com"), false);
    assert.equal(
      looksLikeArticleUrl(
        "https://www.pistonheads.com/news/ph-plus/porsche-911-gt3",
        "https://www.pistonheads.com",
      ),
      true,
    );
    assert.equal(
      looksLikeArticleUrl(
        "https://classicsworld.co.uk/classic-car-auctions/auction-review-manor-park",
        "https://classicsworld.co.uk",
      ),
      true,
    );
    assert.equal(
      looksLikeArticleUrl(
        "https://www.classicandsportscar.com/classic-cars-a-to-z",
        "https://www.classicandsportscar.com",
      ),
      false,
    );
    assert.equal(
      looksLikeArticleUrl(
        "https://www.classicandsportscar.com/parts-services",
        "https://www.classicandsportscar.com",
      ),
      false,
    );
    assert.equal(looksLikeArticleUrl("https://dyler.com/users/sign_up", "https://dyler.com"), false);
    assert.equal(looksLikeArticleUrl("https://dyler.com/users/sign_in", "https://dyler.com"), false);
    assert.equal(looksLikeArticleUrl("https://dyler.com/blog", "https://dyler.com"), false);
    assert.equal(looksLikeArticleUrl("https://dyler.com/cars/makes", "https://dyler.com"), false);
    assert.equal(
      looksLikeArticleUrl(
        "https://www.classicandsportscar.com/gallery/30-years-lotus-elise",
        "https://www.classicandsportscar.com",
      ),
      true,
    );
    assert.equal(
      looksLikeArticleUrl("https://bonnetmagazine.com/pages/articles", "https://bonnetmagazine.com"),
      false,
    );
    assert.equal(
      looksLikeArticleUrl(
        "https://bonnetmagazine.com/blogs/journal/a-feature",
        "https://bonnetmagazine.com",
      ),
      true,
    );
    assert.equal(looksLikeArticleUrl("https://dyler.com/sell-car", "https://dyler.com"), false);
    assert.equal(looksLikeArticleUrl("https://dyler.com/events", "https://dyler.com"), false);
    assert.equal(
      looksLikeArticleUrl("https://dyler.com/cars/1965-porsche-911", "https://dyler.com"),
      true,
    );
    assert.equal(
      looksLikeArticleUrl(
        "https://www.streetmachine.com.au/events/get-in-quick-for-early-bird-tickets-to-the-castlemaine-rod-shop-invitational-3",
        "https://www.streetmachine.com.au",
      ),
      true,
    );
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
    assert.equal(item?.imageUrl, null);
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
  it("maps 993 and 996 to the 911 family without the word 911", () => {
    const air = extractEntities("Porsche 993: Your DNHC questions answered");
    assert.ok(air.makes.includes("Porsche"));
    assert.ok(air.models.includes("911"));
    assert.ok(air.generations.includes("993"));
    const water = extractEntities("996 Carrera v 4S: which is best?");
    assert.ok(water.models.includes("911"));
    assert.ok(water.generations.includes("996"));
    const plural = extractEntities("Why have Porsche 993s exploded in value?");
    assert.ok(plural.models.includes("911"));
    assert.ok(plural.generations.includes("993"));
  });
  it("maps GT3 and 355 GTB via aliases", () => {
    const gt3 = extractEntities("Porsche GT3 Bergsport");
    assert.ok(gt3.makes.includes("Porsche"));
    assert.ok(gt3.models.includes("911"));
    assert.ok(gt3.variants.includes("GT3"));
    const f355 = extractEntities("A restored 355 GTB on the autostrada");
    assert.ok(f355.makes.includes("Ferrari"));
    assert.ok(f355.models.includes("F355"));
  });
  it("reads the extracted paragraph, not title-only", () => {
    const extracted = extractEntities(
      "Weekend drive",
      "A short teaser with no marque.",
      "The 964 remains the last analogue 911, and it still feels special on a damp B-road.",
    );
    assert.ok(extracted.makes.includes("Porsche"));
    assert.ok(extracted.models.includes("911"));
    assert.ok(extracted.generations.includes("964"));
  });
  it("does not treat 1996 as a 996", () => {
    const extracted = extractEntities("The best of 1996", "A year in review for collectors.");
    assert.equal(extracted.models.includes("911"), false);
    assert.equal(extracted.generations.includes("996"), false);
  });
  it("maps Ferrari 355 aliases to F355", () => {
    const extracted = extractEntities("Ferrari 355 on the autostrada");
    assert.ok(extracted.makes.includes("Ferrari"));
    assert.ok(extracted.models.includes("F355"));
  });
  it("offers every gazetteer marque in the picker, including Honda with no stories", async () => {
    const { VEHICLE_CATALOG } = await import("./catalog");
    const { forYouTestCatalog: picker } = await import("./for-you-test");
    const names = VEHICLE_CATALOG.map((row) => row.make);
    assert.equal(new Set(names).size, names.length);
    for (const make of [
      "Porsche",
      "Ferrari",
      "BMW",
      "Mercedes-Benz",
      "Audi",
      "Volkswagen",
      "Ford",
      "Jaguar",
      "Land Rover",
      "Aston Martin",
      "Bentley",
      "Lotus",
      "McLaren",
      "Lamborghini",
      "Maserati",
      "Alfa Romeo",
      "Fiat",
      "Lancia",
      "Volvo",
      "Saab",
      "Renault",
      "Peugeot",
      "Citroën",
      "Honda",
      "Toyota",
      "Nissan",
      "Mazda",
      "Subaru",
      "Mini",
      "Rolls-Royce",
      "Morgan",
      "TVR",
      "Pagani",
      "Koenigsegg",
      "Bugatti",
    ]) {
      assert.ok(names.includes(make), make);
    }
    assert.ok(names.length >= 80, `gazetteer too short: ${names.length}`);
    const catalog = picker();
    assert.equal(catalog.makes.length, names.length);
    assert.ok(catalog.makes.some((item) => item.name === "Honda"));
    const civic = extractEntities("Honda Civic Type R at Suzuka");
    assert.ok(civic.makes.includes("Honda"));
    assert.ok(civic.models.includes("Civic"));
    assert.ok(civic.variants.includes("Type R"));
    const citroen = extractEntities("A restored Citroën 2CV on a French D-road");
    assert.ok(citroen.makes.includes("Citroën"));
    assert.ok(citroen.models.includes("2CV"));
    const audi = extractEntities("Audi R8 into the sunset");
    assert.ok(audi.makes.includes("Audi"));
    assert.ok(audi.models.includes("R8"));
    const seat = extractEntities("The passenger seat of a classic coach");
    assert.equal(seat.makes.includes("SEAT"), false);
    const focus = extractEntities("A focus on classic design");
    assert.equal(focus.makes.includes("Ford"), false);
    const alpineRoads = extractEntities("Alpine roads in the Dolomites, no particular car");
    assert.equal(alpineRoads.makes.includes("Alpine"), false);
  });
  it("scores a For You 911 pick against 964/993 stories as a model match", () => {
    const gen = extractEntities("Air-cooled 993 values keep climbing");
    const garage = [{ make: "Porsche", model: "911" }];
    const modelScore = scoreArticle({
      ...gen,
      excerpt: "A",
      relevance: "Good",
      vehicles: garage,
      userInterests: [],
    });
    const makeOnly = scoreArticle({
      makes: ["Porsche"],
      models: [],
      generations: [],
      variants: [],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: garage,
      userInterests: [],
    });
    assert.ok(gen.models.includes("911"));
    assert.ok(modelScore > makeOnly);
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
  it("enables underground Priority titles and keeps the dark list off", async () => {
    const {
      WAVE1_SOURCE_IDS,
      WAVE2_SOURCE_IDS,
      WAVE3_SOURCE_IDS,
      WAVE4_SOURCE_IDS,
      WAVE5_SOURCE_IDS,
      UNDERGROUND_SOURCE_IDS,
      ENABLED_SOURCE_IDS,
      DISABLED_SOURCE_IDS,
      ENABLED_SOURCE_SET,
    } = await import("../../config/wave1-sources");
    const { loadCsvSources } = await import("./seed");
    assert.equal(WAVE1_SOURCE_IDS.length, 10);
    assert.equal(WAVE2_SOURCE_IDS.length, 11);
    assert.equal(WAVE3_SOURCE_IDS.length, 10);
    assert.equal(WAVE4_SOURCE_IDS.length, 10);
    assert.equal(WAVE5_SOURCE_IDS.length, 9);
    assert.equal(UNDERGROUND_SOURCE_IDS.length, 28);
    assert.equal(ENABLED_SOURCE_IDS.length, 74);
    assert.ok((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_051"));
    assert.ok((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_022"));
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_022"), false);
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_012"), false);
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_013"), false);
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_048"), false);
    assert.equal((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_049"), false);
    assert.ok((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_054"));
    assert.ok((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_103"));
    assert.ok((UNDERGROUND_SOURCE_IDS as readonly string[]).includes("auto_131"));
    assert.equal((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_018"), false);
    assert.equal((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_035"), false);
    assert.equal((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_049"), false);
    assert.ok((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_039"));
    assert.ok((WAVE5_SOURCE_IDS as readonly string[]).includes("auto_050"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_012"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_048"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_013"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_049"));
    assert.equal(ENABLED_SOURCE_SET.has("auto_011"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_012"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_048"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_013"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_049"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_018"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_020"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_022"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_023"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_035"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_044"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_054"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_095"), true);
    const csv = loadCsvSources();
    assert.equal(csv.length, 79);
    const byId = new Map(csv.map((row) => [row.id, row]));
    assert.equal(byId.get("auto_022")?.publication, "Fast Car");
    assert.equal(byId.get("auto_054")?.publication, "Petrolicious");
    assert.equal(byId.get("auto_054")?.enabled.toLowerCase(), "true");
    assert.equal(byId.get("auto_103")?.publication, "Classic Cars");
    assert.equal(byId.get("auto_111")?.publication, "Engine Swap Depot");
    assert.equal(byId.has("auto_052"), false);
    assert.equal(byId.has("auto_011"), true);
  });
});

describe("merch exclusion", () => {
  it("skips shop path segments and treats EuroStance as a disabled shop source", async () => {
    const { isMerchUrl, isMerchArticle } = await import("./merch");
    const { MERCH_SOURCE_POLICY, MERCH_PATH_SEGMENTS } = await import("../../config/merch");
    assert.equal(MERCH_SOURCE_POLICY.auto_013.action, "disable");
    for (const segment of [
      "shop",
      "product",
      "products",
      "collection",
      "collections",
      "cart",
      "merch",
    ]) {
      assert.ok((MERCH_PATH_SEGMENTS as readonly string[]).includes(segment), segment);
    }
    assert.equal(isMerchUrl("https://www.euro-stance.com/collections/kids-wear"), true);
    assert.equal(isMerchUrl("https://www.euro-stance.com/collections/t-shirts-eurostance"), true);
    assert.equal(isMerchUrl("https://bonnetmagazine.com/collections/fine-art-prints-all"), true);
    assert.equal(isMerchUrl("https://www.the-intercooler.com/features/porsche-993"), false);
    assert.equal(
      isMerchArticle({
        sourceId: "auto_013",
        url: "https://www.euro-stance.com/pages/about",
        canonicalUrl: "https://www.euro-stance.com/pages/about",
      }),
      true,
    );
  });
});

describe("non-editorial url skip", () => {
  it("skips empty URLs, auction/subscribe paths, and magazine-shop hosts without a title denylist", async () => {
    const {
      isNonEditorialUrl,
      isNonEditorialArticle,
      isUnusableArticleUrl,
    } = await import("./non-editorial");
    const { NON_EDITORIAL_PATH_SEGMENTS, NON_EDITORIAL_HOSTS } = await import(
      "../../config/non-editorial"
    );
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("auctions"));
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("subscribe"));
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("buy"));
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("sell"));
    assert.ok((NON_EDITORIAL_HOSTS as readonly string[]).includes("themagazineshop.com"));

    assert.equal(isUnusableArticleUrl(""), true);
    assert.equal(isUnusableArticleUrl("undefined"), true);
    assert.equal(isUnusableArticleUrl("https://www.pistonheads.com/undefined"), true);
    assert.equal(isUnusableArticleUrl("https://www.pistonheads.com/news"), true);
    assert.equal(isUnusableArticleUrl("https://www.pistonheads.com/news/ph-plus/porsche-911"), false);
    assert.equal(
      isNonEditorialUrl("https://www.pistonheads.com/undefined", "https://www.pistonheads.com"),
      true,
    );
    assert.equal(
      isNonEditorialUrl("https://www.pistonheads.com/buy/auctions", "https://www.pistonheads.com"),
      true,
    );
    assert.equal(
      isNonEditorialUrl("https://www.pistonheads.com/sell", "https://www.pistonheads.com"),
      true,
    );
    assert.equal(
      isNonEditorialUrl("https://www.pistonheads.com/buy/search", "https://www.pistonheads.com"),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.themagazineshop.com/classic-sports-car",
        "https://www.classicandsportscar.com",
      ),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.practicalclassics.co.uk/magazine/offers/subscribe-to-practical-classics",
        "https://www.practicalclassics.co.uk",
      ),
      true,
    );
    assert.equal(
      isNonEditorialUrl("https://www.autosport.com/subscribe", "https://www.autosport.com"),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.pistonheads.com/news/ph-plus/stop-dreaming-start-driving-feature",
        "https://www.pistonheads.com",
      ),
      false,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://classicsworld.co.uk/classic-car-auctions/auction-review-manor-park-classics-north-july-18",
        "https://classicsworld.co.uk",
      ),
      false,
    );
    assert.equal(
      isNonEditorialArticle(
        {
          url: "https://www.pistonheads.com/buy/auctions",
          canonicalUrl: "https://www.pistonheads.com/buy/auctions",
        },
        "https://www.pistonheads.com",
      ),
      true,
    );
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("sign_up"));
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("sign_in"));
    assert.ok((NON_EDITORIAL_PATH_SEGMENTS as readonly string[]).includes("parts-services"));
    assert.equal(
      isUnusableArticleUrl("https://www.classicandsportscar.com/classic-cars-a-to-z"),
      true,
    );
    assert.equal(
      isUnusableArticleUrl("https://www.classicandsportscar.com/parts-services"),
      true,
    );
    assert.equal(isUnusableArticleUrl("https://dyler.com/blog"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/cars/makes"), true);
    assert.equal(
      isNonEditorialUrl(
        "https://www.classicandsportscar.com/classic-cars-a-to-z",
        "https://www.classicandsportscar.com",
      ),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.classicandsportscar.com/parts-services",
        "https://www.classicandsportscar.com",
      ),
      true,
    );
    assert.equal(isNonEditorialUrl("https://dyler.com/users/sign_up", "https://dyler.com"), true);
    assert.equal(isNonEditorialUrl("https://dyler.com/users/sign_in", "https://dyler.com"), true);
    assert.equal(isNonEditorialUrl("https://dyler.com/blog", "https://dyler.com"), true);
    assert.equal(isNonEditorialUrl("https://dyler.com/cars/makes", "https://dyler.com"), true);
    assert.equal(
      isNonEditorialUrl(
        "https://www.classicandsportscar.com/gallery/30-years-lotus-elise",
        "https://www.classicandsportscar.com",
      ),
      false,
    );
    assert.equal(isNonEditorialUrl("https://dyler.com/blog/a-classic-feature", "https://dyler.com"), false);
    assert.equal(isUnusableArticleUrl("https://engineswapdepot.com/"), true);
    assert.equal(isUnusableArticleUrl("https://engineswapdepot.com/?p=153222"), false);
    assert.equal(
      isNonEditorialUrl("https://engineswapdepot.com/?p=153222", "https://engineswapdepot.com"),
      false,
    );
    assert.equal(isUnusableArticleUrl("https://bonnetmagazine.com/pages/articles"), true);
    assert.equal(isUnusableArticleUrl("https://bonnetmagazine.com/pages/articles/"), true);
    assert.equal(
      isNonEditorialUrl("https://bonnetmagazine.com/pages/articles", "https://bonnetmagazine.com"),
      true,
    );
    assert.equal(isUnusableArticleUrl("https://bonnetmagazine.com/pages/about-us"), true);
    assert.equal(isUnusableArticleUrl("https://bonnetmagazine.com/pages/about-us/"), true);
    assert.equal(
      isNonEditorialUrl("https://bonnetmagazine.com/pages/about-us", "https://bonnetmagazine.com"),
      true,
    );
    assert.equal(
      isNonEditorialArticle(
        {
          url: "https://bonnetmagazine.com/pages/about-us",
          canonicalUrl: "https://bonnetmagazine.com/pages/about-us",
        },
        "https://bonnetmagazine.com",
      ),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://bonnetmagazine.com/blogs/journal/a-feature",
        "https://bonnetmagazine.com",
      ),
      false,
    );
    assert.equal(isUnusableArticleUrl("https://dyler.com/sell-car"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/sell-car/"), true);
    assert.equal(isNonEditorialUrl("https://dyler.com/sell-car", "https://dyler.com"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/events"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/events/"), true);
    assert.equal(isNonEditorialUrl("https://dyler.com/events", "https://dyler.com"), true);
    assert.equal(
      isNonEditorialArticle(
        {
          url: "https://dyler.com/events",
          canonicalUrl: "https://dyler.com/events",
        },
        "https://dyler.com",
      ),
      true,
    );
    assert.equal(isUnusableArticleUrl("https://bonnetmagazine.com/search"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/cars"), true);
    assert.equal(isUnusableArticleUrl("https://dyler.com/life.rss"), true);
    assert.equal(
      isNonEditorialUrl("https://dyler.com/cars/1965-porsche-911", "https://dyler.com"),
      false,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.classicandsportscar.com/gallery/30-years-lotus-elise",
        "https://www.classicandsportscar.com",
      ),
      false,
    );
    assert.equal(
      isNonEditorialUrl("https://shop.kelsey.co.uk/temp-meg-50", "https://shop.kelsey.co.uk"),
      true,
    );
    assert.equal(
      isNonEditorialUrl(
        "https://www.streetmachine.com.au/events/get-in-quick-for-early-bird-tickets-to-the-castlemaine-rod-shop-invitational-3",
        "https://www.streetmachine.com.au",
      ),
      false,
    );
  });
});

describe("editorial eligibility gate", () => {
  it("excludes about pages, bookazine commerce, giveaways, and ticket promos without banning editorial competition coverage", async () => {
    const { evaluateEditorialEligibility } = await import("./editorial-eligibility");

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://bonnetmagazine.com/pages/about-us",
        canonicalUrl: "https://bonnetmagazine.com/pages/about-us",
        title: "About Us",
        excerpt: "Bonnet Magazine",
        sourceId: "auto_001",
        sourceUrl: "https://bonnetmagazine.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "about_page" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.practicalclassics.co.uk/magazine/offers/bookazines",
        canonicalUrl: "https://www.practicalclassics.co.uk/magazine/offers/bookazines",
        title: "Limited-Edition Bookazines – ON SALE NOW!",
        excerpt: "Grab your copy today.",
        sourceId: "auto_021",
        sourceUrl: "https://www.practicalclassics.co.uk",
      }),
      { editorialEligible: false, editorialExclusionReason: "commerce" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.practicalclassics.co.uk/competitions/latest-competitions/win-a-twin-busch-scissor-lift-worth-2199",
        canonicalUrl:
          "https://www.practicalclassics.co.uk/competitions/latest-competitions/win-a-twin-busch-scissor-lift-worth-2199",
        title: "Win a Twin Busch Scissor Lift, worth £2,199!",
        excerpt: "Enter now.",
        sourceId: "auto_021",
        sourceUrl: "https://www.practicalclassics.co.uk",
      }),
      { editorialEligible: false, editorialExclusionReason: "competition" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://japanesenostalgiccar.com/get-5-off-jccs-tickets-with-this-coupon-code",
        canonicalUrl: "https://japanesenostalgiccar.com/get-5-off-jccs-tickets-with-this-coupon-code",
        title: "Get $5 off JCCS tickets with this coupon code",
        excerpt: "Use this code at checkout.",
        sourceId: "auto_012",
        sourceUrl: "https://japanesenostalgiccar.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "ticket_sales" },
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://www.autosport.com/news/byd-competition-car-breaks-cover",
        canonicalUrl: "https://www.autosport.com/news/byd-competition-car-breaks-cover",
        title: "BYD competition car breaks cover in Romania",
        excerpt: "The new prototype was spotted testing.",
        sourceId: "auto_018",
        sourceUrl: "https://www.autosport.com",
      }).editorialEligible,
      true,
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://www.pistonheads.com/news/ph-plus/porsche-911-turbo-s-review",
        canonicalUrl: "https://www.pistonheads.com/news/ph-plus/porsche-911-turbo-s-review",
        title: "Porsche 911 Turbo S Is Now Available — Here's What We Know",
        excerpt: "We drove the latest Turbo S on track.",
        sourceId: "auto_020",
        sourceUrl: "https://www.pistonheads.com",
      }).editorialEligible,
      true,
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://dyler.com/events",
        canonicalUrl: "https://dyler.com/events",
        title: "Classic Car Shows Calendar 2021 - Dyler",
        excerpt: "List of great classic car shows in the UK, Europe and around the world",
        sourceId: "auto_017",
        sourceUrl: "https://dyler.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "category_page" },
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://www.streetmachine.com.au/events/get-in-quick-for-early-bird-tickets-to-the-castlemaine-rod-shop-invitational-3",
        canonicalUrl:
          "https://www.streetmachine.com.au/events/get-in-quick-for-early-bird-tickets-to-the-castlemaine-rod-shop-invitational-3",
        title: "Get in quick for early-bird tickets to the Castlemaine Rod Shop Invitational #3",
        excerpt: "The invitational returns to Castlemaine.",
        sourceId: "auto_066",
        sourceUrl: "https://www.streetmachine.com.au",
      }).editorialEligible,
      true,
    );
  });

  it("drops giveaway promos, search chrome, house notes, and reader prompts without banning car stories", async () => {
    const { evaluateEditorialEligibility } = await import("./editorial-eligibility");

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://fuelcurve.com/red-hot-american-muscle-turning-up-the-heat-with-the-2027-grand-prize-giveaway-1966-chevelle",
        canonicalUrl:
          "https://fuelcurve.com/red-hot-american-muscle-turning-up-the-heat-with-the-2027-grand-prize-giveaway-1966-chevelle",
        title: "Red Hot American Muscle – Turning Up the Heat With the 2027 Grand Prize Giveaway 1966 Chevelle",
        excerpt: "Goodguys is bringing the heat with their 2027 Grand Prize Giveaway 1966 Chevelle!",
        sourceId: "auto_061",
        sourceUrl: "https://fuelcurve.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "competition" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://bonnetmagazine.com/search",
        canonicalUrl: "https://bonnetmagazine.com/search",
        title: "Search",
        excerpt: "Discover exclusive automotive articles.",
        sourceId: "auto_001",
        sourceUrl: "https://bonnetmagazine.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "category_page" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://dyler.com/cars",
        canonicalUrl: "https://dyler.com/cars",
        title: "Search for a Classic and Modern Car | Dyler - Dyler",
        excerpt: "Buy a classic car on Dyler. Use our search.",
        sourceId: "auto_017",
        sourceUrl: "https://dyler.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "category_page" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.the-intercooler.com/library/latest/we-have-news",
        canonicalUrl: "https://www.the-intercooler.com/library/latest/we-have-news",
        title: "We have news",
        excerpt:
          "Five years ago Ti reinvented the automotive publishing model. It’s time for the next stage of our evolution.",
        sourceId: "auto_004",
        sourceUrl: "https://www.the-intercooler.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "subscription" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://driventowrite.com/2026/09/18/show-us-yer-sixpack",
        canonicalUrl: "https://driventowrite.com/2026/09/18/show-us-yer-sixpack",
        title: "Show Us Yer SIXPACK",
        excerpt: "Trust the Americans to show us how to build muscle.",
        sourceId: "auto_014",
        sourceUrl: "https://driventowrite.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "low_editorial_value" },
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://www.autoexpress.co.uk/dodge/370449/new-dodge-charger-sixpack-2026-pictures",
        canonicalUrl: "https://www.autoexpress.co.uk/dodge/370449/new-dodge-charger-sixpack-2026-pictures",
        title: "New Dodge Charger Sixpack and Daytona 2026 - pictures",
        excerpt: "Pictures of the new Dodge Charger Sixpack and Daytona.",
        sourceId: "auto_027",
        sourceUrl: "https://www.autoexpress.co.uk",
      }).editorialEligible,
      true,
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://fuelcurve.com/good-times-cool-parts-and-loads-of-prizes-at-the-goodguys-28th-griots-garage-colorado-nationals",
        canonicalUrl:
          "https://fuelcurve.com/good-times-cool-parts-and-loads-of-prizes-at-the-goodguys-28th-griots-garage-colorado-nationals",
        title: "Good Times, Cool Parts, and Loads of Prizes at the Goodguys 28th Griot’s Garage Colorado Nationals",
        excerpt: "Pack up the classic and head to Loveland for the Colorado Nationals.",
        sourceId: "auto_061",
        sourceUrl: "https://fuelcurve.com",
      }).editorialEligible,
      true,
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://www.autocar.co.uk/car-news/used-cars/buying-used-car-be-wary-dealers-pre-sale-inspection",
        canonicalUrl:
          "https://www.autocar.co.uk/car-news/used-cars/buying-used-car-be-wary-dealers-pre-sale-inspection",
        title: "Buying a used car? Be wary of the dealer's pre-sale inspection",
        excerpt: "What a dealer inspection actually covers.",
        sourceId: "auto_026",
        sourceUrl: "https://www.autocar.co.uk",
      }).editorialEligible,
      true,
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.carwow.co.uk/sell-my-car",
        canonicalUrl: "https://www.carwow.co.uk/sell-my-car",
        title: "Sell My Car - Quick, Easy & 100% Free",
        excerpt: "Sell your car.",
        sourceId: "auto_045",
        sourceUrl: "https://www.carwow.co.uk",
      }),
      { editorialEligible: false, editorialExclusionReason: "commerce" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://shop.kelsey.co.uk/temp-meg-50",
        canonicalUrl: "https://shop.kelsey.co.uk/temp-meg-50",
        title: "#50 - 12 Minute Workouts",
        excerpt: "#50 - 12 Minute Workouts | Kelsey Media Shop",
        sourceId: "auto_050",
        sourceUrl: "https://shop.kelsey.co.uk/911-and-porsche-world-magazine",
      }),
      { editorialEligible: false, editorialExclusionReason: "commerce" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.topgear.com/advertisement-feature/ovo-driving-greener",
        canonicalUrl: "https://www.topgear.com/advertisement-feature/ovo-driving-greener",
        title: "Driving greener with OVO",
        excerpt: "Driving greener with OVO",
        sourceId: "auto_028",
        sourceUrl: "https://www.topgear.com",
      }),
      { editorialEligible: false, editorialExclusionReason: "corporate" },
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://www.evo.co.uk/reviews",
        canonicalUrl: "https://www.evo.co.uk/reviews",
        title: "Reviews | Evo",
        excerpt: "Reviews | Evo",
        sourceId: "auto_024",
        sourceUrl: "https://www.evo.co.uk",
      }),
      { editorialEligible: false, editorialExclusionReason: "category_page" },
    );

    assert.equal(
      evaluateEditorialEligibility({
        url: "https://theroadrat.com/post/the-ferrari-f40",
        canonicalUrl: "https://theroadrat.com/post/the-ferrari-f40",
        title: "The Road Rat Magazine | The Ferrari F40",
        excerpt: "The Road Rat Magazine | The Ferrari F40",
        sourceId: "auto_019",
        sourceUrl: "https://theroadrat.com",
      }).editorialEligible,
      true,
    );

    assert.deepEqual(
      evaluateEditorialEligibility({
        url: "https://waft.be/6dd92ac5fe14-htm.htm",
        canonicalUrl: "https://waft.be/6dd92ac5fe14-htm.htm",
        title: "Hacked by CoupDeGrace",
        excerpt: "Hacked by CoupDeGrace",
        sourceId: "auto_009",
        sourceUrl: "https://www.waft.be",
      }),
      { editorialEligible: false, editorialExclusionReason: "low_editorial_value" },
    );
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
    assert.equal(
      resolveImageUrl(
        "https://cdn.example.com/hero.jpg?q=85&amp;w=1200",
        "https://octane.example/story",
      ),
      "https://cdn.example.com/hero.jpg?q=85&w=1200",
    );
    assert.equal(
      resolveImageUrl(
        "http://www.curves-magazin.com/site/assets/files/2772/1_1.1000x0.jpg",
        "http://www.curves-magazin.com/blog/handmade-in-zuffenhausen",
      ),
      "https://www.curves-magazin.com/site/assets/files/2772/1_1.1000x0.jpg",
    );
    assert.equal(
      resolveImageUrl(
        "http://www.curves-magazin.com/site/assets/images/arrow-up-white.png",
        "http://www.curves-magazin.com/blog/handmade-in-zuffenhausen",
      ),
      null,
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

  it("keeps Motorsport off the primary bar but on taxonomy routes", async () => {
    const { PRIMARY_NAV, MOBILE_NAV_SLUGS, MAGAZINE_NAV, contentPrimaryBySlug } = await import(
      "../../config/magazine-nav"
    );
    assert.deepEqual(
      PRIMARY_NAV.map((item) => item.slug),
      ["for-you", "cars", "culture", "driving", "events"],
    );
    assert.deepEqual([...MOBILE_NAV_SLUGS], PRIMARY_NAV.map((item) => item.slug));
    assert.ok(MAGAZINE_NAV.some((item) => item.slug === "motorsport"));
    assert.ok(contentPrimaryBySlug("motorsport"));
  });
});

describe("for you test profile", () => {
  it("keeps off-catalog marques, models, and interests", async () => {
    const { parseForYouTestProfile, forYouTestIsActive, forYouTestCatalog, withProfileInCatalog } =
      await import("./for-you-test");
    const profile = parseForYouTestProfile({
      make: "Porsche",
      model: "911",
      generation: "964",
      variant: "Carrera RS",
      interest: ["Classic", "NotAThing"],
      location: "Goodwood",
    });
    assert.deepEqual(profile, {
      make: "Porsche",
      model: "911",
      generation: "964",
      variant: "Carrera RS",
      interests: ["Classic", "NotAThing"],
      location: "Goodwood",
    });
    assert.equal(forYouTestIsActive(profile), true);
    const honda = parseForYouTestProfile({ make: "Honda", model: "Civic", interest: "Vibes" });
    assert.equal(honda.make, "Honda");
    assert.equal(honda.model, "Civic");
    assert.deepEqual(honda.interests, ["Vibes"]);
    assert.equal(forYouTestIsActive(honda), true);
    const gazetteer = forYouTestCatalog();
    assert.ok(gazetteer.makes.some((item) => item.name === "Porsche"));
    assert.ok(gazetteer.makes.some((item) => item.name === "Ferrari"));
    assert.ok(gazetteer.makes.some((item) => item.name === "Honda"));
    assert.ok(
      gazetteer.makes
        .find((item) => item.name === "Honda")
        ?.models.some((item) => item.name === "Civic"),
    );
    const byd = parseForYouTestProfile({ make: "BYD", model: "Atto 3" });
    assert.equal(byd.make, "BYD");
    assert.equal(
      gazetteer.makes.some((item) => item.name === "BYD"),
      false,
    );
    const live = forYouTestCatalog({
      entities: [
        { kind: "make", name: "Honda", make: "Honda" },
        { kind: "model", name: "Civic", make: "Honda", model: "Civic" },
        { kind: "generation", name: "EK9", make: "Honda", model: "Civic" },
        { kind: "variant", name: "Type R", make: "Honda", model: "Civic" },
      ],
      interests: ["Vibes"],
      locations: ["Suzuka"],
    });
    assert.ok(live.makes.some((item) => item.name === "Honda"));
    const civic = live.makes.find((item) => item.name === "Honda")?.models.find((item) => item.name === "Civic");
    assert.ok(civic?.generations.includes("EK9"));
    assert.ok(civic?.variants.includes("Type R"));
    assert.ok(live.interests.includes("Vibes"));
    assert.ok(live.locations.includes("Suzuka"));
    const injected = withProfileInCatalog(gazetteer, honda);
    assert.ok(injected.makes.some((item) => item.name === "Honda"));
    assert.ok(
      injected.makes
        .find((item) => item.name === "Honda")
        ?.models.some((item) => item.name === "Civic"),
    );
    assert.ok(injected.makes.some((item) => item.name === "Ferrari"));
  });

  it("hard-filters each set dimension and leaves unset ones open", async () => {
    const { articleMatchesForYouTest, parseForYouTestProfile } = await import("./for-you-test");
    const porsche911 = parseForYouTestProfile({ make: "Porsche", model: "911" });
    const merch = {
      makes: [] as string[],
      models: [] as string[],
      generations: [] as string[],
      variants: [] as string[],
      interests: ["Modified", "Car Culture"],
      locations: [] as string[],
    };
    const airCooled = {
      makes: ["Porsche"],
      models: ["911"],
      generations: ["993"],
      variants: ["Carrera RS"],
      interests: [] as string[],
      locations: [] as string[],
    };
    const porscheOnly = {
      makes: ["Porsche"],
      models: ["Cayenne"],
      generations: [] as string[],
      variants: [] as string[],
      interests: [] as string[],
      locations: [] as string[],
    };
    const ferrari = {
      makes: ["Ferrari"],
      models: ["F355"],
      generations: ["F355"],
      variants: [] as string[],
      interests: ["Classic"],
      locations: ["Monza"],
    };
    const honda = {
      makes: ["Honda"],
      models: ["Civic"],
      generations: ["EK9"],
      variants: ["Type R"],
      interests: ["Vibes"],
      locations: ["Suzuka"],
    };
    assert.equal(articleMatchesForYouTest(merch, porsche911), false);
    assert.equal(articleMatchesForYouTest(airCooled, porsche911), true);
    assert.equal(articleMatchesForYouTest(porscheOnly, porsche911), false);
    assert.equal(articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Porsche" })), true);
    assert.equal(
      articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Porsche", interest: "Classic" })),
      false,
    );
    assert.equal(
      articleMatchesForYouTest(
        { ...airCooled, interests: ["Classic"] },
        parseForYouTestProfile({ make: "Porsche", model: "911", interest: "Classic" }),
      ),
      true,
    );
    assert.equal(articleMatchesForYouTest(ferrari, parseForYouTestProfile({ make: "Ferrari" })), true);
    assert.equal(articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Ferrari" })), false);
    assert.equal(articleMatchesForYouTest(honda, parseForYouTestProfile({ make: "Honda", model: "Civic" })), true);
    assert.equal(articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Honda", model: "Civic" })), false);
    assert.equal(
      articleMatchesForYouTest(ferrari, parseForYouTestProfile({ interest: "Classic" })),
      true,
    );
    assert.equal(articleMatchesForYouTest(merch, parseForYouTestProfile({ interest: "Classic" })), false);
    assert.equal(
      articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Porsche", model: "911", generation: "993" })),
      true,
    );
    assert.equal(
      articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Porsche", model: "911", generation: "996" })),
      false,
    );
    assert.equal(
      articleMatchesForYouTest(
        airCooled,
        parseForYouTestProfile({ make: "Porsche", model: "911", variant: "Carrera RS" }),
      ),
      true,
    );
    assert.equal(
      articleMatchesForYouTest(airCooled, parseForYouTestProfile({ make: "Porsche", model: "911", variant: "GT3" })),
      false,
    );
    assert.equal(
      articleMatchesForYouTest(ferrari, parseForYouTestProfile({ location: "Monza" })),
      true,
    );
    assert.equal(
      articleMatchesForYouTest(ferrari, parseForYouTestProfile({ location: "Goodwood" })),
      false,
    );
    assert.equal(
      articleMatchesForYouTest(
        { ...ferrari, interests: ["Classic", "Design"] },
        parseForYouTestProfile({ interest: ["Classic", "Modified"] }),
      ),
      true,
    );
  });

  it("keeps the test query on primary nav hrefs", async () => {
    const { withTestQuery, forYouTestSearchString, parseForYouTestProfile } = await import("./for-you-test");
    const query = forYouTestSearchString(parseForYouTestProfile({ make: "Porsche", model: "911" }));
    assert.equal(withTestQuery("/", query), "/?make=Porsche&model=911");
    assert.equal(withTestQuery("/category/cars", query), "/category/cars?make=Porsche&model=911");
    assert.equal(withTestQuery("/category/culture", query), "/category/culture?make=Porsche&model=911");
    assert.equal(withTestQuery("/category/cars", undefined), "/category/cars");
  });

  it("keeps profile=A on magazine hrefs and pops in-app history without referrer", async () => {
    const { forYouTestSearchString, parseForYouTestProfile } = await import("./for-you-test");
    const {
      magazineHref,
      magazineLocation,
      popMagazineVisit,
      previousMagazineHref,
      recordMagazineVisit,
      shouldPopMagazineHistory,
    } = await import("./magazine-history");
    const query = forYouTestSearchString(parseForYouTestProfile({ profile: "A" }));
    assert.match(query, /profile=A/);
    assert.equal(magazineHref("/category/cars", query), `/category/cars?${query}`);
    assert.equal(magazineHref("/category/culture", query), `/category/culture?${query}`);
    assert.equal(magazineHref("/category/events", query), `/category/events?${query}`);
    assert.equal(magazineHref("/story/12", query), `/story/12?${query}`);
    assert.equal(magazineHref("/", query), `/?${query}`);
    assert.equal(magazineHref("/category/cars?profile=A", query), "/category/cars?profile=A");

    const home = magazineLocation("/", `?${query}`);
    const story = magazineLocation("/story/12", `?${query}`);
    const afterHome = recordMagazineVisit([], home);
    const afterStory = recordMagazineVisit(afterHome, story);
    assert.equal(previousMagazineHref(afterStory, story), home);
    assert.equal(shouldPopMagazineHistory(previousMagazineHref(afterStory, story)), true);
    assert.equal(previousMagazineHref(recordMagazineVisit([], story), story), undefined);
    assert.equal(shouldPopMagazineHistory(undefined), false);
    assert.deepEqual(popMagazineVisit(afterStory, story), afterHome);
    assert.equal(recordMagazineVisit(afterStory, story), afterStory);
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
  it("prefers og:image over a site-logo img", async () => {
    const { extractPageImage } = await import("./article-text");
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/hero.jpg?w=1200&amp;h=630"/>
    </head><body>
      <img src="https://cdn.example.com/logo.svg" alt="Magazine"/>
    </body></html>`;
    assert.equal(extractPageImage(html), "https://cdn.example.com/hero.jpg?w=1200&h=630");
  });
  it("skips svg logos when no og:image is present", async () => {
    const { extractPageImage } = await import("./article-text");
    const html = `<html><body><img src="https://www.evo.co.uk/public/logo-evo.svg" alt="evo"/></body></html>`;
    assert.equal(extractPageImage(html), null);
  });
  it("keeps RaceFans og:image and skips the Amazon merch button img", async () => {
    const { extractPageImage } = await import("./article-text");
    const { isUsableArticleImage } = await import("../text");
    const html = `<html><head>
      <meta property="og:image" content="https://www.racefans.net/wp-content/uploads/2026/09/lead.jpg" />
      <meta property="og:image:width" content="1920" />
    </head><body>
      <img src="https://www.racefans.net/wp-content/themes/racefans/buttons/amazon.png" alt="Buy on Amazon"/>
    </body></html>`;
    assert.equal(extractPageImage(html), "https://www.racefans.net/wp-content/uploads/2026/09/lead.jpg");
    assert.equal(
      extractPageImage(
        `<html><body><img src="https://www.racefans.net/wp-content/themes/racefans/buttons/amazon.png" alt="Buy on Amazon"/></body></html>`,
      ),
      null,
    );
    assert.equal(
      isUsableArticleImage("https://www.racefans.net/wp-content/themes/racefans/buttons/amazon.png"),
      false,
    );
    const items = parseFeedXml(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0"><channel>
        <title>RaceFans</title>
        <item>
          <title>Video: Verstappen kart race | Brief</title>
          <link>https://www.racefans.net/2026/09/17/video-verstappen-beats-amateur-rivals-in-max-vs-100-kart-race</link>
          <description><![CDATA[Max Verstappen beat a field of amateur karters.]]></description>
        </item>
      </channel></rss>`);
    assert.equal(items[0]?.imageUrl, null);
  });
  it("keeps The Car Expert og:image when the RSS item has no media", async () => {
    const { extractPageImage } = await import("./article-text");
    const items = parseFeedXml(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0"><channel>
        <title>The Car Expert</title>
        <item>
          <title>Audi A2 e-tron</title>
          <link>https://www.thecarexpert.co.uk/audi-a2-e-tron-2026/</link>
          <description><![CDATA[<p>The Audi A2 nameplate is returning as a compact electric SUV.</p>]]></description>
        </item>
      </channel></rss>`);
    assert.equal(items[0]?.imageUrl, null);
    const html = `<html><head>
      <meta property="og:image" content="https://www.thecarexpert.co.uk/wp-content/uploads/2026/09/Audi-A2-e-tron-1-1200x628-cropped.jpg"/>
    </head><body>
      <img src="https://www.thecarexpert.co.uk/wp-content/uploads/2026/09/Audi-A2-e-tron-1-1920x1080.jpg"/>
    </body></html>`;
    assert.equal(
      extractPageImage(html),
      "https://www.thecarexpert.co.uk/wp-content/uploads/2026/09/Audi-A2-e-tron-1-1200x628-cropped.jpg",
    );
  });
  it("keeps Curves ProcessWire article photos and skips chrome arrows", async () => {
    const { extractPageImage } = await import("./article-text");
    const { isUsableArticleImage } = await import("../text");
    const html = `<html lang="de"><head><title>Handmade in Zuffenhausen</title></head><body>
      <img src="/site/assets/images/arrow-up-white.png" alt="top">
      <img src="/site/assets/images/main-branding.png" alt="Curves Magazin - Soulful Driving">
      <img src="/site/images/curves_logo.png" alt="Curves Magazine">
      <img src="/site/images/soullful-driving_new.jpg" alt="soulful driving">
      <img src="/site/assets/files/2772/1_1.1000x0.jpg">
    </body></html>`;
    assert.equal(extractPageImage(html), "/site/assets/files/2772/1_1.1000x0.jpg");
    assert.equal(
      isUsableArticleImage("http://www.curves-magazin.com/site/assets/images/arrow-up-white.png"),
      false,
    );
  });
  it("keeps Automotive World and Race Tech og:image when RSS has no media", async () => {
    const { extractPageImage } = await import("./article-text");
    const world = parseFeedXml(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0"><channel>
        <title>Automotive World</title>
        <item>
          <title>Volvo plans 13 new models</title>
          <link>https://www.automotiveworld.com/news/volvo-cars-targets-8-ebit-margin-with-13-car-offensive</link>
          <description><![CDATA[Volvo Cars is planning 13 new models.]]></description>
        </item>
      </channel></rss>`);
    assert.equal(world[0]?.imageUrl, null);
    assert.equal(
      extractPageImage(`<html><head>
        <meta property="og:image" content="https://media.automotiveworld.com/app/uploads/2026/09/volvo-ex60.jpg" />
      </head></html>`),
      "https://media.automotiveworld.com/app/uploads/2026/09/volvo-ex60.jpg",
    );
  });
  it("reads Intercooler JSON-LD thumbnail and CSS background when og:image is missing", async () => {
    const { extractPageImage } = await import("./article-text");
    const { isUsableArticleImage } = await import("../text");
    const html = `<html><head>
      <script type="application/ld+json">{"thumbnailUrl":"https:\\/\\/www.the-intercooler.com\\/wp-content\\/uploads\\/2026\\/09\\/IMG-5031-scaled.jpg"}</script>
    </head><body>
      <img src="https://b4032044.assetcdn.net/2.0/4032044/wp-content/themes/the-intercooler/assets/img/ti-small-dark.png">
      <div style="background-image:url(https://b4032044.assetcdn.net/2.0/4032044/wp-content/uploads/2026/09/IMG-5031-scaled.jpg?lossy=2)"></div>
    </body></html>`;
    assert.equal(
      extractPageImage(html),
      "https://www.the-intercooler.com/wp-content/uploads/2026/09/IMG-5031-scaled.jpg",
    );
    assert.equal(isUsableArticleImage("Insert image"), false);
    assert.equal(
      extractPageImage(
        `<html><body><img src="https://www.the-intercooler.com/wp-content/themes/the-intercooler/assets/img/ti-small-dark.png"></body></html>`,
      ),
      null,
    );
  });
  it("keeps a Classic & Sports Car gallery photo after skipping theme logo.png", async () => {
    const { extractPageImage } = await import("./article-text");
    const { isUsableArticleImage } = await import("../text");
    const html = `<html><head><title>30 years of the Lotus Elise</title></head><body>
      <img src="/themes/custom/classic/logo.png" alt="Classic &amp; Sports Car"/>
      <img src="https://media.classicandsportscar.com/sites/default/files/styles/slideshow_slide/public/2026-09/01-intro-lotus-elises.jpg?itok=PUnBNUXF" alt="Lotus Elise"/>
    </body></html>`;
    assert.equal(
      extractPageImage(html),
      "https://media.classicandsportscar.com/sites/default/files/styles/slideshow_slide/public/2026-09/01-intro-lotus-elises.jpg?itok=PUnBNUXF",
    );
    assert.equal(isUsableArticleImage("/themes/custom/classic/logo.png"), false);
  });
  it("skips webfont CSS backgrounds so they cannot become article photos", async () => {
    const { extractPageImage } = await import("./article-text");
    const html = `<html><head></head><body>
      <div style="background-image:url(https://bonnetmagazine.com/cdn/fonts/assistant/assistant_n4.woff2)"></div>
      <img src="https://bonnetmagazine.com/cdn/shop/articles/hero.jpg">
    </body></html>`;
    assert.equal(extractPageImage(html), "https://bonnetmagazine.com/cdn/shop/articles/hero.jpg");
  });
  it("skips the Time Attack season holding PNG and keeps the article lead photo", async () => {
    const { extractPageImage } = await import("./article-text");
    const { isUsableArticleImage } = await import("../text");
    const html = `<html><body>
      <img src="/wp-content/uploads/2026/01/ta-2026.png" alt="Time Attack — It's not racing… It's Time Attack">
      <img src="https://www.timeattack.co.uk/wp-content/uploads/2026/09/Volkov.jpg" alt="">
      <img src="https://www.timeattack.co.uk/wp-content/uploads/2026/09/Luke-1-1024x683.jpg" alt="">
    </body></html>`;
    assert.equal(
      extractPageImage(html),
      "https://www.timeattack.co.uk/wp-content/uploads/2026/09/Volkov.jpg",
    );
    assert.equal(
      isUsableArticleImage("https://www.timeattack.co.uk/wp-content/uploads/2026/01/ta-2026.png"),
      false,
    );
  });
});

describe("source seed writes", () => {
  it("skips Turso updates when CSV fields already match", async () => {
    const { sourceSeedUnchanged } = await import("./seed");
    const values = {
      id: "auto_001",
      publication: "Bonnet",
      country: "UK",
      url: "https://bonnet.example",
      rssUrl: "https://bonnet.example/feed",
      websiteAvailable: true,
      scrapeDifficulty: "easy",
      editorialCategory: "culture",
      marquesCovered: "all",
      relevance: "high",
      csvEnabled: true,
      enabled: true,
      sourceType: "magazine",
      rssVerifiedStatus: "ok",
      rssConfidence: "high",
      priority: 1,
      maxArticles: 8,
      allowExcerpt: true,
      allowImage: true,
    };
    assert.equal(sourceSeedUnchanged(values, values), true);
    assert.equal(sourceSeedUnchanged({ ...values, enabled: false }, values), false);
    assert.equal(sourceSeedUnchanged({ ...values, rssUrl: null }, values), false);
  });
});

describe("vehicle-aware For You ranking", () => {
  const now = Date.now();
  const old = now - 40 * 86_400_000;
  const fresh = now - 1 * 86_400_000;
  const garageA = [{ make: "Ferrari", model: "F355", variant: "GTB" }];
  const garageB = [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }];

  function score(
    article: {
      makes?: string[];
      models?: string[];
      generations?: string[];
      variants?: string[];
      interests?: string[];
      categories?: string[];
      locations?: string[];
      excerpt?: string;
      relevance?: string;
      entityHits?: { kind: string; name: string; relevance?: string }[];
      scenes?: string[];
      publishedAt?: number;
    },
    vehicles: { make: string; model: string; generation?: string | null; variant?: string | null }[],
    userInterests: string[],
  ) {
    return scoreArticle({
      makes: article.makes ?? [],
      models: article.models ?? [],
      generations: article.generations ?? [],
      variants: article.variants ?? [],
      interests: article.interests ?? [],
      categories: article.categories ?? [],
      locations: article.locations ?? [],
      excerpt: article.excerpt ?? "A",
      relevance: article.relevance ?? "Good",
      vehicles,
      userInterests,
      entityHits: article.entityHits,
      scenes: article.scenes,
      publishedAt: article.publishedAt,
    });
  }

  it("ranks exact variant above model, generation, marque, category, and interest", async () => {
    const { explainArticle } = await import("./rank");
    const vehicles = garageA;
    const interests = ["Classic", "Performance"];
    const variant = score(
      {
        makes: ["Ferrari"],
        models: ["F355"],
        variants: ["GTB"],
        entityHits: [{ kind: "variant", name: "GTB", relevance: "about" }],
        publishedAt: old,
      },
      vehicles,
      interests,
    );
    const model = score(
      { makes: ["Ferrari"], models: ["F355"], publishedAt: old },
      vehicles,
      interests,
    );
    const make = score({ makes: ["Ferrari"], publishedAt: old }, vehicles, interests);
    const category = score(
      { interests: ["Supercars"], categories: ["Performance"], publishedAt: old },
      vehicles,
      [],
    );
    const interestOnly = score(
      { interests: ["Classic", "Performance"], excerpt: "x".repeat(200), relevance: "Excellent", publishedAt: fresh },
      vehicles,
      interests,
    );
    assert.ok(variant > model, `variant ${variant} vs model ${model}`);
    assert.ok(model > make, `model ${model} vs make ${make}`);
    assert.ok(make > category, `make ${make} vs category ${category}`);
    assert.ok(variant > interestOnly, `variant ${variant} vs interest ${interestOnly}`);
    const why = explainArticle({
      makes: ["Ferrari"],
      models: ["F355"],
      generations: [],
      variants: ["GTB"],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles,
      userInterests: interests,
    });
    assert.ok(why.reasons.some((reason) => reason.includes("Ferrari F355 GTB")));
    assert.equal(why.reasons.some((reason) => /popular with/i.test(reason)), false);
  });

  it("does not treat GT3 as a C2 variant match", async () => {
    const { variantsMatch } = await import("./personalize");
    assert.equal(variantsMatch("C2", "Carrera 2"), true);
    assert.equal(variantsMatch("GTB", "355 GTB"), true);
    assert.equal(variantsMatch("C2", "GT3"), false);
    assert.equal(variantsMatch("GT3", "C2"), false);
    const gt3 = score(
      { makes: ["Porsche"], models: ["911"], variants: ["GT3"], publishedAt: old },
      garageB,
      [],
    );
    const c2 = score(
      {
        makes: ["Porsche"],
        models: ["911"],
        generations: ["964"],
        variants: ["C2"],
        publishedAt: old,
      },
      garageB,
      [],
    );
    assert.ok(c2 > gt3, `C2 ${c2} vs GT3 ${gt3}`);
  });

  it("does not let a fresh generic story beat a relevant car match", async () => {
    const vehicles = garageB;
    const car = score(
      {
        makes: ["Porsche"],
        models: ["911"],
        generations: ["964"],
        variants: ["C2"],
        publishedAt: old,
      },
      vehicles,
      ["Classic"],
    );
    const generic = score(
      {
        interests: ["Design"],
        excerpt: "x".repeat(200),
        relevance: "Excellent",
        publishedAt: fresh,
      },
      vehicles,
      ["Classic"],
    );
    assert.ok(car > generic, `car ${car} vs generic ${generic}`);
  });

  it("scores about higher than mentioned on the same marque", async () => {
    const about = score(
      {
        makes: ["Ferrari"],
        models: ["F355"],
        entityHits: [{ kind: "model", name: "F355", relevance: "about" }],
      },
      garageA,
      [],
    );
    const mentioned = score(
      {
        makes: ["Ferrari"],
        entityHits: [{ kind: "make", name: "Ferrari", relevance: "mentioned" }],
      },
      garageA,
      [],
    );
    assert.ok(about > mentioned, `about ${about} vs mentioned ${mentioned}`);
  });

  it("ranks the same corpus differently for demo profiles A–D", async () => {
    const { FOR_YOU_DEMO_PROFILES, parseForYouTestProfile } = await import("./for-you-test");
    const { contextFromTestProfile, contextFromDrv247Garage } = await import("./personalize");
    const corpus = [
      { id: "f355", makes: ["Ferrari"], models: ["F355"], variants: ["GTB"], interests: ["Classic"] },
      { id: "ferrari", makes: ["Ferrari"], interests: ["Performance"] },
      { id: "964", makes: ["Porsche"], models: ["911"], generations: ["964"], variants: ["C2"], interests: ["Classic", "Air-cooled"] },
      { id: "skyline", makes: ["Nissan"], models: ["Skyline"], interests: ["JDM", "Modified"] },
      { id: "m3", makes: ["BMW"], models: ["M3"], interests: ["Performance", "Motorsport"] },
      { id: "event", makes: [], interests: ["Events"], locations: ["Goodwood"] },
    ];
    const orders = (["A", "B", "C", "D"] as const).map((id) => {
      const personal = contextFromTestProfile(FOR_YOU_DEMO_PROFILES[id]);
      return corpus
        .map((article) => ({
          id: article.id,
          score: score(article, personal.vehicles, personal.interests),
        }))
        .sort((a, b) => b.score - a.score)
        .map((row) => row.id);
    });
    assert.equal(orders[0][0], "f355");
    assert.equal(orders[1][0], "964");
    assert.equal(orders[2][0], "skyline");
    assert.equal(orders[3][0], "m3");
    assert.notEqual(orders[0].join(), orders[1].join());
    const parsed = parseForYouTestProfile({ profile: "A" });
    assert.equal(parsed.make, "Ferrari");
    assert.equal(parsed.model, "F355");
    assert.equal(parsed.variant, "GTB");
    assert.ok(parsed.interests.includes("Classic"));
    const fromGarage = contextFromDrv247Garage({
      garage: [{ make: "Ferrari", model: "F355", variant: "GTB" }],
      interests: ["Classics", "Performance"],
    });
    assert.equal(fromGarage.vehicles[0]?.model, "F355");
    assert.ok(fromGarage.interests.includes("Classic"));
  });

  it("extracts F355 GTB and 964 C2 as variants", () => {
    const gtb = extractEntities("Ferrari 355 GTB on the autostrada");
    assert.ok(gtb.models.includes("F355"));
    assert.ok(gtb.variants.includes("GTB"));
    const c2 = extractEntities("Porsche 964 C2 weekend drive");
    assert.ok(c2.models.includes("911"));
    assert.ok(c2.generations.includes("964"));
    assert.ok(c2.variants.includes("C2"));
    const air = extractEntities("An air-cooled 911 on the Stelvio");
    assert.ok(air.interests.includes("Air-cooled"));
  });

  it("diversifies a top-five run of the same variant", async () => {
    const { diversifyByVehicle } = await import("./rank");
    const items = [
      { id: 1, key: "GTB" },
      { id: 2, key: "GTB" },
      { id: 3, key: "GTB" },
      { id: 4, key: "GTB" },
      { id: 5, key: "GTB" },
      { id: 6, key: "360" },
    ];
    const diversified = diversifyByVehicle(items, (item) => item.key);
    assert.equal(diversified[4]?.key, "360");
    assert.equal(diversified[5]?.key, "GTB");
  });

  it("keeps the category AND hard filter", async () => {
    const { articleMatchesForYouTest, parseForYouTestProfile } = await import("./for-you-test");
    assert.equal(
      articleMatchesForYouTest(
        { makes: ["Porsche"], models: ["911"], interests: ["Classic"], locations: [] },
        parseForYouTestProfile({ make: "Ferrari" }),
      ),
      false,
    );
  });
});

describe("For You centre", () => {
  function candidate(
    id: number,
    title: string,
    opts: {
      makes?: string[];
      models?: string[];
      interests?: string[];
      categories?: string[];
      why?: string[];
      vehicleTier?: "variant" | "vehicle" | "model" | "generation" | "make" | "category" | "none";
      rankScore?: number;
      showInPrimaryFeed?: boolean;
      qualityBand?: "featured" | "eligible" | "deprioritised" | "excluded";
    } = {},
  ) {
    return {
      id,
      title,
      publication: "Octane",
      makes: opts.makes ?? [],
      models: opts.models ?? [],
      interests: opts.interests ?? [],
      categories: opts.categories ?? [],
      why: opts.why ?? [],
      vehicleTier: opts.vehicleTier ?? "none",
      duplicateGroupId: null,
      rankScore: opts.rankScore ?? 100 - id,
      showInPrimaryFeed: opts.showInPrimaryFeed ?? true,
      qualityBand: opts.qualityBand ?? "eligible",
      imageUrl: `https://img.example/${id}.jpg`,
    };
  }

  it("uses make and model in copy, not a generic recommendation label", async () => {
    const { forYouCopy } = await import("./for-you-home");
    const { FOR_YOU_DEMO_PROFILES } = await import("./for-you-test");
    const copy = forYouCopy(FOR_YOU_DEMO_PROFILES.A);
    assert.equal(copy.headerTitle, "For your Ferrari F355");
    assert.equal(copy.kicker, "FOR YOUR FERRARI F355");
    assert.equal(copy.dek, "Ferrari F355 GTB · Classic · Performance");
    assert.equal(copy.blurb, "Stories selected around your cars and interests.");
    assert.equal(/personalised recommendations/i.test(copy.kicker + copy.dek + copy.blurb), false);
    const empty = forYouCopy({ interests: [] });
    assert.match(empty.dek, /tell us what you drive/i);
  });

  it("uses profile interests in lane headings, not hard-coded labels", async () => {
    const { curateForYouHome } = await import("./for-you-home");
    const { FOR_YOU_DEMO_PROFILES } = await import("./for-you-test");
    const corpus = [
      candidate(1, "JDM night meet", { interests: ["JDM", "Modified"], vehicleTier: "category" }),
      candidate(2, "WRC on the BBC", { interests: ["Motorsport"], vehicleTier: "category" }),
    ];
    const skyline = curateForYouHome(corpus, FOR_YOU_DEMO_PROFILES.C);
    const m3 = curateForYouHome(corpus, FOR_YOU_DEMO_PROFILES.D);
    assert.equal(skyline.yourInterests.heading, "JDM · Modified · Performance");
    assert.equal(m3.yourInterests.heading, "Performance · Motorsport · Modified");
    assert.notEqual(skyline.yourInterests.heading, m3.yourInterests.heading);
  });

  it("curates different leads for demo profiles A–D from the same corpus", async () => {
    const { curateForYouHome } = await import("./for-you-home");
    const { FOR_YOU_DEMO_PROFILES } = await import("./for-you-test");
    const corpus = [
      candidate(1, "Ferrari F355 GTB restored", {
        makes: ["Ferrari"],
        models: ["F355"],
        vehicleTier: "variant",
        why: ["Because you drive a Ferrari F355 GTB"],
      }),
      candidate(2, "Ferrari F40 at dusk", { makes: ["Ferrari"], vehicleTier: "make" }),
      candidate(3, "Porsche 964 C2 on a B-road", {
        makes: ["Porsche"],
        models: ["911"],
        vehicleTier: "variant",
        why: ["Because you drive a Porsche 911 964 C2"],
      }),
      candidate(4, "Air-cooled 911 values", {
        makes: ["Porsche"],
        models: ["911"],
        vehicleTier: "model",
        interests: ["Air-cooled", "Classic"],
      }),
      candidate(5, "Nissan Skyline GT-R in Tokyo", {
        makes: ["Nissan"],
        models: ["Skyline"],
        vehicleTier: "model",
        interests: ["JDM"],
        why: ["Because you drive a Nissan Skyline"],
      }),
      candidate(6, "S15 with an RB", { makes: ["Nissan"], vehicleTier: "make", interests: ["Modified"] }),
      candidate(7, "E46 M3 on track", {
        makes: ["BMW"],
        models: ["M3"],
        vehicleTier: "model",
        interests: ["Performance", "Motorsport"],
      }),
      candidate(8, "BMW 1600-2 review", { makes: ["BMW"], vehicleTier: "make" }),
      candidate(9, "A classic road trip in the Alps", {
        interests: ["Classic", "Road Trips"],
        categories: ["Road Trips"],
        vehicleTier: "category",
      }),
      candidate(10, "JDM night meet", {
        interests: ["JDM", "Modified"],
        vehicleTier: "category",
      }),
      candidate(11, "WRC on the BBC", {
        interests: ["Motorsport"],
        vehicleTier: "category",
      }),
      candidate(12, "Industry briefing", { vehicleTier: "none" }),
    ];
    const leads = (["A", "B", "C", "D"] as const).map((id) => {
      const plan = curateForYouHome(corpus, FOR_YOU_DEMO_PROFILES[id]);
      return plan.forYourCar.stories[0]?.id;
    });
    assert.equal(leads[0], 1);
    assert.equal(leads[1], 3);
    assert.equal(leads[2], 5);
    assert.equal(leads[3], 7);
    assert.equal(new Set(leads).size, 4);
  });

  it("breaks a run of five stories from the same marque", async () => {
    const { curateForYouHome } = await import("./for-you-home");
    const ferraris = [1, 2, 3, 4, 5, 6].map((id) =>
      candidate(id, `Ferrari story ${id}`, { makes: ["Ferrari"], vehicleTier: "make" }),
    );
    const other = candidate(20, "Classic road trip", {
      interests: ["Classic", "Performance"],
      categories: ["Classic"],
      vehicleTier: "category",
      why: ["Because you follow Classic + Performance"],
    });
    const plan = curateForYouHome([...ferraris, other], {
      make: "Ferrari",
      model: "F355",
      variant: "GTB",
      interests: ["Classic", "Performance"],
    });
    const makes = plan.forYourCar.stories.map((story) => story.makes[0]);
    let run = 1;
    let maxRun = 1;
    for (let i = 1; i < makes.length; i += 1) {
      run = makes[i] === makes[i - 1] ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
    assert.ok(maxRun < 5, `make run ${maxRun} from ${makes.join(",")}`);
    assert.ok(plan.forYourCar.stories.some((story) => story.id === 20));
  });

  it("keeps a usable empty state when there is no vehicle", async () => {
    const { curateForYouHome, forYouCopy } = await import("./for-you-home");
    const plan = curateForYouHome(
      [candidate(12, "Industry briefing", { vehicleTier: "none" })],
      { interests: [] },
    );
    assert.equal(plan.vehicleKnown, false);
    assert.equal(plan.forYourCar.stories.length, 0);
    assert.ok(plan.discover.stories.length > 0);
    assert.match(forYouCopy({ interests: [] }).dek, /tell us what you drive/i);
  });

  it("reserves homepage pick ids from For You lanes", async () => {
    const { curateForYouHome } = await import("./for-you-home");
    const { FOR_YOU_DEMO_PROFILES } = await import("./for-you-test");
    const corpus = [
      candidate(332, "Hand-Painting a 1956 Ferrari 500 TR", {
        makes: ["Ferrari"],
        vehicleTier: "make",
        rankScore: 200,
      }),
      candidate(537, "LM and 212 win at Florida Ferrari concours", {
        makes: ["Ferrari"],
        vehicleTier: "make",
        rankScore: 180,
      }),
      candidate(578, "GM seeks differentiation via diesel", {
        vehicleTier: "none",
        rankScore: 40,
      }),
    ];
    const reserved = new Set([332]);
    const plan = curateForYouHome(corpus, FOR_YOU_DEMO_PROFILES.A, reserved);
    const ids = [
      ...plan.forYourCar.stories,
      ...plan.yourInterests.stories,
      ...plan.discover.stories,
    ].map((story) => story.id);
    assert.ok(!ids.includes(332), "reserved pick should not repeat in For You lanes");
  });
});

describe("relevance explanations", () => {
  const garageA = [{ make: "Ferrari", model: "F355", variant: "GTB" }];
  const garageB = [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }];

  it("picks vehicle copy for exact tiers and marque-only honesty", async () => {
    const { explainArticle } = await import("./rank");
    const { pickRelevanceExplanation } = await import("./relevance-explanation");
    const exact = explainArticle({
      makes: ["Ferrari"],
      models: ["F355"],
      variants: ["GTB"],
      generations: [],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: garageA,
      userInterests: ["Classic"],
    });
    assert.equal(
      pickRelevanceExplanation({
        why: exact.reasons,
        rankSignals: exact.signals,
        vehicleTier: exact.vehicleTier,
        lane: "vehicle",
        vehicles: garageA,
      }),
      "Because you drive a Ferrari F355 GTB",
    );

    const marque = explainArticle({
      makes: ["Ferrari"],
      models: [],
      generations: [],
      variants: [],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: garageA,
      userInterests: [],
    });
    assert.match(marque.reasons[0] ?? "", /Relevant to Ferrari owners/i);
    assert.equal(
      pickRelevanceExplanation({
        why: marque.reasons,
        rankSignals: marque.signals,
        vehicleTier: marque.vehicleTier,
        lane: "vehicle",
        vehicles: garageA,
      }),
      "Relevant to Ferrari owners",
    );
  });

  it("picks interest, location, and refuses generic-only matches", async () => {
    const { explainArticle } = await import("./rank");
    const { pickRelevanceExplanation } = await import("./relevance-explanation");
    const interest = explainArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: ["Classic", "Performance"],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: [],
      userInterests: ["Classic", "Performance"],
    });
    assert.match(
      pickRelevanceExplanation({
        why: interest.reasons,
        rankSignals: interest.signals,
        vehicleTier: interest.vehicleTier,
        lane: "interests",
        vehicles: [],
      }) ?? "",
      /Because you like Classic \+ Performance/i,
    );

    const located = explainArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: ["Road Trips"],
      categories: ["Road Trips"],
      locations: ["Scotland"],
      excerpt: "A",
      relevance: "Good",
      vehicles: garageB,
      userInterests: [],
      userLocation: "Scotland",
      contentTypes: ["road trip"],
    });
    assert.match(
      pickRelevanceExplanation({
        why: located.reasons,
        rankSignals: located.signals,
        vehicleTier: located.vehicleTier,
        lane: "vehicle",
        vehicles: garageB,
      }) ?? "",
      /Because it's in Scotland|Near you/i,
    );

    const generic = explainArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: [],
      categories: ["News"],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: garageA,
      userInterests: [],
      publishedAt: Date.now(),
    });
    assert.equal(
      pickRelevanceExplanation({
        why: generic.reasons,
        rankSignals: generic.signals,
        vehicleTier: generic.vehicleTier,
        lane: "vehicle",
        vehicles: garageA,
      }),
      null,
    );
  });

  it("builds debug rows with score, matches, and explanation", async () => {
    const { explainArticle } = await import("./rank");
    const { buildRelevanceDebugRow, formatRelevanceDebugBlock } = await import("./relevance-explanation");
    const breakdown = explainArticle({
      makes: ["Porsche"],
      models: ["911"],
      generations: ["964"],
      variants: ["C2"],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "A",
      relevance: "Good",
      vehicles: garageB,
      userInterests: ["Air-cooled"],
    });
    const row = buildRelevanceDebugRow(
      {
        id: 208,
        title: "Porsche 964 restoration",
        rankScore: breakdown.score,
        why: breakdown.reasons,
        rankSignals: breakdown.signals,
        vehicleTier: breakdown.vehicleTier,
      },
      garageB,
      ["Air-cooled", "Classic"],
    );
    assert.ok(row.score > 0);
    assert.match(row.explanation ?? "", /Because you drive a Porsche 911 964 C2/i);
    assert.match(formatRelevanceDebugBlock(row), /SCORE: /);
    assert.match(formatRelevanceDebugBlock(row), /EXPLANATION: Because you drive/);
  });
});

describe("relevance engine", () => {
  const garage964 = [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }];

  it("buckets signals into DRV, user, freshness, and editorial quality", async () => {
    const { DEFAULT_RANK_WEIGHTS } = await import("./rank");
    const {
      DEFAULT_RELEVANCE_ENGINE_WEIGHTS,
      evaluateRelevanceEngine,
      formatRelevanceEngineDebug,
    } = await import("./relevance-engine");
    const { explainArticle } = await import("./rank");
    const weights = { ...DEFAULT_RANK_WEIGHTS, ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS };
    const breakdown = explainArticle({
      makes: ["Porsche"],
      models: ["911"],
      generations: ["964"],
      variants: ["C2"],
      interests: ["Air-cooled", "Classic"],
      categories: ["Classic"],
      locations: [],
      excerpt: "A long enough teaser for editorial quality scoring on this article.",
      relevance: "Excellent",
      vehicles: garage964,
      userInterests: ["Air-cooled", "Classic"],
      publishedAt: Date.now() - 86_400_000,
      primaryCategory: "cars",
      entityHits: [{ kind: "generation", name: "964", relevance: "about" }],
    }, weights);
    const engine = evaluateRelevanceEngine(
      breakdown,
      {
        makes: ["Porsche"],
        models: ["911"],
        interests: ["Air-cooled", "Classic"],
        categories: ["Classic"],
        primaryCategory: "cars",
        entityHits: [{ kind: "generation", name: "964", relevance: "about" }],
        relevance: "Excellent",
        deskPick: false,
      },
      weights,
    );
    assert.ok(engine.drvRelevance >= weights.minDrvRelevance);
    assert.ok(engine.vehicleMatch > 0);
    assert.ok(engine.interestMatch > 0);
    assert.ok(engine.freshness > 0);
    assert.ok(engine.editorialQuality > 0);
    assert.ok(engine.userRelevance >= engine.vehicleMatch);
    assert.equal(engine.passedQualityGate, true);
    const debug = formatRelevanceEngineDebug({
      title: "Porsche 964 restoration",
      engine,
      explanation: "Because you drive a Porsche 911 964 C2",
    });
    assert.match(debug, /DRV relevance: /);
    assert.match(debug, /Vehicle match: \+/);
    assert.match(debug, /Interest match: \+/);
    assert.match(debug, /Freshness: \+/);
    assert.match(debug, /Editorial quality: \+/);
    assert.match(debug, /Quality gate: pass/);
  });

  it("blocks thin generic industry news below the DRV quality gate", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const weights = { ...DEFAULT_RANK_WEIGHTS, ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS };
    const breakdown = explainArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "Brief",
      relevance: "Low",
      vehicles: garage964,
      userInterests: ["Classic"],
      publishedAt: Date.now(),
    }, weights);
    const engine = evaluateRelevanceEngine(
      breakdown,
      {
        makes: [],
        models: [],
        interests: [],
        categories: [],
        relevance: "Low",
        deskPick: false,
      },
      weights,
    );
    assert.ok(engine.drvRelevance < weights.minDrvRelevance);
    assert.equal(engine.passedQualityGate, false);
  });

  it("keeps a strong user match even when DRV metadata is thin", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const weights = { ...DEFAULT_RANK_WEIGHTS, ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS };
    const breakdown = explainArticle({
      makes: ["Nissan"],
      models: ["Skyline"],
      generations: [],
      variants: [],
      interests: ["JDM", "Modified"],
      categories: ["Modified"],
      locations: [],
      excerpt: "S15 drift build",
      relevance: "Good",
      vehicles: [{ make: "Nissan", model: "Skyline" }],
      userInterests: ["JDM", "Modified", "Performance"],
      publishedAt: Date.now() - 2 * 86_400_000,
    }, weights);
    const engine = evaluateRelevanceEngine(
      breakdown,
      {
        makes: ["Nissan"],
        models: ["Skyline"],
        interests: ["JDM", "Modified"],
        categories: ["Modified"],
        relevance: "Good",
        deskPick: false,
      },
      weights,
    );
    assert.ok(engine.userRelevance >= weights.minDrvRelevance);
    assert.equal(engine.passedQualityGate, true);
    assert.match(engine.gateNote, /strong user match|pass/);
  });

  it("ranks demo profiles A–D differently through the relevance engine path", async () => {
    const { FOR_YOU_DEMO_PROFILES } = await import("./for-you-test");
    const { explainArticle, loadRankWeights } = await import("./rank");
    const { evaluateRelevanceEngine } = await import("./relevance-engine");
    const { contextFromTestProfile } = await import("./personalize");
    const loaded = loadRankWeights();
    const corpus = [
      {
        makes: ["Ferrari"],
        models: ["F355"],
        variants: ["GTB"],
        interests: ["Classic", "Performance"],
        title: "Ferrari F355 GTB restored",
      },
      {
        makes: ["Porsche"],
        models: ["911"],
        generations: ["964"],
        variants: ["C2"],
        interests: ["Air-cooled", "Classic"],
        title: "Porsche 964 C2 on a B-road",
      },
      {
        makes: ["Nissan"],
        models: ["Skyline"],
        interests: ["JDM", "Modified"],
        title: "Nissan Skyline GT-R in Tokyo",
      },
      {
        makes: ["BMW"],
        models: ["M3"],
        interests: ["Performance", "Motorsport"],
        title: "E46 M3 on track",
      },
    ];
    const topIds = [];
    for (const id of ["A", "B", "C", "D"] as const) {
      const profile = FOR_YOU_DEMO_PROFILES[id];
      const personal = contextFromTestProfile(profile);
      const scored = corpus.map((item, index) => {
        const breakdown = explainArticle(
          {
            makes: item.makes,
            models: item.models,
            generations: item.generations ?? [],
            variants: item.variants ?? [],
            interests: item.interests,
            categories: item.interests,
            locations: [],
            excerpt: item.title,
            relevance: "Excellent",
            vehicles: personal.vehicles,
            userInterests: personal.interests,
            publishedAt: Date.now() - index * 86_400_000,
            primaryCategory: "cars",
          },
          loaded,
        );
        const engine = evaluateRelevanceEngine(
          breakdown,
          {
            makes: item.makes,
            models: item.models,
            interests: item.interests,
            categories: item.interests,
            relevance: "Excellent",
            primaryCategory: "cars",
            deskPick: false,
          },
          loaded,
        );
        return { id: index + 1, score: breakdown.score, pass: engine.passedQualityGate };
      });
      const visible = scored.filter((row) => row.pass).sort((a, b) => b.score - a.score);
      topIds.push(visible[0]?.id);
    }
    assert.deepEqual(topIds, [1, 2, 3, 4]);
  });

  it("does not treat shared interest tags as a Ferrari vehicle match (Airstream false positive)", async () => {
    const { explainArticle } = await import("./rank");
    const { pickRelevanceExplanation } = await import("./relevance-explanation");
    const { cultureBridgeTags } = await import("./personalize");
    const garageA = [{ make: "Ferrari", model: "F355", variant: "GTB" }];
    const bridge = cultureBridgeTags(garageA[0]!, ["Classic"], ["Classic", "Performance"]);
    assert.deepEqual(bridge, []);
    const breakdown = explainArticle({
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: ["Classic"],
      categories: ["Classic"],
      locations: [],
      excerpt: "This is a refurbished 1965 Airstream Globe Trotter Land Yacht from the golden era.",
      relevance: "Excellent",
      vehicles: garageA,
      userInterests: ["Classic", "Performance"],
      publishedAt: Date.now() - 4 * 86_400_000,
      primaryCategory: "cars",
    });
    assert.equal(breakdown.vehicleTier, "none");
    assert.ok(!breakdown.signals.some((signal) => signal.kind.startsWith("vehicle.")));
    assert.ok(breakdown.signals.some((signal) => signal.kind === "interest" && signal.detail === "Classic"));
    assert.equal(
      pickRelevanceExplanation({
        why: breakdown.reasons,
        rankSignals: breakdown.signals,
        vehicleTier: breakdown.vehicleTier,
        lane: "vehicle",
        vehicles: garageA,
      }),
      "Because you follow Classic",
    );
  });
});

describe("quality filter", () => {
  const garage964 = [{ make: "Porsche", model: "911", generation: "964", variant: "C2" }];

  it("marks a strong build/feature as featured (high band)", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const { DEFAULT_QUALITY_FILTER_WEIGHTS, evaluateQualityFilter } = await import("./quality-filter");
    const weights = {
      ...DEFAULT_RANK_WEIGHTS,
      ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS,
      ...DEFAULT_QUALITY_FILTER_WEIGHTS,
    };
    const meta = {
      makes: ["Porsche"],
      models: ["911"],
      generations: ["964"],
      variants: ["C2"],
      interests: ["Air-cooled", "Classic"],
      categories: ["Classic"],
      locations: [],
      excerpt: "A long enough teaser for editorial quality scoring on this restoration build.",
      relevance: "Excellent",
      vehicles: garage964,
      userInterests: ["Air-cooled", "Classic"],
      publishedAt: Date.now() - 86_400_000,
      primaryCategory: "cars",
      contentTypes: ["Build"],
      entityHits: [{ kind: "generation", name: "964", relevance: "about" }],
      deskPick: false,
    };
    const breakdown = explainArticle(meta, weights);
    const engine = evaluateRelevanceEngine(breakdown, meta, weights);
    const quality = evaluateQualityFilter(engine, meta, weights);
    assert.equal(quality.band, "featured");
    assert.equal(quality.showInPrimaryFeed, true);
    assert.match(quality.reason, /strong DRV247 fit|desk pick/);
  });

  it("deprioritises thin but potentially relevant stories (medium band)", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const { DEFAULT_QUALITY_FILTER_WEIGHTS, evaluateQualityFilter } = await import("./quality-filter");
    const weights = {
      ...DEFAULT_RANK_WEIGHTS,
      ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS,
      ...DEFAULT_QUALITY_FILTER_WEIGHTS,
    };
    const meta = {
      makes: ["BMW"],
      models: [],
      generations: [],
      variants: [],
      interests: ["Air-cooled"],
      categories: ["Classic"],
      locations: [],
      excerpt: "Short",
      relevance: "Good",
      vehicles: garage964,
      userInterests: ["Air-cooled"],
      publishedAt: Date.now(),
      primaryCategory: "news",
      contentTypes: ["News"],
      deskPick: false,
    };
    const breakdown = explainArticle(meta, weights);
    const engine = evaluateRelevanceEngine(breakdown, meta, weights);
    const quality = evaluateQualityFilter(engine, meta, weights);
    assert.equal(quality.band, "deprioritised");
    assert.equal(quality.showInPrimaryFeed, false);
    assert.ok(quality.sortPenalty > 0);
  });

  it("excludes generic industry news with weak automotive connection (low band)", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const { DEFAULT_QUALITY_FILTER_WEIGHTS, evaluateQualityFilter } = await import("./quality-filter");
    const weights = {
      ...DEFAULT_RANK_WEIGHTS,
      ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS,
      ...DEFAULT_QUALITY_FILTER_WEIGHTS,
    };
    const meta = {
      makes: [],
      models: [],
      generations: [],
      variants: [],
      interests: [],
      categories: [],
      locations: [],
      excerpt: "Brief",
      relevance: "Low",
      vehicles: garage964,
      userInterests: ["Classic"],
      publishedAt: Date.now(),
      primaryCategory: "news",
      contentTypes: ["News"],
      deskPick: false,
    };
    const breakdown = explainArticle(meta, weights);
    const engine = evaluateRelevanceEngine(breakdown, meta, weights);
    const quality = evaluateQualityFilter(engine, meta, weights);
    assert.equal(quality.band, "excluded");
    assert.equal(quality.showInPrimaryFeed, false);
    assert.match(quality.reason, /generic industry news|below quality threshold|below deprioritised/i);
  });

  it("keeps a strong user match eligible even when DRV metadata is thin", async () => {
    const { DEFAULT_RANK_WEIGHTS, explainArticle } = await import("./rank");
    const { DEFAULT_RELEVANCE_ENGINE_WEIGHTS, evaluateRelevanceEngine } = await import(
      "./relevance-engine",
    );
    const { DEFAULT_QUALITY_FILTER_WEIGHTS, evaluateQualityFilter } = await import("./quality-filter");
    const weights = {
      ...DEFAULT_RANK_WEIGHTS,
      ...DEFAULT_RELEVANCE_ENGINE_WEIGHTS,
      ...DEFAULT_QUALITY_FILTER_WEIGHTS,
    };
    const meta = {
      makes: ["Nissan"],
      models: ["Skyline"],
      generations: [],
      variants: [],
      interests: ["JDM", "Modified"],
      categories: ["Modified"],
      locations: [],
      excerpt: "S15 drift build",
      relevance: "Good",
      vehicles: [{ make: "Nissan", model: "Skyline" }],
      userInterests: ["JDM", "Modified", "Performance"],
      publishedAt: Date.now() - 2 * 86_400_000,
      primaryCategory: "cars",
      deskPick: false,
    };
    const breakdown = explainArticle(meta, weights);
    const engine = evaluateRelevanceEngine(breakdown, meta, weights);
    const quality = evaluateQualityFilter(engine, meta, weights);
    assert.equal(quality.band, "eligible");
    assert.equal(quality.showInPrimaryFeed, true);
  });
});

