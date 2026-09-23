import fs from "node:fs";
import path from "node:path";
import type { EditorialInterlude } from "./editorial-interlude";
import { listActiveEditorialInterludes } from "./editorial-interlude";
import type { ForYouTestProfile } from "./for-you-test";
import { recentUsePenaltyWeight } from "./interlude-recent";
import { canonicalInterest, interestsMatch } from "./personalize";
import type { EditorialDto } from "./queries";

export type InterludeContextSource = Pick<
  EditorialDto,
  "makes" | "models" | "interests" | "categories" | "primaryCategory"
>;

export type InterludeContext = {
  categories: string[];
  tags: string[];
  marques: string[];
  themes: string[];
  userInterests: string[];
  userMake?: string;
};

export type HomepageInterludeSlotId =
  | "after-picks"
  | "before-categories"
  | "mid-categories"
  | "before-view-all";

export type SelectedHomepageInterlude = {
  slot: HomepageInterludeSlotId;
  interlude: EditorialInterlude;
  score: number;
};

export type InterludeSelectionWeights = {
  categoryMatch: number;
  tagMatch: number;
  marqueMatch: number;
  themeMatch: number;
  /** Profile garage marque — lower than {@link marqueMatch}. */
  userMarqueMatch: number;
  /** Profile interests — lower than {@link tagMatch}. */
  userInterestMatch: number;
  /** Back-to-back profile-aligned lines — keeps personalisation subtle. */
  personalisationRepeatPenalty: number;
  /** Penalty when an interlude id appears in recent cross-profile history. */
  recentUsePenalty: number;
  /** Extra penalty for the single most recently shown interlude. */
  recentMostRecentExtraPenalty: number;
  /** Allow excluding the most recent pick when the next candidate is within this score gap. */
  recentExcludeMaxGap: number;
  usagePenalty: number;
  consecutiveTypePenalty: number;
  consecutiveTagPenalty: number;
  randomSpread: number;
  priorityBonus: number;
  broadLineBaseline: number;
  wrongMarquePenalty: number;
  minHomepageInterludes: number;
  maxHomepageInterludes: number;
};

export const DEFAULT_INTERLUDE_SELECTION_WEIGHTS: InterludeSelectionWeights = {
  categoryMatch: 18,
  tagMatch: 22,
  marqueMatch: 28,
  themeMatch: 14,
  userMarqueMatch: 9,
  userInterestMatch: 11,
  personalisationRepeatPenalty: 16,
  recentUsePenalty: 34,
  recentMostRecentExtraPenalty: 18,
  recentExcludeMaxGap: 18,
  usagePenalty: 45,
  consecutiveTypePenalty: 12,
  consecutiveTagPenalty: 18,
  randomSpread: 8,
  priorityBonus: 6,
  broadLineBaseline: 4,
  wrongMarquePenalty: 22,
  minHomepageInterludes: 1,
  maxHomepageInterludes: 4,
};

export function loadInterludeSelectionWeights(cwd = process.cwd()): InterludeSelectionWeights {
  try {
    const raw = fs.readFileSync(path.join(cwd, "config/interlude-selection.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<InterludeSelectionWeights>;
    return { ...DEFAULT_INTERLUDE_SELECTION_WEIGHTS, ...parsed };
  } catch {
    return DEFAULT_INTERLUDE_SELECTION_WEIGHTS;
  }
}

function norm(value: string) {
  return value.toLowerCase().trim();
}

function rankedKeys(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key]) => key);
}

