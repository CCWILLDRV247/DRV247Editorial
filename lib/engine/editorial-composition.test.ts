import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  SITE_FOOTER,
  interludeCompositionVariant,
  isSoloMagazineRail,
} from "./editorial-composition";

describe("editorial composition", () => {
  it("assigns the strongest variant to before-categories", () => {
    assert.equal(interludeCompositionVariant("before-categories", "STATEMENT"), "statement");
  });

  it("uses different variants across homepage slots", () => {
    const variants = new Set([
      interludeCompositionVariant("before-categories", "OBSERVATION"),
      interludeCompositionVariant("after-picks", "OBSERVATION"),
      interludeCompositionVariant("mid-categories", "OBSERVATION"),
    ]);
    assert.ok(variants.size >= 2);
  });

  it("elevates provocation and short punch in the mid rail pause", () => {
    assert.equal(interludeCompositionVariant("mid-categories", "PROVOCATION"), "accent");
    assert.equal(interludeCompositionVariant("mid-categories", "SHORT_PUNCH"), "accent");
  });

  it("paints Picks as a full-width black band with white type", () => {
    assert.match(HOMEPAGE_COMPOSITION.picksBand, /bg-\[#1b1d1f\]/);
    assert.match(HOMEPAGE_COMPOSITION.picksBand, /text-white/);
    assert.match(HOMEPAGE_COMPOSITION.picksBand, /shadow-\[100vw_0_0_0_#1b1d1f/);
    assert.match(HOMEPAGE_COMPOSITION.picksHeading, /text-white/);
    assert.doesNotMatch(HOMEPAGE_COMPOSITION.sectionTitle, /text-white/);
  });

  it("paints a full-bleed black footer with light type and mail contact", () => {
    assert.match(HOMEPAGE_COMPOSITION.footerBand, /bg-\[#1b1d1f\]/);
    assert.match(HOMEPAGE_COMPOSITION.footerBand, /text-white/);
    assert.match(HOMEPAGE_COMPOSITION.footerBand, /w-full/);
    assert.match(HOMEPAGE_COMPOSITION.footerBand, /max-w-none/);
    assert.match(HOMEPAGE_COMPOSITION.footerCopy, /text-white\/75/);
    assert.equal(SITE_FOOTER.legal, "DRV247 is a trading name of DriveClub Limited.");
    assert.equal(SITE_FOOTER.privacyHref, "https://drv247.app/tos");
    assert.equal(SITE_FOOTER.contactHref, "mailto:support@drv247.com");
    assert.doesNotMatch(SITE_FOOTER.contactHref, /drv247\.app/);
  });

  it("keeps a desktop reading measure and one rail scale", () => {
    assert.match(MAGAZINE_LAYOUT.page, /lg:max-w-\[1080px\]/);
    assert.match(MAGAZINE_LAYOUT.page, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.reading, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.header, /lg:px-8/);
    assert.match(MAGAZINE_LAYOUT.gutter, /lg:px-0/);
    assert.doesNotMatch(MAGAZINE_LAYOUT.page, /lg:px-8/);
    assert.match(MAGAZINE_LAYOUT.storyRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.storyRailCardSolo, /lg:w-full/);
    assert.doesNotMatch(MAGAZINE_LAYOUT.storyRailCardSolo, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.storyRailCardSolo, /w-\[200px\]/);
    assert.match(MAGAZINE_LAYOUT.railSolo, /lg:mt-5/);
    assert.match(MAGAZINE_LAYOUT.pickRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailCardSolo, /lg:w-full/);
    assert.doesNotMatch(MAGAZINE_LAYOUT.pickRailCardSolo, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailCardSolo, /w-\[218px\]/);
    assert.match(MAGAZINE_LAYOUT.printRailCard, /lg:w-\[260px\]/);
    assert.match(MAGAZINE_LAYOUT.storyRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.pickRailImage, /lg:h-\[300px\]/);
    assert.match(MAGAZINE_LAYOUT.picksInner, /lg:pl-8/);
    assert.match(MAGAZINE_LAYOUT.featuredPick, /^block$/);
    assert.match(MAGAZINE_LAYOUT.heroHeight, /lg:h-\[420px\]/);
    assert.match(HOMEPAGE_COMPOSITION.sectionTitle, /lg:text-\[40px\]/);
  });

  it("treats a one-story rail as full width and two or more as a carousel", () => {
    assert.equal(isSoloMagazineRail(1), true);
    assert.equal(isSoloMagazineRail(2), false);
    assert.equal(isSoloMagazineRail(0), false);
  });
});
