import { contentPrimaryBySlug, type ContentPrimary } from "../../config/magazine-nav";
import { canonicalInterest, contextFromTestProfile, interestsMatch } from "./personalize";
import type { ForYouTestProfile } from "./for-you-test";
import { takeDiverse, type ForYouCandidate } from "./for-you-home";
import type { EditorialDto } from "./queries";
import { classifyPrimary } from "./taxonomy";

function articlePrimarySlug(article: EditorialDto): ContentPrimary {
  if (article.primaryCategory) {
    const known = contentPrimaryBySlug(article.primaryCategory);
    if (known) return known.slug as ContentPrimary;
  }
  return classifyPrimary({
    title: article.title,
    excerpt: article.excerpt,
    publication: article.publication,
    categories: article.categories,
    interests: article.interests,
  });
}

export const KEEP_EXPLORING_MAX = 6;
export const KEEP_EXPLORING_MIN = 2;

export type KeepExploringReason =
  | "shared-topic"
  | "same-marque"
  | "same-category"
  | "user-interest"
  | "adjacent-category"
  | "editorial";

export type KeepExploringPick = {
  id: number;
  reason: KeepExploringReason;
};

/** Editorial primaries that sit next to each other in the magazine taxonomy. */
export const ADJACENT_PRIMARY: Record<ContentPrimary, ContentPrimary[]> = {
  cars: ["culture", "driving"],
  culture: ["cars", "events"],
  driving: ["cars", "motorsport"],
  motorsport: ["driving", "events"],
  events: ["culture", "driving"],
};

function norm(value: string) {
  return value.toLowerCase().trim();
}

function sharedTopicCount(left: EditorialDto, right: EditorialDto): number {
  const leftSet = new Set(left.interests.map((item) => norm(canonicalInterest(item))));
  let count = 0;
  for (const interest of right.interests) {
    const token = norm(canonicalInterest(interest));
    if (leftSet.has(token)) count += 1;
  }
  return count;
}

function matchesUserInterest(article: EditorialDto, profile?: ForYouTestProfile): boolean {
  if (!profile?.interests.length) return false;
  return profile.interests.some((interest) =>
    article.interests.some((item) => interestsMatch(item, canonicalInterest(interest))),
  );
}

function sharesMarque(left: EditorialDto, right: EditorialDto): boolean {
  const makes = new Set(left.makes.map(norm).filter(Boolean));
  return right.makes.some((make) => makes.has(norm(make)));
}

function samePrimary(left: EditorialDto, right: EditorialDto): boolean {
  return articlePrimarySlug(left) === articlePrimarySlug(right);
}

function isAdjacentPrimary(left: EditorialDto, right: EditorialDto): boolean {
  const current = articlePrimarySlug(left);
  const target = articlePrimarySlug(right);
  if (current === target) return false;
  return (ADJACENT_PRIMARY[current] ?? []).includes(target);
}

function toCandidate(article: EditorialDto): ForYouCandidate {
  return {
    id: article.id,
    title: article.title,
    publication: article.publication,
    makes: article.makes,
    models: article.models,
    interests: article.interests,
    categories: article.categories,
    why: article.why,
    vehicleTier: article.vehicleTier,
    duplicateGroupId: article.duplicateGroupId,
    rankScore: article.rankScore,
    imageUrl: article.imageUrl,
    showInPrimaryFeed: article.showInPrimaryFeed,
    qualityBand: article.qualityBand,
  };
}

function eligiblePool(pool: readonly EditorialDto[], current: EditorialDto): EditorialDto[] {
  return pool.filter((article) => {
    if (article.id === current.id) return false;
    if (article.qualityBand === "excluded") return false;
    if (!article.editorialEligible) return false;
    return true;
  });
}

function pickFromBucket(
  bucket: EditorialDto[],
  n: number,
  used: Set<number>,
  usedSubjects: Set<string>,
  reason: KeepExploringReason,
): KeepExploringPick[] {
  const diverse = takeDiverse(
    bucket.map(toCandidate),
    n,
    used,
    usedSubjects,
  );
  return diverse.map((article) => ({ id: article.id, reason }));
}

/**
 * Ranked picks for the story-page Keep Exploring rail. Uses Phase 2 diversity +
 * existing editorial rank scores — no Phase 3B engine.
 */
export function selectKeepExploring(
  current: EditorialDto,
  pool: readonly EditorialDto[],
  profile?: ForYouTestProfile,
  max = KEEP_EXPLORING_MAX,
): KeepExploringPick[] {
  const available = eligiblePool(pool, current);
  if (available.length === 0) return [];

  const used = new Set<number>();
  const usedSubjects = new Set<string>();
  const picks: KeepExploringPick[] = [];

  const byRank = [...available].sort(
    (a, b) => b.rankScore - a.rankScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  const sharedTopic = byRank
    .filter((article) => sharedTopicCount(current, article) > 0)
    .sort(
      (a, b) =>
        sharedTopicCount(current, b) - sharedTopicCount(current, a) ||
        b.rankScore - a.rankScore,
    );

  const sameMarque = byRank.filter((article) => sharesMarque(current, article));
  const sameCategory = byRank.filter((article) => samePrimary(current, article));
  const userInterest = byRank.filter((article) => matchesUserInterest(article, profile));
  const adjacent = byRank.filter((article) => isAdjacentPrimary(current, article));

  const vehicle = profile ? contextFromTestProfile(profile).vehicles[0] : undefined;
  const userMake = (vehicle?.make ?? profile?.make ?? "").toLowerCase();

  const take = (bucket: EditorialDto[], reason: KeepExploringReason) => {
    if (picks.length >= max) return;
    const remaining = max - picks.length;
    picks.push(...pickFromBucket(bucket, remaining, used, usedSubjects, reason));
  };

  take(sharedTopic, "shared-topic");
  take(sameMarque, "same-marque");
  take(
    sameCategory.filter((article) => !sharesMarque(current, article)),
    "same-category",
  );
  take(userInterest, "user-interest");
  take(adjacent, "adjacent-category");

  const editorialFallback = byRank.filter((article) => {
    if (userMake && article.makes.some((make) => norm(make) === userMake)) {
      return article.vehicleTier === "none" || !article.showInPrimaryFeed;
    }
    return true;
  });
  take(editorialFallback, "editorial");

  if (picks.length < KEEP_EXPLORING_MIN) return [];
  return picks.slice(0, max);
}
