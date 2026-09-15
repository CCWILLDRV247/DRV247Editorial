import fs from "node:fs";
import path from "node:path";

export type RankWeights = {
  exactVehicle: number;
  model: number;
  generation: number;
  make: number;
  strongInterest: number;
  secondaryInterest: number;
  highQualityPub: number;
  longForm: number;
  eventLocation: number;
  genericNews: number;
};

export const DEFAULT_RANK_WEIGHTS: RankWeights = {
  exactVehicle: 100,
  model: 80,
  generation: 70,
  make: 40,
  strongInterest: 25,
  secondaryInterest: 10,
  highQualityPub: 20,
  longForm: 15,
  eventLocation: 15,
  genericNews: 5,
};

export function loadRankWeights(cwd = process.cwd()): RankWeights {
  try {
    const raw = fs.readFileSync(path.join(cwd, "config/ranking.json"), "utf8");
    return { ...DEFAULT_RANK_WEIGHTS, ...JSON.parse(raw) };
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
};

export function scoreArticle(
  input: RankInput,
  weights: RankWeights = DEFAULT_RANK_WEIGHTS,
): number {
  let score = 0;
  const makes = new Set(input.makes.map(norm));
  const models = new Set(input.models.map(norm));
  const generations = new Set(input.generations.map(norm));
  const variants = new Set(input.variants.map(norm));
  const interests = new Set(input.interests.map(norm));

  let vehicleMatched = false;
  for (const vehicle of input.vehicles) {
    const make = norm(vehicle.make);
    const model = norm(vehicle.model);
    const generation = vehicle.generation ? norm(vehicle.generation) : "";
    const variant = vehicle.variant ? norm(vehicle.variant) : "";
    if (
      makes.has(make) &&
      models.has(model) &&
      generation &&
      generations.has(generation)
    ) {
      score += weights.exactVehicle;
      vehicleMatched = true;
      if (variant && variants.has(variant)) score += 5;
      continue;
    }
    if (makes.has(make) && models.has(model)) {
      score += weights.model;
      vehicleMatched = true;
      continue;
    }
    if (generation && generations.has(generation)) {
      score += weights.generation;
      vehicleMatched = true;
      continue;
    }
    if (makes.has(make)) {
      score += weights.make;
      vehicleMatched = true;
    }
  }

  const userInterests = input.userInterests.map(norm);
  const strong = userInterests.filter((interest) => interests.has(interest));
  if (strong.length) score += weights.strongInterest;
  const secondary = input.categories
    .map(norm)
    .filter((category) => userInterests.includes(category));
  if (secondary.length) score += weights.secondaryInterest;

  if (input.relevance.toLowerCase().startsWith("excellent")) {
    score += weights.highQualityPub;
  }
  if ((input.excerpt ?? "").length >= 180) score += weights.longForm;

  const location = input.userLocation ? norm(input.userLocation) : "";
  if (location && input.locations.map(norm).includes(location)) {
    score += weights.eventLocation;
  } else if (input.locations.length && input.categories.map(norm).includes("events")) {
    score += weights.eventLocation;
  }

  if (!vehicleMatched && !strong.length) score += weights.genericNews;
  return score;
}

function norm(value: string): string {
  return value.toLowerCase().trim();
}
