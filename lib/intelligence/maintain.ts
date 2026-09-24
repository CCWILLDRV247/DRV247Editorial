import maintainRanking from "@/config/intelligence/maintain-ranking.json";
import type {
  FitmentMatch,
  GarageVehicle,
  ProductCandidate,
  Reason,
  RecommendTrace,
  ReplacementGrade,
  ResultCard,
  SpecialistRow,
} from "./types";
import { REPLACEMENT_GRADES } from "./types";
import { applySafetyGate, type ComponentSafety, type SafetyClassRow } from "./safety";
import { fitmentReasons, isStrongReason, publicReasons } from "./reasons";
import { usableFitment } from "./fitment";
import { canonicalMake, canonicalModel, identityEquals } from "./identity";

export type MaintainConfig = {
  weights: Record<string, number>;
  componentAliases: Record<string, string[]>;
  workshopComponents: string[];
  specialistCategoryForComponent: Record<string, string[]>;
};

export type MaintainContext = {
  vehicle: GarageVehicle;
  type: string;
  component: string;
  grade?: ReplacementGrade | string;
  notes?: string;
  specification?: string | null;
};

function attr(product: ProductCandidate, key: string): string | undefined {
  return product.attributes[key];
}

export function normaliseReplacementGrade(value?: string | null): ReplacementGrade {
  if (value && (REPLACEMENT_GRADES as readonly string[]).includes(value)) {
    return value as ReplacementGrade;
  }
  return "oem";
}

const LIKE_FOR_LIKE_CATEGORIES = new Set(["brake-discs", "brake-pads", "filters", "tyres", "service"]);

const UPGRADE_SHAPE =
  /\brs14\b|\bgt\b|slotted|drilled|track-oriented|clubsport|\brace\b|competition|red stuff|yellow stuff|blue stuff/;

function productHaystack(product: ProductCandidate): string {
  return `${product.productName} ${product.description ?? ""}`.toLowerCase();
}

export function isUpgradeReplacement(product: ProductCandidate): boolean {
  if (attr(product, "replacement_grade") === "upgrade") return true;
  if (attr(product, "competition") === "yes") return true;
  if (attr(product, "appearance") === "show" || attr(product, "appearance") === "aftermarket") return true;
  if (attr(product, "track_use") === "yes") return true;
  if (attr(product, "oem_plus") === "no") return true;
  return UPGRADE_SHAPE.test(productHaystack(product));
}

export function isFactorySpecLikeForLike(product: ProductCandidate): boolean {
  if (isUpgradeReplacement(product)) return false;
  if (attr(product, "replacement_grade") === "oem") return true;
  if (attr(product, "appearance") === "oem") return true;
  if (/\bgenuine\b|factory[- ]spec|oem[- ]spec|like[- ]for[- ]like/.test(productHaystack(product))) {
    return true;
  }
  return LIKE_FOR_LIKE_CATEGORIES.has(product.category ?? "");
}

export function productReplacementGrade(product: ProductCandidate): ReplacementGrade {
  if (isUpgradeReplacement(product)) return "upgrade";
  if (isFactorySpecLikeForLike(product)) return "oem";
  const explicit = attr(product, "replacement_grade");
  if (explicit && (REPLACEMENT_GRADES as readonly string[]).includes(explicit)) {
    return explicit as ReplacementGrade;
  }
  if (attr(product, "oem_plus") === "yes" || attr(product, "appearance") === "oem-plus") {
    return "oem-plus";
  }
  return "oem";
}

export function isDesign911Product(product: ProductCandidate): boolean {
  const haystack = `${product.supplierName ?? ""} ${product.sourceName ?? ""} ${product.sourceId} ${product.url ?? ""}`.toLowerCase();
  return haystack.includes("design 911") || haystack.includes("design911") || haystack.includes("design-911");
}

function gradePermitted(job: ReplacementGrade, product: ReplacementGrade): boolean {
  if (job === "oem") return product === "oem";
  if (job === "oem-plus") return product === "oem" || product === "oem-plus";
  return true;
}

function gradeReason(productGrade: ReplacementGrade): Reason {
  if (productGrade === "oem") {
    return { code: "oem_replacement", label: "OEM-spec replacement", sortOrder: 28 };
  }
  if (productGrade === "oem-plus") {
    return { code: "oem_plus_replacement", label: "OEM+ replacement", sortOrder: 28 };
  }
  return { code: "upgrade_replacement", label: "Upgrade replacement", sortOrder: 28 };
}

export function loadMaintainConfig(_cwd = process.cwd()): MaintainConfig {
  return maintainRanking as MaintainConfig;
}

export function matchingComponentSlugs(component: string, config: MaintainConfig): string[] {
  return config.componentAliases[component] ?? [component];
}

function productMatchesComponent(
  product: ProductCandidate,
  slugs: string[],
): boolean {
  const category = product.category ?? "";
  const subcategory = product.subcategory ?? "";
  return slugs.includes(category) || slugs.includes(subcategory);
}

