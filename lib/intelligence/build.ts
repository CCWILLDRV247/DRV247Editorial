import fs from "node:fs";
import path from "node:path";
import type {
  FitmentMatch,
  GarageVehicle,
  ModificationRow,
  ProductCandidate,
  Reason,
  RecommendTrace,
  ResultCard,
} from "./types";
import { applySafetyGate, type ComponentSafety, type SafetyClassRow } from "./safety";
import { fitmentReasons, isStrongReason, publicReasons } from "./reasons";
import { usableFitment } from "./fitment";

export type BuildConfig = {
  weights: Record<string, number>;
  buildTypeCategories: Record<string, string[]>;
  objectiveAttributes: Record<string, Record<string, string[]>>;
  objectiveCategories: Record<string, string>;
  complementaryCategories: Record<string, string[]>;
  roadUsages: string[];
  interestCategoryHints: Record<string, string[]>;
};

export type BuildContext = {
  vehicle: GarageVehicle;
  buildType: string;
  buildTypeName: string;
  objectives: { slug: string; name: string }[];
  usage?: string;
  style?: string;
  budgetMax?: number | null;
  budgetName?: string;
  notes?: string;
  interests: string[];
  modifications: ModificationRow[];
};

export function loadBuildConfig(cwd = process.cwd()): BuildConfig {
  const raw = fs.readFileSync(path.join(cwd, "config/intelligence/build-ranking.json"), "utf8");
  return JSON.parse(raw) as BuildConfig;
}

function attr(product: ProductCandidate, key: string): string | undefined {
  return product.attributes[key];
}

function supportsObjective(product: ProductCandidate, slug: string, config: BuildConfig): boolean {
  const mapping = config.objectiveAttributes[slug];
  if (!mapping || !Object.keys(mapping).length) {
    const category = config.objectiveCategories[slug];
    return Boolean(category && product.category === category);
  }
  return Object.entries(mapping).some(([key, values]) => values.includes(attr(product, key) ?? ""));
}

function explicitCategoryObjective(
  objectives: string[],
  notes: string | undefined,
  category: string,
  config: BuildConfig,
): boolean {
  const wantsCategory = objectives.some((slug) => config.objectiveCategories[slug] === category);
  const wantsChange = /\b(change|replace|another|swap)\b/i.test(notes ?? "");
  return wantsCategory && wantsChange;
}

function styleCompatible(product: ProductCandidate, style?: string): boolean {
  if (!style) return false;
  if (style === "oem-plus") {
    return attr(product, "oem_plus") === "yes" || ["oem", "oem-plus"].includes(attr(product, "appearance") ?? "");
  }
  if (style === "period-correct") {
    return attr(product, "classic") === "yes" || ["oem", "oem-plus"].includes(attr(product, "appearance") ?? "");
  }
  if (style === "aftermarket") return attr(product, "appearance") === "aftermarket";
  if (style === "track-focused") return attr(product, "track_use") === "yes";
  if (style === "show") return ["show", "aftermarket"].includes(attr(product, "appearance") ?? "");
  return false;
}

export function scoreBuildProduct(input: {
  product: ProductCandidate;
  match: FitmentMatch;
  context: BuildContext;
  config: BuildConfig;
}): { score: number; reasons: Reason[] } {
  const { product, match, context, config } = input;
  const weights = config.weights;
  let score = 0;
  const reasons: Reason[] = [...fitmentReasons(match, context.vehicle)];

  if (match.effectiveConfidence === "exact") score += weights.fitment_exact;
  else if (match.effectiveConfidence === "generation") score += weights.fitment_generation;
  else if (match.effectiveConfidence === "model") score += weights.fitment_model;

  const affinity = config.buildTypeCategories[context.buildType] ?? [];
  if (product.category && affinity.includes(product.category)) {
    score += weights.matches_build_type;
    reasons.push({
      code: "matches_build_type",
      label: `Matches ${context.buildTypeName}`,
      sortOrder: 30,
    });
  }
  if (context.buildType === "oem-plus" && attr(product, "competition") === "yes") {
    score -= 20;
  }

  const [primary, ...secondary] = context.objectives;
  const supported = context.objectives.filter((objective) =>
    supportsObjective(product, objective.slug, config),
  );
  if (primary && supportsObjective(product, primary.slug, config)) {
    score += weights.supports_primary_objective;
  }
  if (secondary.some((objective) => supportsObjective(product, objective.slug, config))) {
    score += weights.supports_secondary_obj;
  }
  if (supported.length) {
    reasons.push({
      code: "supports_objective",
      label: `Supports ${supported.map((row) => row.name).join(" + ")}`,
      sortOrder: 40,
    });
  }

  const usage = context.usage;
  if (usage && config.roadUsages.includes(usage) && attr(product, "road_use") !== "no") {
    score += weights.usage_compatible;
    reasons.push({ code: "road_focused", label: "Suitable for road-focused use", sortOrder: 50 });
  }
  if (usage === "track-day" && attr(product, "track_use") === "yes") {
    score += weights.usage_compatible;
  }
  if (usage === "show" && ["oem-plus", "aftermarket", "show"].includes(attr(product, "appearance") ?? "")) {
    score += weights.usage_compatible;
  }

  if (styleCompatible(product, context.style)) {
    score += weights.style_compatible;
    if (context.style === "oem-plus") {
      reasons.push({
        code: "oem_plus_direction",
        label: "Compatible with your OEM+ direction",
        sortOrder: 60,
      });
    }
  }

  if (product.price == null || context.budgetMax == null || product.price <= context.budgetMax) {
    score += weights.within_budget;
    if (product.price != null && context.budgetName) {
      reasons.push({
        code: "within_budget",
        label: "Within your budget",
        detail: context.budgetName,
        sortOrder: 70,
      });
    }
  }

  score += Math.round((Math.min(product.sourcePriority, 100) / 100) * weights.source_quality);

  const category = product.category ?? "";
  for (const interest of context.interests) {
    const hints = config.interestCategoryHints[interest] ?? [];
    if (hints.includes(category)) {
      score += weights.interest_boost;
      break;
    }
  }

  const fitted = context.modifications.some((mod) => mod.category === category);
  if (fitted) score += weights.already_fitted_category;

  const complementary = new Set<string>();
  for (const mod of context.modifications) {
    for (const extra of config.complementaryCategories[mod.category] ?? []) complementary.add(extra);
  }
  if (category && complementary.has(category)) score += 8;

  return { score, reasons };
}

