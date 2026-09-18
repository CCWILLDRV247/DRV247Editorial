import type { ForYouTestProfile } from "./for-you-test";
import type { GarageVehicle } from "./rank";

/** Session garage + interests. ScoreArticle never reads DRV247 auth directly. */
export type PersonalisationContext = {
  vehicles: GarageVehicle[];
  interests: string[];
  location?: string | null;
};

export type Drv247GarageVehicle = {
  make?: string | null;
  model?: string | null;
  generation?: string | null;
  variant?: string | null;
  year?: number | null;
};

export type Drv247User = {
  garage?: Drv247GarageVehicle[];
  vehicles?: Drv247GarageVehicle[];
  interests?: string[];
  location?: string | null;
};

const INTEREST_ALIASES: Record<string, string> = {
  classic: "Classic",
  classics: "Classic",
  performance: "Performance",
  "air-cooled": "Air-cooled",
  "air cooled": "Air-cooled",
  aircooled: "Air-cooled",
  jdm: "JDM",
  modified: "Modified",
  motorsport: "Motorsport",
  "road trip": "Road Trips",
  "road trips": "Road Trips",
  roadtrips: "Road Trips",
};

const VARIANT_ALIASES: Record<string, string[]> = {
  gtb: ["gtb", "355 gtb", "f355 gtb"],
  c2: ["c2", "carrera 2", "carrera2", "carrera c2"],
  "carrera 2": ["c2", "carrera 2", "carrera2", "carrera c2"],
  "carrera rs": ["carrera rs", "rs"],
  gt3: ["gt3", "911 gt3"],
};

function norm(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function canonicalInterest(value: string): string {
  const key = norm(value);
  return INTEREST_ALIASES[key] ?? value.trim();
}

export function interestsMatch(articleInterest: string, userInterest: string) {
  return norm(canonicalInterest(articleInterest)) === norm(canonicalInterest(userInterest));
}

export function variantsMatch(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const a = norm(left);
  const b = norm(right);
  if (a === b) return true;
  const aliases = new Set([...(VARIANT_ALIASES[a] ?? [a]), ...(VARIANT_ALIASES[b] ?? [b])]);
  return aliases.has(a) && aliases.has(b);
}

export function garageVehicleLabel(vehicle: GarageVehicle) {
  return [vehicle.make, vehicle.model, vehicle.generation, vehicle.variant]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** Culture tags implied by the user's car — used only as the weakest vehicle tier. */
export function vehicleCultureTags(vehicle: GarageVehicle): string[] {
  const make = norm(vehicle.make);
  const model = norm(vehicle.model);
  const generation = norm(vehicle.generation ?? "");
  const tags = new Set<string>();
  if (make === "ferrari" || model === "f355") {
    for (const tag of ["Supercars", "Sports Cars", "Performance", "Classic", "Euro"]) tags.add(tag);
  }
  if (make === "porsche") {
    for (const tag of ["Classic", "Euro", "Performance", "Sports Cars"]) tags.add(tag);
    if (["964", "993"].includes(generation) || model === "356") tags.add("Air-cooled");
  }
  if (make === "nissan" || model === "skyline" || model === "240sx") {
    for (const tag of ["JDM", "Performance", "Modified"]) tags.add(tag);
  }
  if (make === "bmw" || model === "m3") {
    for (const tag of ["Performance", "Motorsport", "Modified", "Euro"]) tags.add(tag);
  }
  return [...tags];
}

export function contextFromTestProfile(profile: ForYouTestProfile): PersonalisationContext {
  const vehicles: GarageVehicle[] =
    profile.make || profile.model
      ? [
          {
            make: profile.make ?? "",
            model: profile.model ?? "",
            generation: profile.generation,
            variant: profile.variant,
          },
        ]
      : [];
  return {
    vehicles,
    interests: profile.interests.map(canonicalInterest),
    location: profile.location ?? null,
  };
}

/** Later: DRV247 user → garage → make/model/generation/variant → interests → location. */
export function contextFromDrv247Garage(user: Drv247User): PersonalisationContext {
  const rows = user.garage ?? user.vehicles ?? [];
  const vehicles: GarageVehicle[] = rows
    .filter((row) => row.make || row.model)
    .map((row) => ({
      make: row.make?.trim() || "",
      model: row.model?.trim() || "",
      generation: row.generation,
      variant: row.variant,
    }));
  return {
    vehicles,
    interests: (user.interests ?? []).map(canonicalInterest),
    location: user.location ?? null,
  };
}

export function contextFromDemoUser(user: {
  vehicles: GarageVehicle[];
  interests: string[];
  location?: string | null;
}): PersonalisationContext {
  return {
    vehicles: user.vehicles,
    interests: user.interests.map(canonicalInterest),
    location: user.location ?? null,
  };
}
