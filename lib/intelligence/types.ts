export const INTENTS = ["build", "maintain", "restore"] as const;
export type Intent = (typeof INTENTS)[number];

export const FITMENT_CONFIDENCE = [
  "exact",
  "generation",
  "model",
  "approximate",
  "unknown",
] as const;
export type FitmentConfidence = (typeof FITMENT_CONFIDENCE)[number];

export const RECOMMENDATION_CONFIDENCE = ["high", "medium", "low", "withheld"] as const;
export type RecommendationConfidence = (typeof RECOMMENDATION_CONFIDENCE)[number];

export const SAFETY_CLASS_SLUGS = ["critical", "caution", "lifestyle"] as const;
export type SafetyClassSlug = (typeof SAFETY_CLASS_SLUGS)[number];

export type GarageVehicle = {
  id: string;
  userId: string;
  make: string;
  model: string;
  generation: string | null;
  variant: string | null;
  year: number | null;
  engine: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
  powerBhp: number | null;
  registration: string | null;
  specification: string | null;
};

export type ProductAttributeMap = Record<string, string>;

export type VehicleFitmentRow = {
  id: number;
  productId: string;
  make: string;
  model: string | null;
  generation: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engine: string | null;
  variant: string | null;
  notes: string | null;
  confidence: FitmentConfidence;
  source: string | null;
  sourceId: string | null;
};

export type ProductCandidate = {
  id: string;
  sourceId: string;
  supplierId: string | null;
  manufacturerId: string | null;
  productName: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  price: number | null;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  availability: string | null;
  sku: string | null;
  partNumber: string | null;
  attributes: ProductAttributeMap;
  manufacturerName: string | null;
  supplierName: string | null;
  sourcePriority: number;
  sourceKind: string;
  sourceName: string;
};

export type ModificationRow = {
  id: string;
  vehicleId: string;
  category: string;
  productId: string | null;
  manufacturer: string | null;
  description: string;
  notes: string | null;
};

export type SpecialistRow = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  url: string | null;
  notes: string | null;
  marques: { make: string; model: string | null }[];
};

export type FitmentMatch = {
  row: VehicleFitmentRow;
  storedConfidence: FitmentConfidence;
  effectiveConfidence: FitmentConfidence;
  label: string;
};

export type Reason = {
  code: string;
  label: string;
  detail?: string;
  sortOrder: number;
};

export type ResultCard = {
  kind: "product" | "specialist";
  id: string;
  name: string;
  image: string | null;
  manufacturer: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  supplier: string | null;
  fitmentLabel: string | null;
  fitmentConfidence: FitmentConfidence | null;
  reasons: { code: string; label: string; detail?: string }[];
  url: string | null;
  recommendationConfidence: RecommendationConfidence;
  location?: string | null;
};

export type TraceEvent = {
  productId?: string;
  specialistId?: string;
  name?: string;
  reason: string;
  code?: string;
};

export type RecommendTrace = {
  suppressed: TraceEvent[];
  withheld: TraceEvent[];
  dropped: TraceEvent[];
};

export type BuildInput = {
  type: string;
  objectives: string[];
  usage?: string;
  style?: string;
  budget?: string;
  intensity?: string;
  name?: string;
  notes?: string;
};

export type MaintainInput = {
  type: string;
  component: string;
  symptom?: string;
  urgency?: string;
  mileage?: number;
  notes?: string;
};

export type RecommendInput = {
  intent: Intent;
  vehicleId: string;
  userId?: string;
  build?: BuildInput;
  maintain?: MaintainInput;
  persist?: boolean;
};

export type RecommendResult = {
  mode: "build" | "maintain";
  vehicle: GarageVehicle;
  recommendations: ResultCard[];
  trace: RecommendTrace;
};
