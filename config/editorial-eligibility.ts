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
] as const;
