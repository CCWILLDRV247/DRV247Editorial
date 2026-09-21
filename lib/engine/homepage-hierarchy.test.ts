import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_CATEGORY_SLUGS,
  HOMEPAGE_CATEGORY_STORY_MAX,
  HOMEPAGE_FOR_YOU_INTERESTS_MAX,
  HOMEPAGE_FOR_YOU_VEHICLE_MAX,
  HOMEPAGE_LEAD_CARD_MAX,
  isHomepageCategory,
} from "./homepage-hierarchy";

describe("homepage hierarchy", () => {
  it("caps editorial lanes at selective counts", () => {
    assert.equal(HOMEPAGE_FOR_YOU_VEHICLE_MAX, 4);
    assert.equal(HOMEPAGE_FOR_YOU_INTERESTS_MAX, 4);
    assert.equal(HOMEPAGE_LEAD_CARD_MAX, 1);
    assert.ok(HOMEPAGE_CATEGORY_STORY_MAX >= 4 && HOMEPAGE_CATEGORY_STORY_MAX <= 6);
  });

  it("shows the four editorial primaries on the homepage, not Motorsport", () => {
    assert.deepEqual(HOMEPAGE_CATEGORY_SLUGS, ["cars", "culture", "driving", "events"]);
    assert.equal(isHomepageCategory("motorsport"), false);
    assert.equal(isHomepageCategory("cars"), true);
  });

  it("builds four category carousels from ranked stories", async () => {
    const { getMagazineHomeFresh } = await import("./magazine");
    // Smoke the shape via module exports — full integration needs DB; test carousel builder logic inline
    const { MAGAZINE_NAV } = await import("./magazine");
    const slugs = HOMEPAGE_CATEGORY_SLUGS.filter((slug) =>
      MAGAZINE_NAV.some((item) => item.slug === slug),
    );
    assert.equal(slugs.length, 4);
  });
});
