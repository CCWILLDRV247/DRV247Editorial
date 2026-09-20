import fs from "node:fs";
import path from "node:path";
import {
  canonicalInterest,
  garageVehicleLabel,
  interestsMatch,
  variantsMatch,
  vehicleCultureTags,
} from "./personalize";

export type RankWeights = {
  exactVariant: number;
  exactVehicle: number;
  exactModel: number;
  generation: number;
  make: number;
  vehicleCategory: number;
  aboutMultiplier: number;
  relevantMultiplier: number;
  mentionedMultiplier: number;
  strongInterest: number;
  secondaryInterest: number;
  culture: number;
  highQualityPub: number;
  longForm: number;
  eventLocation: number;
  freshnessMax: number;
  freshnessHalfLifeDays: number;
  genericNews: number;
  popularity: number;
  deskPick: number;
  deskPickRelevant: number;
  /** @deprecated use exactModel */
  model?: number;
};

export const DEFAULT_RANK_WEIGHTS: RankWeights = {
  exactVariant: 130,
  exactVehicle: 110,
  exactModel: 95,
  generation: 72,
  make: 48,
  vehicleCategory: 16,
  aboutMultiplier: 1,
  relevantMultiplier: 0.72,
  mentionedMultiplier: 0.32,
  strongInterest: 20,
  secondaryInterest: 9,
  culture: 8,
  highQualityPub: 12,
  longForm: 8,
  eventLocation: 11,
  freshnessMax: 10,
  freshnessHalfLifeDays: 12,
  genericNews: 3,
  popularity: 0,
  deskPick: 8,
  deskPickRelevant: 10,
};

