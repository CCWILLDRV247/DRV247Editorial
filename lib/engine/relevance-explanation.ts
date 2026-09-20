import { garageVehicleLabel } from "./personalize";
import type { GarageVehicle, RankSignal, VehicleTier } from "./rank";

export type ExplanationLane = "vehicle" | "interests" | "discover" | "carousel" | "none";

export type RelevanceExplanationInput = {
  why: string[];
  rankSignals: RankSignal[];
  vehicleTier: VehicleTier;
  lane?: ExplanationLane;
  vehicles?: GarageVehicle[];
  userInterests?: string[];
};

export type RelevanceDebugRow = {
  id: number;
  title: string;
  score: number;
  vehicleTier: VehicleTier;
  why: string[];
  signals: RankSignal[];
  matches: string[];
  user: string;
  explanation: string | null;
  confidence: RelevanceConfidence;
};

export type RelevanceConfidence = "high" | "medium" | "low" | "none";

const TIER_PRIORITY: VehicleTier[] = [
  "variant",
  "vehicle",
  "model",
  "generation",
  "make",
  "category",
  "none",
];

function vehicleSignal(signals: RankSignal[]) {
  return signals.find((signal) => signal.kind.startsWith("vehicle."));
}

function signalRelevance(signal: RankSignal | undefined) {
  return (signal?.detail.split(" ")[0] ?? "about").toLowerCase();
}

function pickWhy(why: string[], pattern: RegExp) {
  return why.find((line) => pattern.test(line)) ?? null;
}

function userSummary(vehicles: GarageVehicle[], interests: string[]) {
  const car = vehicles.map(garageVehicleLabel).filter(Boolean)[0];
  const tags = interests.filter(Boolean);
  if (car && tags.length) return `${car} · ${tags.join(" · ")}`;
  if (car) return car;
  if (tags.length) return tags.join(" · ");
  return "—";
}

function matchLabels(signals: RankSignal[]) {
  return signals
    .filter((signal) => !["freshness", "generic", "popularity"].includes(signal.kind))
    .map((signal) => {
      if (signal.kind.startsWith("vehicle.")) {
        return `${signal.kind.replace("vehicle.", "")} (${signal.detail})`;
      }
      return signal.detail || signal.kind;
    });
}

export function relevanceConfidence(input: {
  rankSignals: RankSignal[];
  vehicleTier: VehicleTier;
  score: number;
}): RelevanceConfidence {
  const { rankSignals, vehicleTier, score } = input;
  if (vehicleTier === "variant" || vehicleTier === "vehicle") return "high";
  if (vehicleTier === "model" || vehicleTier === "generation") return "medium";
  if (rankSignals.some((signal) => signal.kind === "interest")) return "medium";
  if (vehicleTier === "make" || rankSignals.some((signal) => signal.kind === "culture")) return "low";
  if (score > 0 && rankSignals.some((signal) => signal.kind.startsWith("editorial"))) return "low";
  return "none";
}

/** One public card line from existing rank signals — never re-scores, never fabricates. */
export function pickRelevanceExplanation(input: RelevanceExplanationInput): string | null {
  const lane = input.lane ?? "none";
  const garageLabel = input.vehicles?.map(garageVehicleLabel).filter(Boolean)[0];
  const userMake = input.vehicles?.[0]?.make?.trim();
  const vehicle = vehicleSignal(input.rankSignals);

  if (vehicle && input.vehicleTier !== "none") {
    const rel = signalRelevance(vehicle);
    if (rel === "mentioned") {
      return garageLabel ? pickWhy(input.why, /mentions your/i) ?? `Mentions your ${garageLabel}` : null;
    }
    if (input.vehicleTier === "category") {
      return garageLabel
        ? pickWhy(input.why, /in the world of your/i) ?? `In the world of your ${garageLabel}`
        : null;
    }
    if (input.vehicleTier === "make") {
      return userMake
        ? pickWhy(input.why, /relevant to/i) ?? `Relevant to ${userMake} owners`
        : null;
    }
    if (TIER_PRIORITY.indexOf(input.vehicleTier) <= TIER_PRIORITY.indexOf("generation")) {
      return garageLabel
        ? pickWhy(input.why, /because you drive/i) ?? `Because you drive a ${garageLabel}`
        : null;
    }
  }

  const interest = input.rankSignals.find((signal) => signal.kind === "interest");
  if (interest && (lane === "vehicle" || lane === "interests" || lane === "discover")) {
    return (
      pickWhy(input.why, /because you (follow|like)/i) ??
      (interest.detail
        ? interest.detail.includes(" + ")
          ? `Because you like ${interest.detail}`
          : `Because you follow ${interest.detail}`
        : null)
    );
  }

  const culture = input.rankSignals.find((signal) => signal.kind === "culture");
  if (culture?.detail && lane === "discover") {
    return `From the world of ${culture.detail}`;
  }

  const location = input.rankSignals.find((signal) => signal.kind === "location");
  if (location) {
    const place = location.detail;
    if (place && place !== location.kind) {
      return pickWhy(input.why, /because it's in/i) ?? `Because it's in ${place}`;
    }
    return "Near you";
  }

  if (lane === "discover" && input.rankSignals.some((signal) => signal.kind === "editorial.quality")) {
    return "Worth a look";
  }

  return null;
}

export function buildRelevanceDebugRow(
  article: {
    id: number;
    title: string;
    rankScore: number;
    why: string[];
    rankSignals: RankSignal[];
    vehicleTier: VehicleTier;
  },
  vehicles: GarageVehicle[],
  interests: string[],
): RelevanceDebugRow {
  const explanation = pickRelevanceExplanation({
    why: article.why,
    rankSignals: article.rankSignals,
    vehicleTier: article.vehicleTier,
    lane: "vehicle",
    vehicles,
    userInterests: interests,
  });
  return {
    id: article.id,
    title: article.title,
    score: article.rankScore,
    vehicleTier: article.vehicleTier,
    why: article.why,
    signals: article.rankSignals,
    matches: matchLabels(article.rankSignals),
    user: userSummary(vehicles, interests),
    explanation,
    confidence: relevanceConfidence({
      rankSignals: article.rankSignals,
      vehicleTier: article.vehicleTier,
      score: article.rankScore,
    }),
  };
}

export function formatRelevanceDebugBlock(row: RelevanceDebugRow) {
  return [
    `ARTICLE: ${row.title}`,
    `SCORE: ${row.score}`,
    `MATCHES: ${row.matches.length ? row.matches.join(", ") : "—"}`,
    `USER: ${row.user}`,
    `CONFIDENCE: ${row.confidence}`,
    `EXPLANATION: ${row.explanation ?? "—"}`,
  ].join("\n");
}
