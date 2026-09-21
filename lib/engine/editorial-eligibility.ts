import {
  ABOUT_EXACT_PATHS,
  COMMERCE_PATH_PREFIXES,
  COMMERCE_PATH_SEGMENTS,
  COMPETITION_PATH_SEGMENTS,
  COMPETITION_PROMO_PREFIXES,
  CORPORATE_EXACT_PATHS,
} from "../../config/editorial-eligibility";
import { isMerchArticle, isMerchUrl } from "./merch";
import {
  isNonEditorialArticle,
  isNonEditorialHost,
  isNonEditorialPathUrl,
  isNonEditorialUrl,
  isOffSiteUrl,
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

function matchesCompetitionPromoPath(url: string) {
  if (matchesCompetitionPromoPrefix(url)) return true;
  return pathSegments(url).some((segment) => COMPETITION_SEGMENTS.has(segment));
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

function nonEditorialReason(url: string, sourceUrl?: string): EditorialExclusionReason {
  if (isMerchUrl(url)) return "commerce";
  if (isSubscribePath(url) || isNonEditorialHost(url)) return "subscription";
  if (matchesExactPath(url, ABOUT_PATHS)) return "about_page";
  if (matchesExactPath(url, CORPORATE_PATHS)) return "corporate";
  if (sourceUrl && isOffSiteUrl(url, sourceUrl)) return "corporate";
  if (isUnusableArticleUrl(url) || isNonEditorialPathUrl(url)) return "category_page";
  return "category_page";
}

function ineligible(reason: EditorialExclusionReason): EditorialEligibilityResult {
  return { editorialEligible: false, editorialExclusionReason: reason };
}

function eligible(): EditorialEligibilityResult {
  return { editorialEligible: true, editorialExclusionReason: null };
}

/** Consumer-feed gate — URL/path first, narrow title heuristics for commerce/ticket promos only. */
export function evaluateEditorialEligibility(
  input: EditorialEligibilityInput,
): EditorialEligibilityResult {
  if (input.deskPick) return eligible();

  for (const url of urls(input)) {
    if (matchesExactPath(url, ABOUT_PATHS)) return ineligible("about_page");
    if (matchesExactPath(url, CORPORATE_PATHS)) return ineligible("corporate");
    if (matchesCommercePath(url)) return ineligible("commerce");
    if (matchesCompetitionPromoPath(url)) return ineligible("competition");
  }

  if (isCommercePromoCopy(input.title, input.excerpt)) return ineligible("commerce");
  if (isTicketPromoCopy(input.title, input.excerpt)) return ineligible("ticket_sales");

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
