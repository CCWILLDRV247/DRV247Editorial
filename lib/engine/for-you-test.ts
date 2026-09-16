import { EDITORIAL_LOCATIONS, isKnownInterest } from "./extract";
import { INTEREST_TAXONOMY, VEHICLE_CATALOG } from "./catalog";

export const FOR_YOU_TEST_STORAGE_KEY = "drv247-for-you-test";

export type ForYouTestProfile = {
  make?: string;
  model?: string;
  generation?: string;
  interests: string[];
  location?: string;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function many(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => item.split(","));
  if (!value) return [];
  return value.split(",");
}

export function parseForYouTestProfile(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): ForYouTestProfile {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? "";
    return first(params[key]);
  };
  const getAll = (key: string) => {
    if (params instanceof URLSearchParams) {
      const listed = params.getAll(key);
      const csv = params.get("interests");
      return [...listed, ...(csv ? csv.split(",") : [])];
    }
    if (key === "interest") return [...many(params.interest), ...many(params.interests)];
    return many(params[key]);
  };

  const make = catalogMake(get("make"));
  const model = catalogModel(make, get("model"));
  const generation = catalogGeneration(make, model, get("generation"));
  const interests = [
    ...new Set(getAll("interest").map((item) => item.trim()).filter((item) => isKnownInterest(item))),
  ];
  const location = catalogLocation(get("location"));
  return {
    make: make || undefined,
    model: model || undefined,
    generation: generation || undefined,
    interests,
    location: location || undefined,
  };
}

export function forYouTestIsActive(profile: ForYouTestProfile) {
  return Boolean(profile.make || profile.model || profile.interests.length || profile.location);
}

export function forYouTestSummary(profile: ForYouTestProfile) {
  const parts = [
    [profile.make, profile.model, profile.generation].filter(Boolean).join(" "),
    profile.interests.join(" · "),
    profile.location,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function forYouTestSearchString(profile: ForYouTestProfile) {
  const params = new URLSearchParams();
  if (profile.make) params.set("make", profile.make);
  if (profile.model) params.set("model", profile.model);
  if (profile.generation) params.set("generation", profile.generation);
  for (const interest of profile.interests) params.append("interest", interest);
  if (profile.location) params.set("location", profile.location);
  return params.toString();
}

export function catalogMakes() {
  return VEHICLE_CATALOG.map((record) => record.make);
}

export function catalogModels(make?: string) {
  const record = VEHICLE_CATALOG.find((item) => item.make === make);
  return record?.models.map((model) => model.name) ?? [];
}

export function catalogGenerations(make?: string, model?: string) {
  const record = VEHICLE_CATALOG.find((item) => item.make === make);
  const found = record?.models.find((item) => item.name === model);
  return found?.generations ?? [];
}

export function catalogInterests() {
  return [...INTEREST_TAXONOMY];
}

export function catalogLocations() {
  return [...EDITORIAL_LOCATIONS];
}

function catalogMake(value: string) {
  const needle = value.trim().toLowerCase();
  return VEHICLE_CATALOG.find((item) => item.make.toLowerCase() === needle)?.make ?? "";
}

function catalogModel(make: string, value: string) {
  if (!make || !value.trim()) return "";
  return catalogModels(make).find((item) => item.toLowerCase() === value.trim().toLowerCase()) ?? "";
}

function catalogGeneration(make: string, model: string, value: string) {
  if (!make || !model || !value.trim()) return "";
  return (
    catalogGenerations(make, model).find((item) => item.toLowerCase() === value.trim().toLowerCase()) ?? ""
  );
}

function catalogLocation(value: string) {
  const needle = value.trim().toLowerCase();
  return EDITORIAL_LOCATIONS.find((item) => item.toLowerCase() === needle) ?? "";
}
