import {
  ABOUT_EXACT_PATHS,
  COMMERCE_PATH_PREFIXES,
  COMMERCE_PATH_SEGMENTS,
  COMPETITION_PATH_SEGMENTS,
  COMPETITION_PROMO_PREFIXES,
  CORPORATE_EXACT_PATHS,
  MARKETPLACE_LEAF_SEGMENTS,
  SPONSORED_PATH_SEGMENTS,
} from "../../config/editorial-eligibility";
import { isMerchArticle, isMerchUrl } from "./merch";
import {
  isCategoryIndexUrl,
  isGalleryIndexUrl,
  isNonEditorialArticle,
  isNonEditorialHost,
  isNonEditorialPathUrl,
  isNonEditorialUrl,
  isOffSiteUrl,
  isShopHost,
  isUnusableArticleUrl,
} from "./non-editorial";

export type EditorialExclusionReason =
  | "about_page"
  | "commerce"
  | "subscription"
  | "competition"
  | "ticket_sales"
  | "corporate"
  | "category_page"
  | "duplicate"
  | "low_editorial_value";

export type EditorialEligibilityInput = {
  url: string;
  canonicalUrl: string;
  title: string;
  excerpt: string;
  sourceId: string;
  sourceUrl?: string;
  deskPick?: boolean;
};

export type EditorialEligibilityResult = {
  editorialEligible: boolean;
  editorialExclusionReason: EditorialExclusionReason | null;
};

const COMMERCE_SEGMENTS = new Set<string>(COMMERCE_PATH_SEGMENTS);
const COMPETITION_SEGMENTS = new Set<string>(COMPETITION_PATH_SEGMENTS);
const ABOUT_PATHS = new Set<string>(ABOUT_EXACT_PATHS);
const CORPORATE_PATHS = new Set<string>(CORPORATE_EXACT_PATHS);
const SPONSORED_SEGMENTS = new Set<string>(SPONSORED_PATH_SEGMENTS);
const MARKETPLACE_LEAVES = new Set<string>(MARKETPLACE_LEAF_SEGMENTS);

function urls(input: Pick<EditorialEligibilityInput, "url" | "canonicalUrl">) {
  return [input.canonicalUrl, input.url].filter(Boolean);
}

function pathnameOf(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/\/+$/, "").toLowerCase() || "/";
  } catch {
    return null;
  }
}

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.toLowerCase().split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function matchesExactPath(url: string, paths: Set<string>) {
  const path = pathnameOf(url);
  return Boolean(path && paths.has(path));
}

