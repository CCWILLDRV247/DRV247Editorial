import { MERCH_PATH_SEGMENTS, SHOP_DISABLED_SOURCE_IDS } from "../../config/merch";

const MERCH_SEGMENTS = new Set<string>(MERCH_PATH_SEGMENTS);
const SHOP_SOURCES = new Set<string>(SHOP_DISABLED_SOURCE_IDS);

export function isMerchUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.split("/").filter(Boolean).some((segment) => MERCH_SEGMENTS.has(segment));
  } catch {
    return false;
  }
}

export function isShopDisabledSource(sourceId: string): boolean {
  return SHOP_SOURCES.has(sourceId);
}

export function isMerchArticle(row: {
  sourceId: string;
  url: string;
  canonicalUrl: string;
}): boolean {
  return isShopDisabledSource(row.sourceId) || isMerchUrl(row.canonicalUrl) || isMerchUrl(row.url);
}
