import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOR_YOU_DEMO_PROFILES } from "../engine/for-you-test";
import {
  buildPrintShelf,
  getPrintPublication,
  loadPrintPublications,
  orderPrintCatalogue,
  printCtas,
  printPersonalisationScore,
} from "./print";

describe("print catalogue", () => {
  it("loads the twelve seeded publication entities from config", () => {
    const publications = loadPrintPublications();
    assert.equal(publications.length, 12);
    assert.deepEqual(
      publications.filter((row) => row.featured).map((row) => row.slug),
      ["the-road-rat", "magneto", "copacetic", "maxers", "000-magazine"],
    );
  });

  it("leaves purchase CTAs off when shop or subscribe URLs are empty", () => {
    const christophorus = getPrintPublication("christophorus");
    const ceased = getPrintPublication("gt-purely-porsche");
    const maxers = getPrintPublication("maxers");
    const brainfuel = getPrintPublication("brainfuel");
    const ferrari = getPrintPublication("ferrari-magazine");
    assert.ok(christophorus && ceased && maxers && brainfuel && ferrari);
    assert.deepEqual(
      printCtas(christophorus).map((cta) => cta.kind),
      ["site"],
    );
    assert.deepEqual(printCtas(ceased), []);
    assert.deepEqual(
      printCtas(maxers).map((cta) => cta.kind),
      ["buy", "site"],
    );
    assert.deepEqual(
      printCtas(brainfuel).map((cta) => cta.kind),
      ["buy", "site"],
    );
    assert.deepEqual(
      printCtas(ferrari).map((cta) => cta.kind),
      ["subscribe", "site"],
    );
    assert.ok(!printCtas(maxers).some((cta) => cta.kind === "subscribe"));
  });

  it("never invents http URLs or drops the catalogue when unfiltered", () => {
    const publications = loadPrintPublications();
    for (const row of publications) {
      for (const url of [row.websiteUrl, row.shopUrl, row.subscribeUrl, row.coverImageUrl]) {
        if (url) assert.match(url, /^https:\/\//);
      }
    }
    const shelf = buildPrintShelf({ interests: [] });
    assert.equal(shelf.recommended.length, 0);
    assert.equal(shelf.explore.length, 12);
    assert.equal(shelf.featured.length, 5);
  });
});

describe("print personalisation", () => {
  it("puts Porsche titles first for profile B without hiding the rest", () => {
    const ordered = orderPrintCatalogue(loadPrintPublications(), FOR_YOU_DEMO_PROFILES.B);
    assert.deepEqual(
      ordered.slice(0, 4).map((row) => row.slug),
      ["000-magazine", "christophorus", "gt-purely-porsche", "911-and-porsche-world"],
    );
    assert.equal(ordered.length, 12);
    assert.ok(ordered.some((row) => row.slug === "maxers"));
  });

  it("puts modified / JDM titles first for profile C", () => {
    const ordered = orderPrintCatalogue(loadPrintPublications(), FOR_YOU_DEMO_PROFILES.C);
    assert.deepEqual(
      ordered.slice(0, 3).map((row) => row.slug),
      ["maxers", "copacetic", "brainfuel"],
    );
    assert.equal(ordered.length, 12);
  });

  it("puts classic Ferrari titles first for profile A", () => {
    const ordered = orderPrintCatalogue(loadPrintPublications(), FOR_YOU_DEMO_PROFILES.A);
    assert.deepEqual(
      ordered.slice(0, 4).map((row) => row.slug),
      ["magneto", "octane", "auto-italia", "ferrari-magazine"],
    );
    assert.equal(ordered.length, 12);
  });

  it("keeps Explore all complete when a focus chip is on", () => {
    const porsche = buildPrintShelf(FOR_YOU_DEMO_PROFILES.B, "porsche");
    assert.ok(porsche.explore.every((row) => row.marques.includes("Porsche")));
    assert.ok(porsche.explore.length < 12);
    const unfiltered = buildPrintShelf(FOR_YOU_DEMO_PROFILES.B);
    assert.equal(unfiltered.explore.length, 12);
    assert.ok(unfiltered.recommended.every((row) => printPersonalisationScore(row, FOR_YOU_DEMO_PROFILES.B) > 0));
  });

  it("scores the BMW modified garage the same way as Modified interest", () => {
    const profile = { make: "BMW", model: "M3", interests: ["Modified", "Performance"] };
    const ordered = orderPrintCatalogue(loadPrintPublications(), profile);
    assert.equal(ordered[0]?.slug, "maxers");
    assert.ok(["copacetic", "brainfuel"].includes(ordered[1]?.slug ?? ""));
  });
});
