import type { FitmentMatch, GarageVehicle, Reason } from "./types";

const STRONG_CODES = new Set([
  "fits_vehicle",
  "fits_generation",
  "authoritative_fitment",
  "matches_build_type",
  "supports_objective",
  "correct_component",
  "spec_match",
  "oem_replacement",
  "oem_plus_replacement",
  "upgrade_replacement",
]);

export function isStrongReason(code: string): boolean {
  return STRONG_CODES.has(code);
}

export function fitmentReasons(
  match: FitmentMatch,
  vehicle: GarageVehicle,
): Reason[] {
  const reasons: Reason[] = [];
  if (match.effectiveConfidence === "exact") {
    reasons.push({
      code: "fits_vehicle",
      label: `Fits your ${[vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ")}`,
      sortOrder: 10,
    });
  } else if (match.effectiveConfidence === "generation") {
    reasons.push({
      code: "fits_generation",
      label: `Fits the ${vehicle.generation ?? vehicle.model} generation`,
      sortOrder: 10,
    });
  } else if (match.effectiveConfidence === "model") {
    reasons.push({
      code: "fitment_model_only",
      label: `Listed for ${vehicle.make} ${vehicle.model} — generation not confirmed`,
      sortOrder: 10,
    });
  }
  if (match.row.source === "manufacturer") {
    reasons.push({
      code: "authoritative_fitment",
      label: "Fitment from the manufacturer",
      sortOrder: 20,
    });
  }
  return reasons;
}

export function publicReasons(reasons: Reason[]): { code: string; label: string; detail?: string }[] {
  return reasons
    .filter((reason) => reason.code !== "already_fitted_suppressed")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((reason) => ({
      code: reason.code,
      label: reason.label,
      ...(reason.detail ? { detail: reason.detail } : {}),
    }));
}
