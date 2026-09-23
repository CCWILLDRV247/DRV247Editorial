import type {
  FitmentConfidence,
  FitmentMatch,
  ProductCandidate,
  SafetyClassSlug,
} from "./types";
import { confidenceRank } from "./fitment";

const CRITICAL_CATEGORIES = new Set([
  "brake-discs",
  "brake-pads",
  "brakes",
  "suspension",
  "wheels",
  "tyres",
  "cooling",
  "fuel",
  "steering",
  "structure",
  "engine",
]);

const CAUTION_CATEGORIES = new Set(["exhaust", "ecu", "intake", "clutch", "battery", "service", "mot"]);

const CHASSIS_THERMAL = new Set([
  "suspension",
  "brakes",
  "brake-discs",
  "brake-pads",
  "cooling",
  "tyres",
  "wheels",
  "engine",
]);

export type SafetyClassRow = {
  slug: SafetyClassSlug;
  withholdBelowFitment: FitmentConfidence;
};

export type ComponentSafety = {
  slug: string;
  safetyClass: SafetyClassSlug;
};

export function safetyClassForProduct(
  product: ProductCandidate,
  components: ComponentSafety[],
): SafetyClassSlug {
  const attributed = product.attributes.safety_class;
  if (attributed === "critical" || attributed === "caution" || attributed === "lifestyle") {
    if (product.attributes.track_use === "yes" && CHASSIS_THERMAL.has(product.category ?? "")) {
      return "critical";
    }
    return attributed;
  }
  const category = product.category ?? "";
  const component = components.find((row) => row.slug === category);
  if (component) return component.safetyClass;
  if (CRITICAL_CATEGORIES.has(category)) return "critical";
  if (CAUTION_CATEGORIES.has(category)) return "caution";
  return "lifestyle";
}

export function fitmentFloor(
  safetyClass: SafetyClassSlug,
  classes: SafetyClassRow[],
  mode: "build" | "maintain",
): FitmentConfidence {
  const configured = classes.find((row) => row.slug === safetyClass)?.withholdBelowFitment;
  if (mode === "maintain" && (safetyClass === "critical" || safetyClass === "caution")) {
    return "generation";
  }
  return configured ?? (safetyClass === "lifestyle" ? "model" : "generation");
}

export function trustedCriticalSource(product: ProductCandidate, match: FitmentMatch | null): boolean {
  if (match?.row.source === "manufacturer") return true;
  return product.sourcePriority >= 80;
}

export type SafetyDecision = "pass" | "withhold" | "drop";

export function applySafetyGate(input: {
  product: ProductCandidate;
  match: FitmentMatch | null;
  mode: "build" | "maintain";
  classes: SafetyClassRow[];
  components: ComponentSafety[];
}): { decision: SafetyDecision; reason: string; safetyClass: SafetyClassSlug } {
  const safetyClass = safetyClassForProduct(input.product, input.components);
  if (!input.match || input.match.effectiveConfidence === "unknown" || !input.match.row.make) {
    return { decision: "drop", reason: "No usable fitment", safetyClass };
  }
  if (input.match.effectiveConfidence === "approximate" && safetyClass !== "lifestyle") {
    return { decision: "withhold", reason: "Approximate fitment below safety floor", safetyClass };
  }
  const floor = fitmentFloor(safetyClass, input.classes, input.mode);
  if (confidenceRank(input.match.effectiveConfidence) < confidenceRank(floor)) {
    return {
      decision: "withhold",
      reason: `${safetyClass} parts require ${floor} fitment or better`,
      safetyClass,
    };
  }
  if (safetyClass === "critical" && !trustedCriticalSource(input.product, input.match)) {
    return {
      decision: "withhold",
      reason: "Critical part needs manufacturer or source priority ≥ 80",
      safetyClass,
    };
  }
  return { decision: "pass", reason: "ok", safetyClass };
}