export function runBuildPipeline(input: {
  products: ProductCandidate[];
  fitmentsByProduct: Map<string, FitmentMatch | null>;
  context: BuildContext;
  config: BuildConfig;
  classes: SafetyClassRow[];
  components: ComponentSafety[];
}): { results: ResultCard[]; trace: RecommendTrace } {
  const trace: RecommendTrace = { suppressed: [], withheld: [], dropped: [] };
  const scored: { card: ResultCard; score: number }[] = [];
  const fittedCategories = new Set(input.context.modifications.map((row) => row.category));

  for (const product of input.products) {
    if (product.category === "uncategorised") {
      trace.dropped.push({ productId: product.id, name: product.productName, reason: "Unmapped category" });
      continue;
    }
    const match = input.fitmentsByProduct.get(product.id) ?? null;
    if (!usableFitment(match) || !match) {
      trace.dropped.push({ productId: product.id, name: product.productName, reason: "No usable fitment" });
      continue;
    }
    const safety = applySafetyGate({
      product,
      match,
      mode: "build",
      classes: input.classes,
      components: input.components,
    });
    if (safety.decision === "drop") {
      trace.dropped.push({ productId: product.id, name: product.productName, reason: safety.reason });
      continue;
    }
    if (safety.decision === "withhold") {
      trace.withheld.push({ productId: product.id, name: product.productName, reason: safety.reason });
      continue;
    }
    const usage = input.context.usage;
    if (usage && input.config.roadUsages.includes(usage) && product.attributes.road_use === "no") {
      trace.dropped.push({
        productId: product.id,
        name: product.productName,
        reason: "Not suitable for road use",
      });
      continue;
    }
    if (
      product.price != null &&
      input.context.budgetMax != null &&
      product.price > input.context.budgetMax
    ) {
      trace.dropped.push({ productId: product.id, name: product.productName, reason: "Above budget band" });
      continue;
    }
    const category = product.category ?? "";
    if (
      category &&
      fittedCategories.has(category) &&
      !explicitCategoryObjective(
        input.context.objectives.map((row) => row.slug),
        input.context.notes,
        category,
        input.config,
      )
    ) {
      trace.suppressed.push({
        productId: product.id,
        name: product.productName,
        reason: `Already fitted: ${category}`,
        code: "already_fitted_suppressed",
      });
      continue;
    }

    const affinity = input.config.buildTypeCategories[input.context.buildType] ?? [];
    const complementary = new Set<string>();
    for (const mod of input.context.modifications) {
      for (const extra of input.config.complementaryCategories[mod.category] ?? []) complementary.add(extra);
    }
    const supportsAny = input.context.objectives.some((objective) => {
      const mapping = input.config.objectiveAttributes[objective.slug];
      if (mapping && Object.keys(mapping).length) {
        return Object.entries(mapping).some(([key, values]) =>
          values.includes(product.attributes[key] ?? ""),
        );
      }
      return input.config.objectiveCategories[objective.slug] === product.category;
    });
    const relevant =
      (product.category && affinity.includes(product.category)) ||
      supportsAny ||
      (product.category ? complementary.has(product.category) : false);
    if (!relevant) {
      trace.dropped.push({
        productId: product.id,
        name: product.productName,
        reason: "Not relevant to this build direction",
      });
      continue;
    }

    const { score, reasons } = scoreBuildProduct({
      product,
      match,
      context: input.context,
      config: input.config,
    });
    const strong = reasons.filter((reason) => isStrongReason(reason.code)).length;
    const recommendationConfidence =
      (match.effectiveConfidence === "exact" || match.effectiveConfidence === "generation") &&
      strong >= 2
        ? "high"
        : match.effectiveConfidence === "model"
          ? "low"
          : "medium";

    scored.push({
      score,
      card: {
        kind: "product",
        id: product.id,
        name: product.productName,
        image: product.imageUrl,
        manufacturer: product.manufacturerName,
        category: product.category,
        price: product.price,
        currency: product.currency,
        supplier: product.supplierName,
        fitmentLabel: match.label,
        fitmentConfidence: match.effectiveConfidence,
        reasons: publicReasons(reasons),
        url: product.url,
        recommendationConfidence,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return { results: scored.map((row) => row.card), trace };
}
