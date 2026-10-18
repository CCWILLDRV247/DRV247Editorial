import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PRIMARY_NAV } from "../../config/magazine-nav";
import { FOR_YOU_DEMO_PROFILES } from "./for-you-test";
import { isMagazinePath } from "./magazine-history";
import {
  getPrintPublication,
  loadPrintPublications,
  orderPrintCatalogue,
  printCtas,
  printEditorialCopy,
  printModuleForSection,
  printModuleForYou,
} from "./print";

describe("print catalogue", () => {
  it("loads eleven publication entities from magazine config", () => {
    const publications = loadPrintPublications();
    assert.equal(publications.length, 11);
    assert.ok(publications.every((row) => row.sections.length > 0));
    assert.equal(getPrintPublication("gt-purely-porsche"), null);
    assert.ok(!publications.some((row) => /gt purely/i.test(row.title)));
  });

  it("uses official hosted covers for every remaining title", () => {
    const publications = loadPrintPublications();
    assert.ok(publications.every((row) => row.coverImageUrl?.startsWith("/print/") && row.imageKind === "cover"));
  });

  it("leaves purchase CTAs off when shop or subscribe URLs are empty", () => {
    const christophorus = getPrintPublication("christophorus");
    const maxers = getPrintPublication("maxers");
    assert.ok(christophorus && maxers);
    assert.deepEqual(
      printCtas(christophorus).map((cta) => cta.kind),
      ["site"],
    );
    assert.ok(!printCtas(maxers).some((cta) => cta.kind === "subscribe"));
  });
});

describe("print on For You", () => {
  it("uses editorial voice, not a garage lecture", () => {
    assert.equal(printEditorialCopy(FOR_YOU_DEMO_PROFILES.B).dek, "The ones that still treat Porsche as a study.");
    assert.equal(printEditorialCopy(FOR_YOU_DEMO_PROFILES.C).dek, "Print for the driveway, not the showroom.");
    assert.equal(printEditorialCopy(FOR_YOU_DEMO_PROFILES.A).dek, "Ink, Maranello, and the long read.");
    assert.ok(!printEditorialCopy(FOR_YOU_DEMO_PROFILES.A).dek.toLowerCase().includes("because"));
    assert.ok(!printEditorialCopy(FOR_YOU_DEMO_PROFILES.B).heading.toLowerCase().includes("porsche 964"));
  });

  it("recommends the brief lists on A–D and featured titles when unfiltered", () => {
    assert.deepEqual(
      printModuleForYou(FOR_YOU_DEMO_PROFILES.B)?.publications.map((row) => row.slug),
      ["000-magazine", "christophorus", "911-and-porsche-world"],
    );
    assert.deepEqual(
      printModuleForYou(FOR_YOU_DEMO_PROFILES.C)?.publications.map((row) => row.slug),
      ["maxers", "copacetic", "brainfuel"],
    );
    assert.deepEqual(
      printModuleForYou(FOR_YOU_DEMO_PROFILES.A)?.publications.map((row) => row.slug),
      ["magneto", "octane", "auto-italia", "ferrari-magazine"],
    );
    assert.deepEqual(
      printModuleForYou(FOR_YOU_DEMO_PROFILES.D)?.publications.map((row) => row.slug),
      ["maxers", "copacetic", "brainfuel"],
    );
    const open = printModuleForYou({ interests: [] });
    assert.deepEqual(
      open?.publications.map((row) => row.slug),
      ["the-road-rat", "magneto", "copacetic", "maxers", "000-magazine"],
    );
  });
});

describe("print on category pages", () => {
  it("does not dump the catalogue on every section", () => {
    const culture = printModuleForSection("culture");
    const cars = printModuleForSection("cars");
    const events = printModuleForSection("events");
    assert.deepEqual(culture?.publications.map((row) => row.slug), ["the-road-rat", "magneto", "000-magazine"]);
    assert.deepEqual(cars?.publications.map((row) => row.slug), ["911-and-porsche-world", "auto-italia"]);
    assert.equal(events, null);
    assert.ok((culture?.publications.length ?? 0) < 11);
  });

  it("shows Porsche print on Cars for profile B, not the JDM stack", () => {
    const cars = printModuleForSection("cars", FOR_YOU_DEMO_PROFILES.B);
    assert.deepEqual(
      cars?.publications.map((row) => row.slug),
      ["000-magazine", "christophorus", "911-and-porsche-world"],
    );
    assert.ok(!cars?.publications.some((row) => row.slug === "maxers"));
  });
});