function matchesCommercePrefix(url: string) {
  const path = pathnameOf(url);
  if (!path) return false;
  return COMMERCE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function matchesCompetitionPromoPrefix(url: string) {
  const path = pathnameOf(url);
  if (!path) return false;
  return COMPETITION_PROMO_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function matchesCommercePath(url: string) {
  if (matchesCommercePrefix(url)) return true;
  return pathSegments(url).some((segment) => COMMERCE_SEGMENTS.has(segment));
}

function segmentIsGiveawayPromo(segment: string) {
  return /(?:^|-)giveaways?(?:-|$)/.test(segment) || /(?:^|-)prize-draws?(?:-|$)/.test(segment);
}

function matchesCompetitionPromoPath(url: string) {
  if (matchesCompetitionPromoPrefix(url)) return true;
  return pathSegments(url).some(
    (segment) => COMPETITION_SEGMENTS.has(segment) || segmentIsGiveawayPromo(segment),
  );
}

function matchesSponsoredPath(url: string) {
  return pathSegments(url).some((segment) => SPONSORED_SEGMENTS.has(segment));
}

function isMarketplaceLeaf(url: string) {
  const segments = pathSegments(url);
  const leaf = segments[segments.length - 1];
  return Boolean(leaf && MARKETPLACE_LEAVES.has(leaf));
}

function isSubscribePath(url: string) {
  return pathSegments(url).some(
    (segment) =>
      segment === "subscribe" ||
      segment.startsWith("subscribe-") ||
      segment.startsWith("subscribe_"),
  );
}

function isCommercePromoCopy(title: string, excerpt: string) {
  const haystack = `${title} ${excerpt}`.toLowerCase();
  if (!/\bbookazine?s?\b/.test(haystack)) return false;
  return /\bon sale\b|\blimited.?edition\b|\bbuy our\b|\border now\b/.test(haystack);
}

function isTicketPromoCopy(title: string, excerpt: string) {
  const haystack = `${title} ${excerpt}`.toLowerCase();
  if (!/\btickets?\b/.test(haystack)) return false;
  return /\bcoupon code\b|\b\d+% off\b|\$\d+ off\b|\bdiscount code\b/.test(haystack);
}

function isGiveawayPromoCopy(title: string, excerpt: string) {
  const haystack = `${title} ${excerpt}`.toLowerCase();
  return /\bgrand prize giveaway\b|\bprize giveaway\b/.test(haystack);
}

/** The publication talking about itself — not a car story that mentions a magazine. */
function isPublisherHouseNote(title: string, excerpt: string) {
  return /\bpublishing model\b/i.test(`${title} ${excerpt}`);
}

/** Reader-submission prompts (“Show us yer/your …”), not a marque or model ban. */
function isReaderPromptTitle(title: string) {
  return /^\s*show us (yer|your)\b/i.test(title);
}

function isDefacementTitle(title: string) {
  return /^\s*hacked by\b/i.test(title);
}

/**
 * One-segment hubs whose RSS excerpt is only the title (`Reviews | Evo`, `Our cars`).
 * Dated features and `/post/slug` stories stay, even when the excerpt repeats the title.
 */
function isBareSectionHub(canonicalUrl: string, title: string, excerpt: string) {
  if (pathSegments(canonicalUrl).length !== 1) return false;
  const heading = title.trim();
  const standfirst = excerpt.trim();
  return Boolean(heading && standfirst && heading === standfirst);
}

function nonEditorialReason(url: string, sourceUrl?: string): EditorialExclusionReason {
  if (isMerchUrl(url) || isShopHost(url) || isMarketplaceLeaf(url)) return "commerce";
  if (matchesSponsoredPath(url)) return "corporate";
  if (isSubscribePath(url) || isNonEditorialHost(url)) return "subscription";
  if (matchesExactPath(url, ABOUT_PATHS)) return "about_page";
  if (matchesExactPath(url, CORPORATE_PATHS)) return "corporate";
  if (sourceUrl && isOffSiteUrl(url, sourceUrl)) return "corporate";
  if (
    isUnusableArticleUrl(url) ||
    isNonEditorialPathUrl(url) ||
    isCategoryIndexUrl(url) ||
    isGalleryIndexUrl(url)
  ) {
    return "category_page";
  }
  return "category_page";
}

function ineligible(reason: EditorialExclusionReason): EditorialEligibilityResult {
  return { editorialEligible: false, editorialExclusionReason: reason };
}

function eligible(): EditorialEligibilityResult {
  return { editorialEligible: true, editorialExclusionReason: null };
}

/** Consumer-feed gate — URL/path first, narrow copy heuristics for promos and house notes. */
export function evaluateEditorialEligibility(
  input: EditorialEligibilityInput,
): EditorialEligibilityResult {
  if (input.deskPick) return eligible();

  for (const url of urls(input)) {
    if (matchesExactPath(url, ABOUT_PATHS)) return ineligible("about_page");
    if (matchesExactPath(url, CORPORATE_PATHS)) return ineligible("corporate");
    if (matchesSponsoredPath(url)) return ineligible("corporate");
    if (isShopHost(url) || isMarketplaceLeaf(url)) return ineligible("commerce");
    if (matchesCommercePath(url)) return ineligible("commerce");
    if (matchesCompetitionPromoPath(url)) return ineligible("competition");
  }

  if (isCommercePromoCopy(input.title, input.excerpt)) return ineligible("commerce");
  if (isTicketPromoCopy(input.title, input.excerpt)) return ineligible("ticket_sales");
  if (isGiveawayPromoCopy(input.title, input.excerpt)) return ineligible("competition");
  if (isPublisherHouseNote(input.title, input.excerpt)) return ineligible("subscription");
  if (isReaderPromptTitle(input.title)) return ineligible("low_editorial_value");
  if (isDefacementTitle(input.title)) return ineligible("low_editorial_value");
  if (isBareSectionHub(input.canonicalUrl || input.url, input.title, input.excerpt)) {
    return ineligible("category_page");
  }

  if (isMerchArticle(input)) return ineligible("commerce");

  for (const url of urls(input)) {
    if (isNonEditorialUrl(url, input.sourceUrl)) {
      return ineligible(nonEditorialReason(url, input.sourceUrl));
    }
  }

  if (isNonEditorialArticle(input, input.sourceUrl)) {
    const sample = input.canonicalUrl || input.url;
    return ineligible(nonEditorialReason(sample, input.sourceUrl));
  }

  return eligible();
}

export function isEditorialIneligibleArticle(
  row: Pick<
    EditorialEligibilityInput,
    "url" | "canonicalUrl" | "title" | "excerpt" | "sourceId"
  >,
  sourceUrl?: string,
  deskPick = false,
): boolean {
  return !evaluateEditorialEligibility({ ...row, sourceUrl, deskPick }).editorialEligible;
}

export function isEditorialIneligibleUrl(
  url: string,
  sourceUrl?: string,
  copy?: Pick<EditorialEligibilityInput, "title" | "excerpt">,
): boolean {
  return !evaluateEditorialEligibility({
    url,
    canonicalUrl: url,
    title: copy?.title ?? "",
    excerpt: copy?.excerpt ?? "",
    sourceId: "",
    sourceUrl,
  }).editorialEligible;
}
