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
 * `/pages/about-us` is Bonnet’s About page (article #204), not a teaser.
 * `/sell-car` is Dyler’s sell-your-car promo, not a teaser.
 * `/events` is Dyler’s classic-car-shows calendar index, not a teaser.
 * `/events/slug` stays (Street Machine, Hot Rod, Castlemaine).
 * `/search` is site search chrome (Bonnet “Search”).
 * `/cars` is Dyler’s inventory search. `/cars/slug` stays.
 * `/cars/dealers` and `/cars/categories` are listing indexes, not teasers.
 * `/calendar` and `/clubs-listings` are Classic & Sports Car directories.
 * `/vans` is a marketplace inventory root (Carwow). `/vans/leasing` is caught as a marketplace leaf.
 */
export const NON_ARTICLE_EXACT_PATHS = [
  "/",
  "/news",
  "/blog",
  "/cars",
  "/cars/makes",
  "/cars/dealers",
  "/cars/categories",
  "/classic-cars-a-to-z",
  "/parts-services",
  "/pages/articles",
  "/pages/about-us",
  "/sell-car",
  "/events",
  "/search",
  "/calendar",
  "/clubs-listings",
  "/vans",
] as const;

/**
 * Subscribe-shop hosts. Classic & Sports Car’s subscribe CTA canonicalises here
 * with no /subscribe segment — the hostname is the signal.
 */
export const NON_EDITORIAL_HOSTS = ["themagazineshop.com"] as const;
