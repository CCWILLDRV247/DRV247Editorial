/** User-facing primary destinations. For You is a mix, not an article primary. */
export const PRIMARY_NAV = [
  { slug: "for-you", name: "For You", href: "/" },
  { slug: "cars", name: "Cars", href: "/category/cars" },
  { slug: "culture", name: "Culture", href: "/category/culture" },
  { slug: "driving", name: "Driving", href: "/category/driving" },
  { slug: "motorsport", name: "Motorsport", href: "/category/motorsport" },
  { slug: "events", name: "Events", href: "/category/events" },
] as const;

export const CONTENT_PRIMARY_SLUGS = ["cars", "culture", "driving", "motorsport", "events"] as const;

export type ContentPrimary = (typeof CONTENT_PRIMARY_SLUGS)[number];
export type PrimaryNavSlug = (typeof PRIMARY_NAV)[number]["slug"];

export const MOBILE_NAV_SLUGS = [
  "for-you",
  "cars",
  "culture",
  "driving",
  "motorsport",
  "events",
] as const;

/** @deprecated Motorsport is always in the primary bar; More hides when empty. */
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

export const MAGAZINE_NAV = PRIMARY_NAV.filter((item) => item.slug !== "for-you").map((item) => ({
  slug: item.slug,
  name: item.name,
}));

export function contentPrimaryBySlug(slug: string) {
  return MAGAZINE_NAV.find((item) => item.slug === slug);
}

export function primaryNavBySlug(slug: string) {
  return PRIMARY_NAV.find((item) => item.slug === slug);
}
