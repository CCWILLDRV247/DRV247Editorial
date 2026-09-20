import type { RankBreakdown, RankInput, RankSignal, RankWeights } from "./rank";
import { explainArticle } from "./rank";

export type RelevanceEngineWeights = RankWeights & {
  minDrvRelevance: number;
  drvMetadataVehicle: number;
  drvMetadataInterest: number;
  drvMetadataCategory: number;
  drvMetadataEntity: number;
  drvSourceExcellent: number;
  drvSourceGood: number;
  drvSourceBase: number;
};

export const DEFAULT_RELEVANCE_ENGINE_WEIGHTS: Pick<
  RelevanceEngineWeights,
  | "minDrvRelevance"
  | "drvMetadataVehicle"
  | "drvMetadataInterest"
  | "drvMetadataCategory"
  | "drvMetadataEntity"
  | "drvSourceExcellent"
  | "drvSourceGood"
  | "drvSourceBase"
> = {
  minDrvRelevance: 40,
  drvMetadataVehicle: 12,
  drvMetadataInterest: 6,
  drvMetadataCategory: 8,
  drvMetadataEntity: 3,
  drvSourceExcellent: 40,
  drvSourceGood: 20,
  drvSourceBase: 8,
};

export type RelevanceBuckets = {
  vehicleMatch: number;
  interestMatch: number;
  cultureMatch: number;
  locationMatch: number;
  freshness: number;
  editorialQuality: number;
  deskBoost: number;
  generic: number;
};

export type RelevanceEngineResult = RelevanceBuckets & {
  drvRelevance: number;
  userRelevance: number;
  totalScore: number;
  passedQualityGate: boolean;
  gateNote: string;
};

export function bucketRankSignals(signals: RankSignal[]): RelevanceBuckets {
  const buckets: RelevanceBuckets = {
    vehicleMatch: 0,
    interestMatch: 0,
    cultureMatch: 0,
    locationMatch: 0,
    freshness: 0,
    editorialQuality: 0,
    deskBoost: 0,
    generic: 0,
  };
  for (const signal of signals) {
    if (signal.kind.startsWith("vehicle.")) buckets.vehicleMatch += signal.points;
    else if (signal.kind === "interest" || signal.kind === "interest.secondary") {
      buckets.interestMatch += signal.points;
    } else if (signal.kind === "culture") buckets.cultureMatch += signal.points;
    else if (signal.kind === "location") buckets.locationMatch += signal.points;
    else if (signal.kind === "freshness") buckets.freshness += signal.points;
    else if (signal.kind.startsWith("editorial.")) buckets.editorialQuality += signal.points;
    else if (signal.kind.startsWith("desk")) buckets.deskBoost += signal.points;
    else if (signal.kind === "generic") buckets.generic += signal.points;
  }
  return buckets;
}

/** Platform fit from stored metadata + source quality — no garage context. */
export function automotiveMetadataScore(
  input: Pick<
    RankInput,
    "makes" | "models" | "interests" | "categories" | "primaryCategory" | "entityHits"
  >,
  weights: RelevanceEngineWeights,
): number {
  let score = 0;
  if (input.makes.length || input.models.length) score += weights.drvMetadataVehicle;
  if (input.interests.length) score += weights.drvMetadataInterest;
  if (input.primaryCategory && input.primaryCategory !== "news") {
    score += weights.drvMetadataCategory;
  }
  const aboutEntities = (input.entityHits ?? []).filter(
    (hit) => (hit.relevance ?? "about").toLowerCase() === "about",
  ).length;
  score += Math.min(aboutEntities * weights.drvMetadataEntity, 15);
  return score;
}

export function sourceEditorialScore(sourceRelevance: string, weights: RelevanceEngineWeights): number {
  const token = sourceRelevance.toLowerCase();
  if (token.startsWith("excellent")) return weights.drvSourceExcellent;
  if (token.startsWith("good")) return weights.drvSourceGood;
  return weights.drvSourceBase;
}

export function evaluateRelevanceEngine(
  breakdown: RankBreakdown,
  meta: Pick<
    RankInput,
    | "makes"
    | "models"
    | "interests"
    | "categories"
    | "primaryCategory"
    | "entityHits"
    | "relevance"
    | "deskPick"
  >,
  weights: RelevanceEngineWeights,
): RelevanceEngineResult {
  const buckets = bucketRankSignals(breakdown.signals);
  const metadataScore = automotiveMetadataScore(meta, weights);
  const sourceScore = sourceEditorialScore(meta.relevance, weights);
  const genericBoost =
    buckets.generic > 0 && metadataScore + sourceScore < weights.minDrvRelevance ? buckets.generic : 0;

  const drvRelevance =
    metadataScore + sourceScore + buckets.editorialQuality + buckets.deskBoost + genericBoost;
  const userRelevance =
    buckets.vehicleMatch +
    buckets.interestMatch +
    buckets.cultureMatch +
    buckets.locationMatch;

  const passedQualityGate =
    Boolean(meta.deskPick) ||
    drvRelevance >= weights.minDrvRelevance ||
    userRelevance >= weights.minDrvRelevance;

  const gateNote = meta.deskPick
    ? "desk pick"
    : drvRelevance >= weights.minDrvRelevance
      ? "pass"
      : userRelevance >= weights.minDrvRelevance
        ? "strong user match"
        : `below min DRV relevance (${drvRelevance} < ${weights.minDrvRelevance})`;

  return {
    ...buckets,
    drvRelevance,
    userRelevance,
    totalScore: breakdown.score,
    passedQualityGate,
    gateNote,
  };
}

export function explainAndEvaluate(
  input: RankInput,
  weights: RelevanceEngineWeights,
): RankBreakdown & { engine: RelevanceEngineResult } {
  const breakdown = explainArticle(input, weights);
  const engine = evaluateRelevanceEngine(breakdown, input, weights);
  return { ...breakdown, engine };
}

export function formatRelevanceEngineDebug(input: {
  title?: string;
  engine: RelevanceEngineResult;
  explanation?: string | null;
}): string {
  const { engine, title, explanation } = input;
  const lines = [
    title ? `ARTICLE: ${title}` : null,
    `DRV relevance: ${engine.drvRelevance}`,
    engine.vehicleMatch ? `Vehicle match: +${engine.vehicleMatch}` : null,
    engine.interestMatch ? `Interest match: +${engine.interestMatch}` : null,
    engine.cultureMatch ? `Culture match: +${engine.cultureMatch}` : null,
    engine.freshness ? `Freshness: +${engine.freshness}` : null,
    engine.editorialQuality ? `Editorial quality: +${engine.editorialQuality}` : null,
    engine.locationMatch ? `Location: +${engine.locationMatch}` : null,
    engine.deskBoost ? `Desk: +${engine.deskBoost}` : null,
    `User relevance: ${engine.userRelevance}`,
    `Total score: ${engine.totalScore}`,
    `Quality gate: ${engine.passedQualityGate ? "pass" : "fail"} (${engine.gateNote})`,
    explanation ? `EXPLANATION: ${explanation}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}
