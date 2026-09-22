import { VEHICLE_CATALOG } from "@/lib/engine/catalog";

export function foldIdentity(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function canonicalMake(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const folded = foldIdentity(raw);
  for (const record of VEHICLE_CATALOG) {
    if (foldIdentity(record.make) === folded) return record.make;
    if (record.aliases.some((alias) => foldIdentity(alias) === folded)) return record.make;
  }
  return raw.trim();
}

export function canonicalModel(
  make: string | null | undefined,
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const folded = foldIdentity(raw);
  const makeName = canonicalMake(make);
  const records = VEHICLE_CATALOG.filter((record) => !makeName || record.make === makeName);
  for (const record of records) {
    for (const model of record.models) {
      if (foldIdentity(model.name) === folded) return model.name;
      if (model.aliases.some((alias) => foldIdentity(alias) === folded)) return model.name;
    }
  }
  return raw.trim();
}

export function canonicalGeneration(
  make: string | null | undefined,
  model: string | null | undefined,
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const folded = foldIdentity(raw);
  const makeName = canonicalMake(make);
  const modelName = canonicalModel(makeName, model);
  for (const record of VEHICLE_CATALOG) {
    if (makeName && record.make !== makeName) continue;
    for (const entry of record.models) {
      if (modelName && entry.name !== modelName) continue;
      for (const generation of entry.generations ?? []) {
        if (foldIdentity(generation) === folded) return generation;
      }
    }
  }
  return raw.trim();
}

export function identityEquals(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return foldIdentity(left) === foldIdentity(right);
}

export function engineEquals(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return foldIdentity(left) === foldIdentity(right);
}

export function formatVehicleName(vehicle: {
  year?: number | null;
  make: string;
  model: string;
  generation?: string | null;
  variant?: string | null;
}): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.variant]
    .filter((part) => part !== null && part !== undefined && String(part).length)
    .join(" ");
}
