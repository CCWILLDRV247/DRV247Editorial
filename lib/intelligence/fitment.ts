import type {
  FitmentConfidence,
  FitmentMatch,
  GarageVehicle,
  VehicleFitmentRow,
} from "./types";
import {
  canonicalGeneration,
  canonicalMake,
  canonicalModel,
  engineEquals,
  foldIdentity,
  formatVehicleName,
  identityEquals,
} from "./identity";

const RANK: Record<FitmentConfidence, number> = {
  exact: 5,
  generation: 4,
  model: 3,
  approximate: 2,
  unknown: 1,
};

export function confidenceRank(value: FitmentConfidence): number {
  return RANK[value] ?? 0;
}

export function capConfidence(
  current: FitmentConfidence,
  ceiling: FitmentConfidence,
): FitmentConfidence {
  return confidenceRank(current) <= confidenceRank(ceiling) ? current : ceiling;
}

export function fitmentLabel(
  confidence: FitmentConfidence,
  vehicle: GarageVehicle,
): string | null {
  if (confidence === "unknown") return null;
  if (confidence === "approximate") return "May fit — not confirmed";
  if (confidence === "model") {
    return `Listed for ${vehicle.make} ${vehicle.model} — generation not confirmed`;
  }
  if (confidence === "generation") {
    const generation = vehicle.generation ?? vehicle.model;
    return `Fits the ${generation} ${vehicle.make} ${vehicle.model}`;
  }
  return `Fits your ${formatVehicleName(vehicle)}`;
}

export function matchFitmentRow(
  vehicle: GarageVehicle,
  row: VehicleFitmentRow,
): FitmentMatch | null {
  const vehicleMake = canonicalMake(vehicle.make);
  const rowMake = canonicalMake(row.make);
  if (!vehicleMake || !rowMake || !identityEquals(vehicleMake, rowMake)) return null;

  if (row.model) {
    const vehicleModel = canonicalModel(vehicleMake, vehicle.model);
    const rowModel = canonicalModel(rowMake, row.model);
    if (!vehicleModel || !rowModel || !identityEquals(vehicleModel, rowModel)) return null;
  }

  if (row.generation && vehicle.generation) {
    const vehicleGen = canonicalGeneration(vehicleMake, vehicle.model, vehicle.generation);
    const rowGen = canonicalGeneration(rowMake, row.model, row.generation);
    if (!vehicleGen || !rowGen || !identityEquals(vehicleGen, rowGen)) return null;
  }

  if ((row.yearFrom != null || row.yearTo != null) && vehicle.year != null) {
    if (row.yearFrom != null && vehicle.year < row.yearFrom) return null;
    if (row.yearTo != null && vehicle.year > row.yearTo) return null;
  }

  if (row.engine && vehicle.engine && !engineEquals(row.engine, vehicle.engine)) return null;

  if (row.variant && vehicle.variant && foldIdentity(row.variant) !== foldIdentity(vehicle.variant)) {
    return null;
  }

  let effective = row.confidence;
  if (!vehicle.generation) effective = capConfidence(effective, "model");
  if (row.generation && !vehicle.generation) effective = capConfidence(effective, "model");

  const productHasYear = row.yearFrom != null || row.yearTo != null;
  const missingFineField =
    (productHasYear && vehicle.year == null) ||
    (Boolean(row.engine) && !vehicle.engine) ||
    (Boolean(row.variant) && !vehicle.variant);
  if (missingFineField) effective = capConfidence(effective, "generation");

  return {
    row,
    storedConfidence: row.confidence,
    effectiveConfidence: effective,
    label: fitmentLabel(effective, vehicle) ?? "",
  };
}

export function bestFitment(
  vehicle: GarageVehicle,
  rows: VehicleFitmentRow[],
): FitmentMatch | null {
  const matches = rows
    .map((row) => matchFitmentRow(vehicle, row))
    .filter((row): row is FitmentMatch => Boolean(row));
  if (!matches.length) return null;
  return matches.sort(
    (a, b) => confidenceRank(b.effectiveConfidence) - confidenceRank(a.effectiveConfidence),
  )[0];
}

export function usableFitment(match: FitmentMatch | null): boolean {
  if (!match) return false;
  if (match.effectiveConfidence === "unknown") return false;
  if (!match.row.make) return false;
  return true;
}
