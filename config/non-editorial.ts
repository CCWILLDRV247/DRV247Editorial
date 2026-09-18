/** Path segments that are listings or subscribe funnels, not editorial teasers. Not a title denylist. */
export const NON_EDITORIAL_PATH_SEGMENTS = [
  "auctions",
  "auction",
  "subscribe",
  "subscription",
  "subscriptions",
  "buy",
  "sell",
  "gassing",
  "sign_up",
  "sign_in",
  "signup",
  "signin",
  "parts-services",
] as const;

/** Broken scrape hrefs that resolve to a literal path segment. */
export const UNUSABLE_PATH_SEGMENTS = ["undefined", "null"] as const;

/**
 * Exact pathnames that are section indexes, not teasers.
 * `/news/slug` and `/blog/slug` stay. `/gallery/…` stays.
 * `/pages/articles` is a Shopify magazine listing (Bonnet), not a story.
 */
export const NON_ARTICLE_EXACT_PATHS = [
  "/",
  "/news",
  "/blog",
  "/cars/makes",
  "/classic-cars-a-to-z",
  "/parts-services",
  "/pages/articles",
] as const;

/**
 * Subscribe-shop hosts. Classic & Sports Car’s subscribe CTA canonicalises here
 * with no /subscribe segment — the hostname is the signal.
 */
export const NON_EDITORIAL_HOSTS = ["themagazineshop.com"] as const;
