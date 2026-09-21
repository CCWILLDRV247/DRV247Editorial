/**
 * URL/path signals for consumer-feed eligibility. Not a title denylist —
 * title heuristics in editorial-eligibility.ts only fire with commerce/competition context.
 */

/** Bookazine / magazine shop landings under otherwise editorial hosts. */
export const COMMERCE_PATH_SEGMENTS = ["bookazine", "bookazines"] as const;

/** Bauer / magazine commerce funnels — `/magazine/offers/bookazines`, etc. */
export const COMMERCE_PATH_PREFIXES = ["/magazine/offers/"] as const;

/** Publisher giveaway listings — not motorsport “competition car” coverage in `/news/…`. */
export const COMPETITION_PROMO_PREFIXES = [
  "/competitions/",
  "/competition/",
  "/giveaway/",
  "/giveaways/",
  "/prize-draw/",
  "/prize-draws/",
] as const;

export const COMPETITION_PATH_SEGMENTS = ["latest-competitions"] as const;

/** About / contact / legal pages — exact pathnames only. */
export const ABOUT_EXACT_PATHS = ["/about", "/about-us", "/pages/about-us"] as const;

export const CORPORATE_EXACT_PATHS = [
  "/contact",
  "/contact-us",
  "/terms",
  "/terms-of-service",
  "/privacy",
  "/privacy-policy",
  "/legal",
  "/cookies",
  "/cookie-policy",
  "/media-kit",
] as const;

/**
 * Sponsored landings. A path segment, not a title ban — “Shell V-Power” coverage
 * under `/news/…` stays.
 */
export const SPONSORED_PATH_SEGMENTS = ["advertisement-feature", "advertorial"] as const;

/**
 * Marketplace funnels whose last segment is the page itself.
 * `/car-news/used-cars/a-buying-story` stays — the leaf is the story slug.
 */
export const MARKETPLACE_LEAF_SEGMENTS = [
  "sell-my-car",
  "buy-a-car",
  "car-leasing",
  "car-valuation",
  "new-car-deals",
  "used-cars",
  "leasing",
] as const;