export function loadRankWeights(cwd = process.cwd()): RankWeights {
  try {
    const raw = fs.readFileSync(path.join(cwd, "config/ranking.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<RankWeights>;
    return {
      ...DEFAULT_RANK_WEIGHTS,
      ...parsed,
      exactVariant: parsed.exactVariant ?? DEFAULT_RANK_WEIGHTS.exactVariant,
      exactVehicle: parsed.exactVehicle ?? DEFAULT_RANK_WEIGHTS.exactVehicle,
      exactModel: parsed.exactModel ?? parsed.model ?? DEFAULT_RANK_WEIGHTS.exactModel,
      generation: parsed.generation ?? DEFAULT_RANK_WEIGHTS.generation,
      make: parsed.make ?? DEFAULT_RANK_WEIGHTS.make,
    };
  } catch {
    return DEFAULT_RANK_WEIGHTS;
  }
}

export type GarageVehicle = {
  make: string;
  model: string;
  generation?: string | null;
  variant?: string | null;
};

export type EntityHit = {
  kind: string;
  name: string;
  make?: string | null;
  model?: string | null;
  relevance?: string | null;
};

export type VehicleTier = "variant" | "vehicle" | "model" | "generation" | "make" | "category" | "none";

export type RankSignal = {
  kind: string;
  points: number;
  detail: string;
};

export type RankBreakdown = {
  score: number;
  reasons: string[];
  signals: RankSignal[];
  vehicleTier: VehicleTier;
};

export type RankInput = {
  makes: string[];
  models: string[];
  generations: string[];
  variants: string[];
  interests: string[];
  categories: string[];
  locations: string[];
  excerpt: string;
  relevance: string;
  vehicles: GarageVehicle[];
  userInterests: string[];
  userLocation?: string | null;
  entityHits?: EntityHit[];
  scenes?: string[];
  contentTypes?: string[];
  geography?: string[];
  publishedAt?: number;
  primaryCategory?: string;
  deskPick?: boolean;
};

const TIER_RANK: Record<VehicleTier, number> = {
  variant: 6,
  vehicle: 5,
  model: 4,
  generation: 3,
  make: 2,
  category: 1,
  none: 0,
};

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function relevanceMultiplier(relevance: string | null | undefined, weights: RankWeights) {
  const token = (relevance ?? "about").toLowerCase();
  if (token === "mentioned") return weights.mentionedMultiplier;
  if (token === "relevant") return weights.relevantMultiplier;
  return weights.aboutMultiplier;
}

function bestEntityRelevance(
  hits: EntityHit[],
  match: (hit: EntityHit) => boolean,
) {
  const matched = hits.filter(match);
  if (!matched.length) return "about";
  const order = ["about", "relevant", "mentioned"];
  return matched.sort(
    (a, b) =>
      order.indexOf((a.relevance ?? "about").toLowerCase()) -
      order.indexOf((b.relevance ?? "about").toLowerCase()),
  )[0]?.relevance ?? "about";
}

function locationIsSupplementary(input: RankInput) {
  const types = (input.contentTypes ?? []).map(norm);
  const categories = input.categories.map(norm);
  const interests = input.interests.map(norm);
  return (
    types.includes("event") ||
    types.includes("road trip") ||
    norm(input.primaryCategory ?? "") === "events" ||
    categories.includes("events") ||
    interests.includes("events") ||
    interests.includes("road trips") ||
    categories.includes("road trips")
  );
}

export function explainArticle(
  input: RankInput,
  weights: RankWeights = DEFAULT_RANK_WEIGHTS,
): RankBreakdown {
  const signals: RankSignal[] = [];
  const reasons: string[] = [];
  const makes = new Set(input.makes.map(norm));
  const models = new Set(input.models.map(norm));
  const generations = new Set(input.generations.map(norm));
  const variants = input.variants;
  const hits = input.entityHits ?? [];
  const garageLabel = input.vehicles.map(garageVehicleLabel).filter(Boolean)[0];

  let vehicleTier: VehicleTier = "none";
  let vehiclePoints = 0;
  let vehicleRelevance = "about";
  let matchedVehicle: GarageVehicle | undefined;

  for (const vehicle of input.vehicles) {
    const make = norm(vehicle.make);
    const model = norm(vehicle.model);
    const generation = vehicle.generation ? norm(vehicle.generation) : "";
    const variant = vehicle.variant ?? "";
    const makeHit = Boolean(make && makes.has(make));
    const modelHit = Boolean(model && models.has(model));
    const generationHit = Boolean(generation && generations.has(generation));
    const variantHit = Boolean(variant && variants.some((item) => variantsMatch(item, variant)));

    let tier: VehicleTier = "none";
    let base = 0;
    if (makeHit && modelHit && variantHit) {
      tier = "variant";
      base = weights.exactVariant;
    } else if (makeHit && modelHit && generationHit) {
      tier = "vehicle";
      base = weights.exactVehicle;
    } else if (makeHit && modelHit) {
      tier = "model";
      base = weights.exactModel;
    } else if (generationHit && (makeHit || modelHit)) {
      tier = "generation";
      base = weights.generation;
    } else if (makeHit) {
      tier = "make";
      base = weights.make;
    } else {
      const culture = vehicleCultureTags(vehicle).map(norm);
      const articleTags = [...input.interests, ...input.categories, ...(input.scenes ?? [])].map(norm);
      if (culture.some((tag) => articleTags.includes(tag))) {
        tier = "category";
        base = weights.vehicleCategory;
      }
    }

    if (TIER_RANK[tier] <= TIER_RANK[vehicleTier]) continue;

    const rel = bestEntityRelevance(hits, (hit) => {
      if (tier === "variant") {
        return hit.kind === "variant" && variantsMatch(hit.name, variant);
      }
      if (tier === "vehicle" || tier === "generation") {
        return hit.kind === "generation" && norm(hit.name) === generation;
      }
      if (tier === "model") {
        return (
          (hit.kind === "model" && norm(hit.name) === model) ||
          (hit.kind === "make" && norm(hit.name) === make)
        );
      }
      if (tier === "make") return hit.kind === "make" && norm(hit.name) === make;
      return false;
    });
    const points = Math.round(base * relevanceMultiplier(rel, weights));
    vehicleTier = tier;
    vehiclePoints = points;
    vehicleRelevance = (rel ?? "about").toLowerCase();
    matchedVehicle = vehicle;
  }

  if (vehiclePoints) {
    signals.push({
      kind: `vehicle.${vehicleTier}`,
      points: vehiclePoints,
      detail: `${vehicleRelevance} ${vehicleTier} match`,
    });
    if (garageLabel || matchedVehicle?.make) {
      if (vehicleRelevance === "mentioned") {
        reasons.push(`Mentions your ${garageLabel}`);
      } else if (vehicleTier === "category") {
        reasons.push(`In the world of your ${garageLabel}`);
      } else if (vehicleTier === "make") {
        reasons.push(`Relevant to ${matchedVehicle!.make} owners`);
      } else if (garageLabel) {
        reasons.push(`Because you drive a ${garageLabel}`);
      }
    }
  }

  const userInterests = input.userInterests.map(canonicalInterest);
  const matchedInterests = [
    ...new Set(
      userInterests.filter((interest) =>
        input.interests.some((item) => interestsMatch(item, interest)),
      ),
    ),
  ];
  if (matchedInterests.length) {
    signals.push({
      kind: "interest",
      points: weights.strongInterest,
      detail: matchedInterests.join(" + "),
    });
    reasons.push(
      matchedInterests.length > 1
        ? `Because you like ${matchedInterests.join(" + ")}`
        : `Because you follow ${matchedInterests.join(" + ")}`,
    );
  }
  const secondary = input.categories.filter((category) =>
    userInterests.some((interest) => interestsMatch(category, interest)),
  );
  if (secondary.length && !matchedInterests.length) {
    signals.push({
      kind: "interest.secondary",
      points: weights.secondaryInterest,
      detail: secondary.join(" + "),
    });
  }

  const sceneHits = (input.scenes ?? []).filter((scene) =>
    userInterests.some((interest) => interestsMatch(scene, interest)),
  );
  if (sceneHits.length) {
    signals.push({
      kind: "culture",
      points: weights.culture,
      detail: sceneHits.join(" + "),
    });
  }

  const pub = input.relevance.toLowerCase();
  if (pub.startsWith("excellent")) {
    signals.push({ kind: "editorial.quality", points: weights.highQualityPub, detail: "excellent source" });
  }
  if ((input.excerpt ?? "").length >= 180) {
    signals.push({ kind: "editorial.longform", points: weights.longForm, detail: "long teaser" });
  }

  const location = input.userLocation ? norm(input.userLocation) : "";
  const placeNames = [...input.locations, ...(input.geography ?? [])];
  if (location && locationIsSupplementary(input) && placeNames.some((place) => norm(place) === location)) {
    signals.push({
      kind: "location",
      points: weights.eventLocation,
      detail: input.userLocation ?? location,
    });
    reasons.push(`Because it's in ${input.userLocation}`);
  }

  if (input.publishedAt) {
    const fresh = recencyBonus(input.publishedAt, Date.now(), weights);
    if (fresh > 0) {
      const scaled =
        vehicleTier === "none" || vehicleTier === "category" ? Math.round(fresh * 0.35) : fresh;
      signals.push({ kind: "freshness", points: scaled, detail: `${scaled} freshness` });
    }
  }

  if (weights.popularity > 0) {
    signals.push({ kind: "popularity", points: weights.popularity, detail: "owner popularity" });
  }

  if (input.deskPick) {
    signals.push({
      kind: "desk",
      points: weights.deskPick,
      detail: "DRV247 Desk",
    });
    const deskRelevant =
      vehicleTier === "variant" ||
      vehicleTier === "vehicle" ||
      vehicleTier === "model" ||
      vehicleTier === "generation" ||
      vehicleTier === "make";
    if (deskRelevant) {
      signals.push({
        kind: "desk.relevant",
        points: weights.deskPickRelevant,
        detail: "desk + car",
      });
    }
    reasons.push("From the DRV247 Desk");
  }

  if (vehicleTier === "none" && !matchedInterests.length) {
    signals.push({ kind: "generic", points: weights.genericNews, detail: "the car world" });
  }

  const score = signals.reduce((sum, signal) => sum + signal.points, 0);
  return { score, reasons, signals, vehicleTier };
}

export function scoreArticle(
  input: RankInput,
  weights: RankWeights = DEFAULT_RANK_WEIGHTS,
): number {
  return explainArticle(input, weights).score;
}

/** For You without a garage/test profile: source quality + recency. No vehicle matching. */
export function scoreForYou(input: {
  relevance: string;
  publishedAt: number;
  excerptLength: number;
}): number {
  let score = 0;
  const relevance = input.relevance.toLowerCase();
  if (relevance.startsWith("excellent")) score += 40;
  else if (relevance.startsWith("good")) score += 20;
  else score += 8;
  score += recencyBonus(input.publishedAt);
  if (input.excerptLength >= 180) score += 15;
  return score;
}

export function recencyBonus(
  publishedAt: number,
  now = Date.now(),
  weights: RankWeights = DEFAULT_RANK_WEIGHTS,
): number {
  const ageDays = Math.max(0, (now - publishedAt) / 86_400_000);
  const halfLife = Math.max(1, weights.freshnessHalfLifeDays);
  const decay = Math.pow(0.5, ageDays / halfLife);
  return Math.round(weights.freshnessMax * decay);
}

export function diversifyByVehicle<T>(
  items: T[],
  keyFor: (item: T) => string,
  window = 5,
): T[] {
  if (items.length <= window) return items;
  const headKeys = items.slice(0, window).map(keyFor);
  const first = headKeys[0];
  if (!first || headKeys.some((key) => key !== first)) return items;
  const swapIndex = items.findIndex((item, index) => index >= window && keyFor(item) && keyFor(item) !== first);
  if (swapIndex < 0) return items;
  const next = items.slice();
  const [swap] = next.splice(swapIndex, 1);
  next.splice(window - 1, 0, swap);
  return next;
}

export function preferUsableImages<T extends { imageUrl: string | null }>(items: T[], topN = 6): T[] {
  const withImage: T[] = [];
  const missing: T[] = [];
  for (const item of items) {
    if (item.imageUrl) withImage.push(item);
    else missing.push(item);
  }
  const head = withImage.slice(0, topN);
  const rest = [...withImage.slice(topN), ...missing];
  return [...head, ...rest];
}