function specConflict(
  vehicleSpec: string | null | undefined,
  notes: string | undefined,
  productSpec: string | undefined,
): boolean {
  if (!productSpec) return false;
  const haystack = `${vehicleSpec ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!haystack.trim()) return false;
  const size = productSpec.toLowerCase().match(/(\d+)\s*mm/);
  if (size && haystack.includes("mm") && haystack.includes(size[1])) return false;
  if (size && haystack.includes("mm") && !haystack.includes(size[1])) {
    const other = haystack.match(/(\d+)\s*mm/);
    return Boolean(other && other[1] !== size[1]);
  }
  return false;
}

function specMatches(
  vehicleSpec: string | null | undefined,
  notes: string | undefined,
  productSpec: string | undefined,
): boolean {
  if (!productSpec) return false;
  const haystack = `${vehicleSpec ?? ""} ${notes ?? ""}`.toLowerCase();
  const size = productSpec.toLowerCase().match(/(\d+)\s*mm/);
  return Boolean(size && haystack.includes(size[1]));
}

export function runMaintainPipeline(input: {
  products: ProductCandidate[];
  fitmentsByProduct: Map<string, FitmentMatch | null>;
  specialists: SpecialistRow[];
  context: MaintainContext;
  config: MaintainConfig;
  classes: SafetyClassRow[];
  components: ComponentSafety[];
}): { results: ResultCard[]; trace: RecommendTrace } {
  const trace: RecommendTrace = { suppressed: [], withheld: [], dropped: [] };
  const slugs = matchingComponentSlugs(input.context.component, input.config);
  const jobGrade = normaliseReplacementGrade(input.context.grade);
  const specialistsOnly =
    input.context.type === "find-specialist" ||
    (input.context.type === "diagnose" && input.context.component === "other");

  const scored: { card: ResultCard; score: number; price: number | null }[] = [];
  if (!specialistsOnly) {
    for (const product of input.products) {
      if (!productMatchesComponent(product, slugs)) {
        trace.dropped.push({
          productId: product.id,
          name: product.productName,
          reason: "Component mismatch",
        });
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
        mode: "maintain",
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
      if (product.availability === "out") {
        trace.dropped.push({ productId: product.id, name: product.productName, reason: "Out of stock" });
        continue;
      }
      if (specConflict(input.context.specification, input.context.notes, product.attributes.spec)) {
        trace.dropped.push({ productId: product.id, name: product.productName, reason: "Specification conflict" });
        continue;
      }
      const productGrade = productReplacementGrade(product);
      if (!gradePermitted(jobGrade, productGrade)) {
        trace.dropped.push({
          productId: product.id,
          name: product.productName,
          reason: "Replacement grade mismatch",
          code: "grade_mismatch",
        });
        continue;
      }

      const weights = input.config.weights;
      let score = weights.correct_component;
      const reasons: Reason[] = [
        ...fitmentReasons(match, input.context.vehicle),
        { code: "correct_component", label: "Correct replacement component", sortOrder: 25 },
        gradeReason(productGrade),
      ];
      if (productGrade === jobGrade) score += weights.grade_match ?? 0;
      if (match.effectiveConfidence === "exact") score += weights.fitment_exact;
      else if (match.effectiveConfidence === "generation") score += weights.fitment_generation;
      if (specMatches(input.context.specification, input.context.notes, product.attributes.spec)) {
        score += weights.spec_match;
        reasons.push({
          code: "spec_match",
          label: "Matches the stated specification",
          detail: product.attributes.spec,
          sortOrder: 35,
        });
      }
      if (product.sourcePriority >= 80 || match.row.source === "manufacturer") {
        score += weights.authoritative_source;
      }
      if (
        identityEquals(canonicalMake(input.context.vehicle.make), "Porsche") &&
        isDesign911Product(product) &&
        (weights.partner_source ?? 0) > 0
      ) {
        score += weights.partner_source;
        reasons.push({
          code: "porsche_partner",
          label: "Design 911 — Porsche partner source",
          sortOrder: 32,
        });
      }
      if (product.availability === "in_stock") {
        score += weights.in_stock;
        reasons.push({ code: "available", label: "Currently available", sortOrder: 80 });
      }

      const strong = reasons.filter((reason) => isStrongReason(reason.code)).length;
      const recommendationConfidence =
        (match.effectiveConfidence === "exact" || match.effectiveConfidence === "generation") &&
        strong >= 2
          ? "high"
          : "medium";

      scored.push({
        score,
        price: product.price,
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
  }

  const priced = scored.filter((row) => row.price != null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (priced.length) {
    const cheapestId = priced[0].card.id;
    const bump = input.config.weights.price_lower_among_ok;
    for (const row of scored) {
      if (row.card.id === cheapestId) row.score += bump;
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const results = scored.map((row) => row.card);
  const wantSpecialists =
    input.context.type === "find-specialist" ||
    input.context.type === "diagnose" ||
    results.length === 0 ||
    input.config.workshopComponents.includes(input.context.component);

  if (wantSpecialists) {
    const vehicleMake = canonicalMake(input.context.vehicle.make);
    const vehicleModel = canonicalModel(vehicleMake, input.context.vehicle.model);
    const specialistCats = input.config.specialistCategoryForComponent[input.context.component] ?? [];
    for (const specialist of input.specialists) {
      const marqueHit = specialist.marques.some((marque) => {
        if (!identityEquals(canonicalMake(marque.make), vehicleMake)) return false;
        if (!marque.model) return true;
        return identityEquals(canonicalModel(vehicleMake, marque.model), vehicleModel);
      });
      if (!marqueHit) continue;
      if (specialistCats.length && specialist.category && !specialistCats.includes(specialist.category)) {
        continue;
      }
      results.push({
        kind: "specialist",
        id: specialist.id,
        name: specialist.name,
        image: null,
        manufacturer: null,
        category: specialist.category,
        price: null,
        currency: null,
        supplier: null,
        fitmentLabel: null,
        fitmentConfidence: null,
        reasons: [
          {
            code: "marque_specialist",
            label: `Specialises in ${input.context.vehicle.make}`,
          },
          {
            code: "component_category",
            label: specialist.category
              ? `Covers ${specialist.category}`
              : `Relevant to ${input.context.component}`,
          },
        ],
        url: specialist.url,
        recommendationConfidence: "medium",
        location: specialist.location,
      });
    }
  }

  return { results, trace };
}
