/** User-facing primary bar: For You + four editorial destinations. Motorsport is taxonomy-only. */
export const PRIMARY_NAV = [
  { slug: "for-you", name: "For You", href: "/" },
  { slug: "cars", name: "Cars", href: "/category/cars" },
  { slug: "culture", name: "Culture", href: "/category/culture" },
  { slug: "driving", name: "Driving", href: "/category/driving" },
  { slug: "events", name: "Events", href: "/category/events" },
] as const;

export const CONTENT_PRIMARY_SLUGS = ["cars", "culture", "driving", "motorsport", "events"] as const;

export type ContentPrimary = (typeof CONTENT_PRIMARY_SLUGS)[number];
export type PrimaryNavSlug = (typeof PRIMARY_NAV)[number]["slug"];

export const MOBILE_NAV_SLUGS = ["for-you", "cars", "culture", "driving", "events"] as const;

/** @deprecated Motorsport is taxonomy-only; More stays hidden when primary bar is full. */
export const MOBILE_MOTORSPORT_MORE_BELOW = 6;

/** Old magazine lanes → new primaries. Culture keeps its slug. */
export const LEGACY_NAV_TO_PRIMARY: Record<string, ContentPrimary> = {
  racing: "motorsport",
  classic: "cars",
  modified: "cars",
  concourse: "events",
  culture: "culture",
  desk: "culture",
};

/** Taxonomy/category primaries — includes Motorsport for routing and classification, not the header bar. */
export const MAGAZINE_NAV = [
  { slug: "cars", name: "Cars" },
  { slug: "culture", name: "Culture" },
  { slug: "driving", name: "Driving" },
  { slug: "motorsport", name: "Motorsport" },
  { slug: "events", name: "Events" },
] as const;

export function contentPrimaryBySlug(slug: string) {
  return MAGAZINE_NAV.find((item) => item.slug === slug);
}

export function primaryNavBySlug(slug: string) {
  return PRIMARY_NAV.find((item) => item.slug === slug);
}
