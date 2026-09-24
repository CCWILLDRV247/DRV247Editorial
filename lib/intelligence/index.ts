export { recommend } from "./engine";
export { seedIntelligence } from "./seed";
export { ensureIntelligenceSchema } from "./ensure";
export { bestFitment, matchFitmentRow, fitmentLabel } from "./fitment";
export { applySafetyGate } from "./safety";
export {
  isDesign911Product,
  isFactorySpecLikeForLike,
  isUpgradeReplacement,
  normaliseReplacementGrade,
  productReplacementGrade,
} from "./maintain";
export { briefAsksBrakingOrHandling, isFactoryServicePart } from "./build";
export type { RecommendInput, RecommendResult, ResultCard, ReplacementGrade } from "./types";
