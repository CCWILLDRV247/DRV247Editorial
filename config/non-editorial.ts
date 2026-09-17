/** Path segments that are listings or subscribe funnels, not editorial teasers. Not a title denylist. */
export const NON_EDITORIAL_PATH_SEGMENTS = [
  "auctions",
  "auction",
  "subscribe",
  "subscription",
  "subscriptions",
] as const;

/** Broken scrape hrefs that resolve to a literal path segment. */
export const UNUSABLE_PATH_SEGMENTS = ["undefined", "null"] as const;

/**
 * Subscribe-shop hosts. Classic & Sports Car’s subscribe CTA canonicalises here
 * with no /subscribe segment — the hostname is the signal.
 */
export const NON_EDITORIAL_HOSTS = ["themagazineshop.com"] as const;
