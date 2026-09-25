import assert from "node:assert/strict";
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
  it("loads twelve publication entities from magazine config", () => {
    const publications = loadPrintPublications();
    assert.equal(publications.length, 12);
    assert.ok(publications.every((row) => row.sections.length > 0));
  });

  it("leaves purchase CTAs off when shop or subscribe URLs are empty", () => {
    const christophorus = getPrintPublication("christophorus");
    const ceased = getPrintPublication("gt-purely-porsche");
    const maxers = getPrintPublication("maxers");
    assert.ok(christophorus && ceased && maxers);
    assert.deepEqual(
      printCtas(christophorus).map((cta) => cta.kind),
      ["site"],
    );
    assert.deepEqual(printCtas(ceased), []);
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
      ["000-magazine", "christophorus", "gt-purely-porsche", "911-and-porsche-world"],
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
    assert.ok((culture?.publications.length ?? 0) < 12);
  });

  it("shows Porsche print on Cars for profile B, not the JDM stack", () => {
    const cars = printModuleForSection("cars", FOR_YOU_DEMO_PROFILES.B);
    assert.deepEqual(
      cars?.publications.map((row) => row.slug),
      ["000-magazine", "christophorus", "gt-purely-porsche"],
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

  it("still orders the full catalogue when asked, without making that a page", () => {
    const ordered = orderPrintCatalogue(loadPrintPublications(), FOR_YOU_DEMO_PROFILES.B);
    assert.equal(ordered.length, 12);
  });
});