describe("print stays off magazine chrome", () => {
  it("is not a primary nav item", () => {
    assert.ok(!PRIMARY_NAV.some((item) => /print/i.test(item.slug) || /print/i.test(item.name)));
  });

  it("treats quiet /print detail URLs as magazine paths", () => {
    assert.equal(isMagazinePath("/print/the-road-rat"), true);
    assert.equal(isMagazinePath("/intelligence/print"), false);
  });

  it("opens suggested magazine cards with the story-open morph, not a native push", () => {
    const open = readFileSync(new URL("../../components/print-open-link.tsx", import.meta.url), "utf8");
    const card = readFileSync(new URL("../../components/print-cover-card.tsx", import.meta.url), "utf8");
    const rail = readFileSync(new URL("../../components/print-module.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../../app/print/[slug]/page.tsx", import.meta.url), "utf8");
    const loading = readFileSync(new URL("../../app/print/[slug]/loading.tsx", import.meta.url), "utf8");
    const morph = readFileSync(new URL("./story-back-morph.ts", import.meta.url), "utf8");
    const back = readFileSync(new URL("../../components/magazine-link.tsx", import.meta.url), "utf8");
    const storyOpen = readFileSync(new URL("../../components/story-open-link.tsx", import.meta.url), "utf8");
    const storyCard = readFileSync(new URL("../../components/story-card.tsx", import.meta.url), "utf8");

    assert.match(open, /event\.preventDefault\(\)/);
    assert.match(open, /startTypedViewTransition/);
    assert.match(open, /`\/print\/\$\{slug\}`/);
    assert.match(open, /rasterizeOpenImages/);
    assert.match(open, /freezeOpenView\(\);/);
    assert.match(open, /storyHeroIsPainted/);
    assert.match(open, /thawOpenView/);
    assert.match(open, /startTransition\(\(\) => \{/);
    assert.match(open, /addTransitionType\(STORY_OPEN_TRANSITION\)/);
    assert.match(
      open,
      /startTransition\(\(\) => \{\s*addTransitionType\(STORY_OPEN_TRANSITION\);/,
    );
    assert.match(open, /router\.push\(href, \{ transitionTypes: \[STORY_OPEN_TRANSITION\] \}\)/);
    assert.match(open, /captureMagazineRails/);
    assert.match(open, /recordMagazineHref/);
    assert.doesNotMatch(open, /history\.back\(\)/);

    assert.match(card, /PrintOpenLink/);
    assert.match(card, /data-story-media=\{publication\.slug\}/);
    assert.match(card, /story-hero-media/);
    assert.match(card, /hero/);
    assert.doesNotMatch(card, /MagazineLink/);

    assert.match(rail, /data-magazine-rail="print"/);
    assert.match(rail, /PrintCoverCard/);
    assert.doesNotMatch(rail, /href=/);

    assert.match(page, /hero/);
    assert.match(page, /StoryCopyTransition/);
    assert.doesNotMatch(page, /PrintOpenLink/);

    assert.match(loading, /bg-white/);
    assert.match(loading, /aspect-\[3\/4\]/);
    assert.doesNotMatch(loading, /animate-pulse/);

    assert.match(morph, /\/print\//);
    assert.match(morph, /restoreMagazineRails/);
    assert.doesNotMatch(morph, /startViewTransition/);
    assert.doesNotMatch(back, /document\.startViewTransition/);
    assert.match(back, /window\.history\.back\(\)/);
    assert.match(back, /playStoryBackMorph/);

    assert.match(storyOpen, /`\/story\/\$\{storyId\}`/);
    assert.doesNotMatch(storyOpen, /\/print\//);
    assert.match(storyCard, /StoryOpenLink/);
    assert.doesNotMatch(storyCard, /PrintOpenLink/);
  });

  it("still orders the full catalogue when asked, without making that a page", () => {
    const ordered = orderPrintCatalogue(loadPrintPublications(), FOR_YOU_DEMO_PROFILES.B);
    assert.equal(ordered.length, 11);
    assert.ok(!ordered.some((row) => row.slug === "gt-purely-porsche"));
  });
});
