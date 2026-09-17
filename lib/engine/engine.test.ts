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
  it("keeps wave 1–3 live titles and adds the next ten CSV titles", async () => {
    const {
      WAVE1_SOURCE_IDS,
      WAVE2_SOURCE_IDS,
      WAVE3_SOURCE_IDS,
      WAVE4_SOURCE_IDS,
      ENABLED_SOURCE_IDS,
      DISABLED_SOURCE_IDS,
      ENABLED_SOURCE_SET,
    } = await import("../../config/wave1-sources");
    assert.equal(WAVE1_SOURCE_IDS.length, 10);
    assert.equal(WAVE2_SOURCE_IDS.length, 11);
    assert.equal(WAVE3_SOURCE_IDS.length, 10);
    assert.equal(WAVE4_SOURCE_IDS.length, 10);
    assert.equal(ENABLED_SOURCE_IDS.length, 37);
    assert.ok((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_051"));
    assert.equal((WAVE2_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_011"), false);
    assert.equal((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_013"), false);
    assert.equal((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_012"), false);
    assert.equal((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_048"), false);
    assert.ok((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_018"));
    assert.ok((WAVE3_SOURCE_IDS as readonly string[]).includes("auto_028"));
    assert.ok((WAVE4_SOURCE_IDS as readonly string[]).includes("auto_029"));
    assert.ok((WAVE4_SOURCE_IDS as readonly string[]).includes("auto_038"));
    assert.equal((WAVE4_SOURCE_IDS as readonly string[]).includes("auto_018"), false);
    assert.equal((WAVE4_SOURCE_IDS as readonly string[]).includes("auto_049"), false);
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_012"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_048"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_013"));
    assert.ok((DISABLED_SOURCE_IDS as readonly string[]).includes("auto_049"));
    assert.equal(ENABLED_SOURCE_SET.has("auto_012"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_048"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_013"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_049"), false);
    assert.equal(ENABLED_SOURCE_SET.has("auto_008"), true);
    assert.equal(ENABLED_SOURCE_SET.has("auto_029"), true);
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
