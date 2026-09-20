import {
  automotiveMetadataScore,
  type RelevanceEngineResult,
  type RelevanceEngineWeights,
} from "./relevance-engine";
import type { RankInput } from "./rank";

export type QualityBand = "featured" | "eligible" | "deprioritised" | "excluded";

export type QualityFilterWeights = RelevanceEngineWeights & {
  minAutomotiveRelevance: number;
  minEditorialQuality: number;
  eligibleDrvRelevance: number;
  deprioritisedDrvRelevance: number;
  featuredDrvRelevance: number;
};

export const DEFAULT_QUALITY_FILTER_WEIGHTS: Pick<
  QualityFilterWeights,
  | "minAutomotiveRelevance"
  | "minEditorialQuality"
  | "eligibleDrvRelevance"
  | "deprioritisedDrvRelevance"
  | "featuredDrvRelevance"
> = {
  minAutomotiveRelevance: 12,
  minEditorialQuality: 8,
  eligibleDrvRelevance: 40,
  deprioritisedDrvRelevance: 28,
  featuredDrvRelevance: 56,
};

export type QualityFilterResult = {
  band: QualityBand;
  reason: string;
  automotiveScore: number;
  showInPrimaryFeed: boolean;
  sortPenalty: number;
};

function isGenericIndustryNews(
  engine: RelevanceEngineResult,
  meta: Pick<RankInput, "primaryCategory" | "contentTypes" | "makes" | "models">,
) {
  const types = (meta.contentTypes ?? []).map((value) => value.toLowerCase());
  const thinMetadata = !meta.makes.length && !meta.models.length;
  const newsy =
    meta.primaryCategory === "news" ||
    types.includes("news") ||
    engine.generic > 0;
  return newsy && thinMetadata && engine.vehicleMatch === 0 && engine.interestMatch === 0;
}

export function evaluateQualityFilter(
  engine: RelevanceEngineResult,
  meta: Pick<
    RankInput,
    | "makes"
    | "models"
    | "interests"
    | "categories"
    | "primaryCategory"
    | "entityHits"
    | "contentTypes"
    | "deskPick"
  >,
  weights: QualityFilterWeights,
): QualityFilterResult {
  const automotiveScore = automotiveMetadataScore(meta, weights);
  const strongUser = engine.userRelevance >= weights.minDrvRelevance;

  if (meta.deskPick) {
    return {
      band: "featured",
      reason: "desk pick",
      automotiveScore,
      showInPrimaryFeed: true,
      sortPenalty: 0,
    };
  }

  if (
    isGenericIndustryNews(engine, meta) &&
    engine.drvRelevance < weights.eligibleDrvRelevance &&
    !strongUser
  ) {
    return {
      band: "excluded",
      reason: "generic industry news — weak automotive connection",
      automotiveScore,
      showInPrimaryFeed: false,
      sortPenalty: 0,
    };
  }

  if (engine.drvRelevance < weights.deprioritisedDrvRelevance && !strongUser) {
    return {
      band: "excluded",
      reason: engine.gateNote || "below quality threshold",
      automotiveScore,
      showInPrimaryFeed: false,
      sortPenalty: 0,
    };
  }

  if (
    engine.drvRelevance >= weights.featuredDrvRelevance &&
    automotiveScore >= weights.minAutomotiveRelevance &&
    engine.editorialQuality >= weights.minEditorialQuality
  ) {
    return {
      band: "featured",
      reason: "strong DRV247 fit",
      automotiveScore,
      showInPrimaryFeed: true,
      sortPenalty: 0,
    };
  }

  if (engine.drvRelevance >= weights.eligibleDrvRelevance || strongUser) {
    return {
      band: "eligible",
      reason: strongUser ? "strong user match" : "eligible DRV relevance",
      automotiveScore,
      showInPrimaryFeed: true,
      sortPenalty: 0,
    };
  }

  return {
    band: "deprioritised",
    reason: "potentially relevant — deprioritised",
    automotiveScore,
    showInPrimaryFeed: false,
    sortPenalty: 18,
  };
}

export function formatQualityFilterDebug(input: {
  quality: QualityFilterResult;
  engine: RelevanceEngineResult;
}): string {
  const { quality, engine } = input;
  return [
    `Quality band: ${quality.band}`,
    `Reason: ${quality.reason}`,
    `Automotive metadata: ${quality.automotiveScore}`,
    `DRV relevance: ${engine.drvRelevance}`,
    `User relevance: ${engine.userRelevance}`,
    quality.showInPrimaryFeed ? "Primary feed: yes" : "Primary feed: no (Discover only)",
  ].join("\n");
}
