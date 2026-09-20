/** Homepage density caps — prefer 4–6 excellent stories over long feeds. */
export const HOMEPAGE_FOR_YOU_VEHICLE_MAX = 4;
export const HOMEPAGE_FOR_YOU_INTERESTS_MAX = 4;
export const HOMEPAGE_FOR_YOU_DISCOVER_MAX = 4;
export const HOMEPAGE_LEAD_CARD_MAX = 1;
export const HOMEPAGE_CATEGORY_STORY_MAX = 5;

/** Editorial primaries on the homepage (nav unchanged — Motorsport stays in header/More). */
export const HOMEPAGE_CATEGORY_SLUGS = ["cars", "culture", "driving", "events"] as const;

export type HomepageCategorySlug = (typeof HOMEPAGE_CATEGORY_SLUGS)[number];

export function isHomepageCategory(slug: string): slug is HomepageCategorySlug {
  return (HOMEPAGE_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