export function buildInterludeContext(
  articles: InterludeContextSource[],
  profile?: ForYouTestProfile,
): InterludeContext {
  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const marqueCounts = new Map<string, number>();

  for (const article of articles) {
    for (const category of [article.primaryCategory, ...article.categories]) {
      if (!category) continue;
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    for (const interest of article.interests) {
      const tag = canonicalInterest(interest);
      tagCounts.set(norm(tag), (tagCounts.get(norm(tag)) ?? 0) + 1);
    }
    for (const make of article.makes) {
      marqueCounts.set(norm(make), (marqueCounts.get(norm(make)) ?? 0) + 1);
    }
  }

  const tags = rankedKeys(tagCounts).map((token) => canonicalInterest(token));
  return {
    categories: rankedKeys(categoryCounts),
    tags,
    marques: rankedKeys(marqueCounts),
    themes: tags.slice(0, 5),
    userInterests: (profile?.interests ?? []).map(canonicalInterest),
    userMake: profile?.make ? norm(profile.make) : undefined,
  };
}

function rankWeight(index: number) {
  return 1 / (index + 1);
}

function interludeMatchesUserMarque(interlude: EditorialInterlude, userMake?: string) {
  if (!userMake || !interlude.marques?.length) return false;
  return interlude.marques.some((marque) => norm(marque) === userMake);
}

function interludeMatchesUserInterests(interlude: EditorialInterlude, userInterests: string[]) {
  if (!userInterests.length || !interlude.tags?.length) return false;
  return interlude.tags.some((tag) =>
    userInterests.some((interest) => interestsMatch(tag, interest)),
  );
}

function interludePersonalisationAffinity(
  interlude: EditorialInterlude,
  context: InterludeContext,
) {
  let affinity = 0;
  if (interludeMatchesUserMarque(interlude, context.userMake)) affinity += 1;
  const matchedInterests =
    interlude.tags?.filter((tag) =>
      context.userInterests.some((interest) => interestsMatch(tag, interest)),
    ).length ?? 0;
  affinity += Math.min(matchedInterests, 2);
  return affinity;
}

function seededUnit(seed: number, id: string) {
  let hash = seed ^ id.length;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 0x5bd1e995);
    hash ^= hash >>> 13;
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

export function scoreInterludeCandidate(
  interlude: EditorialInterlude,
  context: InterludeContext,
  opts: {
    weights: InterludeSelectionWeights;
    usedIds: ReadonlySet<string>;
    previous: ReadonlyArray<EditorialInterlude>;
    recentIds?: readonly string[];
    seed: number;
  },
): number {
  const { weights, usedIds, previous, recentIds = [], seed } = opts;
  let score = 0;

  if (interlude.categories?.length) {
    for (const category of interlude.categories) {
      const index = context.categories.indexOf(category);
      if (index >= 0) score += weights.categoryMatch * rankWeight(index);
    }
  } else {
    score += weights.broadLineBaseline;
  }

  if (interlude.tags?.length) {
    for (const tag of interlude.tags) {
      const index = context.tags.findIndex((item) => interestsMatch(item, tag));
      if (index >= 0) score += weights.tagMatch * rankWeight(index);
    }
  }

  if (interlude.marques?.length) {
    for (const marque of interlude.marques) {
      const token = norm(marque);
      const index = context.marques.indexOf(token);
      if (index >= 0) {
        score += weights.marqueMatch * rankWeight(index);
      } else if (context.userMake === token) {
        score += weights.userMarqueMatch;
      } else {
        score -= weights.wrongMarquePenalty;
      }
    }
  }

  if (interlude.tags?.length && context.themes.length) {
    for (const tag of interlude.tags) {
      if (context.themes.some((theme) => interestsMatch(theme, tag))) {
        score += weights.themeMatch;
      }
    }
  }

  if (interlude.tags?.length && context.userInterests.length) {
    let bestRank = -1;
    for (const tag of interlude.tags) {
      for (let index = 0; index < context.userInterests.length; index += 1) {
        if (interestsMatch(tag, context.userInterests[index]!)) {
          bestRank = bestRank < 0 ? index : Math.min(bestRank, index);
        }
      }
    }
    if (bestRank >= 0) {
      score += weights.userInterestMatch * rankWeight(bestRank);
    }
  }

  if (usedIds.has(interlude.id)) score -= weights.usagePenalty;

  if (recentIds.length) {
    const index = recentIds.indexOf(interlude.id);
    if (index >= 0) {
      score -= weights.recentUsePenalty * recentUsePenaltyWeight(index, recentIds.length);
      if (index === 0) score -= weights.recentMostRecentExtraPenalty;
    }
  }

  const prev = previous[previous.length - 1];
  if (prev) {
    if (
      interludePersonalisationAffinity(prev, context) > 0 &&
      interludePersonalisationAffinity(interlude, context) > 0
    ) {
      score -= weights.personalisationRepeatPenalty;
    }
    if (prev.type === interlude.type) score -= weights.consecutiveTypePenalty;
    const prevTags = new Set((prev.tags ?? []).map((tag) => norm(canonicalInterest(tag))));
    const overlap =
      interlude.tags?.filter((tag) => prevTags.has(norm(canonicalInterest(tag)))).length ?? 0;
    if (overlap >= 2) score -= weights.consecutiveTagPenalty;
    if (prev.id === interlude.id) score -= weights.usagePenalty;
  }

  score += (interlude.priority / 100) * weights.priorityBonus;
  score += seededUnit(seed, interlude.id) * weights.randomSpread;
  return score;
}

export function pickInterludeForContext(
  context: InterludeContext,
  opts?: {
    candidates?: EditorialInterlude[];
    weights?: InterludeSelectionWeights;
    usedIds?: Set<string>;
    previous?: EditorialInterlude[];
    recentIds?: readonly string[];
    seed?: number;
  },
): { interlude: EditorialInterlude; score: number } | undefined {
  const candidates = opts?.candidates ?? listActiveEditorialInterludes();
  const weights = opts?.weights ?? DEFAULT_INTERLUDE_SELECTION_WEIGHTS;
  const usedIds = opts?.usedIds ?? new Set<string>();
  const previous = opts?.previous ?? [];
  const recentIds = opts?.recentIds ?? [];
  const seed = opts?.seed ?? 0;

  const scored = candidates
    .map((interlude) => ({
      interlude,
      score: scoreInterludeCandidate(interlude, context, {
        weights,
        usedIds,
        previous,
        recentIds,
        seed: seed ^ interlude.id.length,
      }),
    }))
    .sort((left, right) => right.score - left.score);

  if (!scored.length) return undefined;

  const recentSet = new Set(recentIds);
  let pick = scored[0]!;
  const mostRecent = recentIds[0];

  if (mostRecent && pick.interlude.id === mostRecent) {
    const alternative = scored.find((row) => row.interlude.id !== mostRecent);
    if (alternative && pick.score - alternative.score <= weights.recentExcludeMaxGap) {
      pick = alternative;
    }
  }

  if (recentSet.has(pick.interlude.id)) {
    const fresh = scored.find((row) => !recentSet.has(row.interlude.id));
    if (fresh && pick.score - fresh.score <= weights.recentExcludeMaxGap) {
      pick = fresh;
    }
  }

  return pick;
}

export function profileInterludeSeed(profile?: ForYouTestProfile) {
  const parts = [
    profile?.preset ?? "",
    profile?.make ?? "",
    profile?.model ?? "",
    profile?.generation ?? "",
    profile?.variant ?? "",
    ...(profile?.interests ?? []),
  ];
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

type HomepageInterludePlanInput = {
  picks: InterludeContextSource[];
  forYourCar: InterludeContextSource[];
  yourInterests: InterludeContextSource[];
  carousels: { slug: string; articles: InterludeContextSource[] }[];
  profile?: ForYouTestProfile;
  weights?: InterludeSelectionWeights;
  seed?: number;
  recentIds?: readonly string[];
};

function plannedHomepageSlots(input: HomepageInterludePlanInput): HomepageInterludeSlotId[] {
  const slots: HomepageInterludeSlotId[] = ["before-categories"];
  if (input.picks.length >= 2 && (input.forYourCar.length > 0 || input.yourInterests.length > 0)) {
    slots.unshift("after-picks");
  }
  if (input.carousels.length >= 3) slots.push("mid-categories");
  if (input.carousels.length >= 2) slots.push("before-view-all");
  return slots.slice(0, input.weights?.maxHomepageInterludes ?? DEFAULT_INTERLUDE_SELECTION_WEIGHTS.maxHomepageInterludes);
}

function contextForSlot(
  slot: HomepageInterludeSlotId,
  input: HomepageInterludePlanInput,
): InterludeContextSource[] {
  switch (slot) {
    case "after-picks":
      return [...input.picks, ...input.forYourCar.slice(0, 2)];
    case "before-categories":
      return [
        ...input.picks,
        ...input.forYourCar,
        ...input.yourInterests,
      ];
    case "mid-categories": {
      const midpoint = Math.floor((input.carousels.length - 1) / 2);
      return input.carousels.slice(0, midpoint + 1).flatMap((lane) => lane.articles);
    }
    case "before-view-all":
      return input.carousels.flatMap((lane) => lane.articles);
    default:
      return [];
  }
}

export function selectHomepageInterludes(
  input: HomepageInterludePlanInput,
): SelectedHomepageInterlude[] {
  const weights = input.weights ?? DEFAULT_INTERLUDE_SELECTION_WEIGHTS;
  const seed = input.seed ?? profileInterludeSeed(input.profile);
  const recentIds = input.recentIds ?? [];
  const candidates = listActiveEditorialInterludes();
  const slots = plannedHomepageSlots({ ...input, weights });
  const usedIds = new Set<string>();
  const previous: EditorialInterlude[] = [];
  const selected: SelectedHomepageInterlude[] = [];

  for (const slot of slots) {
    const context = buildInterludeContext(contextForSlot(slot, input), input.profile);
    const pick = pickInterludeForContext(context, {
      candidates,
      weights,
      usedIds,
      previous,
      recentIds,
      seed: seed ^ slot.length,
    });
    if (!pick) continue;
    selected.push({ slot, interlude: pick.interlude, score: pick.score });
    usedIds.add(pick.interlude.id);
    previous.push(pick.interlude);
  }

  if (selected.length < weights.minHomepageInterludes) {
    const fallback = pickInterludeForContext(
      buildInterludeContext(
        [...input.picks, ...input.forYourCar, ...input.yourInterests],
        input.profile,
      ),
      { candidates, weights, seed, recentIds },
    );
    if (fallback) {
      selected.push({
        slot: "before-categories",
        interlude: fallback.interlude,
        score: fallback.score,
      });
    }
  }

  return selected;
}

export function interludeByHomepageSlot(
  selected: SelectedHomepageInterlude[],
  slot: HomepageInterludeSlotId,
) {
  return selected.find((item) => item.slot === slot)?.interlude;
}
