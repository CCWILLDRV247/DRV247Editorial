/** Per-source merch policy. Disable a shop feed, or point it at editorial RSS only. */
export type MerchSourcePolicy =
  | { action: "disable"; reason: string }
  | { action: "editorial-rss"; rssUrl: string; reason: string };

export const MERCH_SOURCE_POLICY: Record<string, MerchSourcePolicy> = {
  auto_013: {
    action: "disable",
    reason: "EuroStance is a Shopify storefront with no editorial RSS",
  },
};

export const SHOP_DISABLED_SOURCE_IDS = Object.entries(MERCH_SOURCE_POLICY)
  .filter(([, policy]) => policy.action === "disable")
  .map(([id]) => id);

/** Exact pathname segments treated as shop/nav product URLs. Not a title denylist. */
export const MERCH_PATH_SEGMENTS = [
  "shop",
  "shops",
  "shopping",
  "product",
  "products",
  "collection",
  "collections",
  "cart",
  "checkout",
  "merch",
  "merchandise",
  "bag",
  "basket",
] as const;
