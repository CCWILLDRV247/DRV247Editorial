import { EDITORIAL_LOCATIONS, INTEREST_TAXONOMY, VEHICLE_CATALOG } from "./catalog";

export const FOR_YOU_TEST_STORAGE_KEY = "drv247-for-you-test";

export type ForYouTestProfile = {
  make?: string;
  model?: string;
  generation?: string;
  variant?: string;
  interests: string[];
  location?: string;
};

export type ForYouTestCatalog = {
  makes: {
    name: string;
    models: { name: string; generations: string[]; variants: string[] }[];
  }[];
  interests: string[];
  locations: string[];
};

export type LiveTaxonomy = {
  entities: { kind: string; name: string; make?: string | null; model?: string | null }[];
  interests: string[];
  locations: string[];
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

/** Keep query tokens as the user typed them, including off-catalog Honda/Civic. */
export function sanitizeFilterToken(value: string): string {
  const token = value.replace(/\s+/g, " ").trim();
  if (!token || token.length > 80) return "";
  if (/[<>\u0000-\u001f]/.test(token)) return "";
  return token;
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

  const interests = [
    ...new Set(getAll("interest").map((item) => sanitizeFilterToken(item)).filter(Boolean)),
  ];
  return {
    make: sanitizeFilterToken(get("make")) || undefined,
    model: sanitizeFilterToken(get("model")) || undefined,
    generation: sanitizeFilterToken(get("generation")) || undefined,
    variant: sanitizeFilterToken(get("variant")) || undefined,
    interests,
    location: sanitizeFilterToken(get("location")) || undefined,
  };
}

export function forYouTestIsActive(profile: ForYouTestProfile) {
  return Boolean(
    profile.make ||
      profile.model ||
      profile.generation ||
      profile.variant ||
      profile.interests.length ||
      profile.location,
  );
}

export function articleMatchesForYouTest(
  extras: {
    makes: string[];
    models: string[];
    generations?: string[];
    variants?: string[];
    interests: string[];
    locations: string[];
  },
  profile: ForYouTestProfile,
): boolean {
  if (!forYouTestIsActive(profile)) return true;
  const makes = extras.makes.map(norm);
  const models = extras.models.map(norm);
  const generations = (extras.generations ?? []).map(norm);
  const variants = (extras.variants ?? []).map(norm);
  const interests = extras.interests.map(norm);
  const locations = extras.locations.map(norm);
  if (profile.make && !makes.includes(norm(profile.make))) return false;
  if (profile.model && !models.includes(norm(profile.model))) return false;
  if (profile.generation && !generations.includes(norm(profile.generation))) return false;
  if (profile.variant && !variants.includes(norm(profile.variant))) return false;
  if (profile.interests.length && !profile.interests.some((interest) => interests.includes(norm(interest)))) {
    return false;
  }
  if (profile.location && !locations.includes(norm(profile.location))) return false;
  return true;
}

function norm(value: string) {
  return value.toLowerCase().trim();
}

export function forYouTestSummary(profile: ForYouTestProfile) {
  const parts = [
    [profile.make, profile.model, profile.generation, profile.variant].filter(Boolean).join(" "),
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
  if (profile.variant) params.set("variant", profile.variant);
  for (const interest of profile.interests) params.append("interest", interest);
  if (profile.location) params.set("location", profile.location);
  return params.toString();
}

export function withTestQuery(href: string, query?: string) {
  if (!query) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}

function upsertMake(
  makes: Map<string, ForYouTestCatalog["makes"][number]>,
  name: string,
) {
  const token = sanitizeFilterToken(name);
  if (!token) return null;
  const key = norm(token);
  const existing = makes.get(key);
  if (existing) return existing;
  const created = { name: token, models: [] as ForYouTestCatalog["makes"][number]["models"] };
  makes.set(key, created);
  return created;
}

function upsertModel(
  make: ForYouTestCatalog["makes"][number] | null,
  name: string,
) {
  const token = sanitizeFilterToken(name);
  if (!make || !token) return null;
  const key = norm(token);
  const existing = make.models.find((model) => norm(model.name) === key);
  if (existing) return existing;
  const created = { name: token, generations: [] as string[], variants: [] as string[] };
  make.models.push(created);
  return created;
}

function upsertValue(list: string[], name: string) {
  const token = sanitizeFilterToken(name);
  if (!token) return;
  if (list.some((item) => norm(item) === norm(token))) return;
  list.push(token);
}

/** Gazetteer plus any live story entities, including off-catalog marques. */
export function buildForYouTestCatalog(live?: LiveTaxonomy): ForYouTestCatalog {
  const makes = new Map<string, ForYouTestCatalog["makes"][number]>();
  const interests: string[] = [];
  const locations: string[] = [];

  for (const record of VEHICLE_CATALOG) {
    const make = upsertMake(makes, record.make);
    for (const model of record.models) {
      const node = upsertModel(make, model.name);
      for (const generation of model.generations ?? []) upsertValue(node?.generations ?? [], generation);
      for (const variant of model.variants ?? []) upsertValue(node?.variants ?? [], variant);
    }
  }
  const porsche = upsertMake(makes, "Porsche");
  const nineEleven = upsertModel(porsche, "911");
  upsertValue(nineEleven?.variants ?? [], "GT3");
  upsertValue(nineEleven?.variants ?? [], "Carrera RS");

  for (const interest of INTEREST_TAXONOMY) upsertValue(interests, interest);
  for (const location of EDITORIAL_LOCATIONS) upsertValue(locations, location);

  for (const entity of live?.entities ?? []) {
    if (entity.kind === "make") {
      upsertMake(makes, entity.name);
      continue;
    }
    const make = upsertMake(makes, entity.make || "");
    if (entity.kind === "model") {
      upsertModel(make, entity.name);
      continue;
    }
    if (entity.kind === "generation") {
      const model = upsertModel(make, entity.model || "");
      upsertValue(model?.generations ?? [], entity.name);
      continue;
    }
    if (entity.kind === "variant") {
      const model = upsertModel(make, entity.model || "");
      upsertValue(model?.variants ?? [], entity.name);
    }
  }
  for (const interest of live?.interests ?? []) upsertValue(interests, interest);
  for (const location of live?.locations ?? []) upsertValue(locations, location);

  const sortedMakes = [...makes.values()]
    .map((make) => ({
      name: make.name,
      models: make.models
        .map((model) => ({
          name: model.name,
          generations: [...model.generations].sort((a, b) => a.localeCompare(b)),
          variants: [...model.variants].sort((a, b) => a.localeCompare(b)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    makes: sortedMakes,
    interests: interests.sort((a, b) => a.localeCompare(b)),
    locations: locations.sort((a, b) => a.localeCompare(b)),
  };
}

export function forYouTestCatalog(live?: LiveTaxonomy): ForYouTestCatalog {
  return buildForYouTestCatalog(live);
}

function catalogToLive(catalog: ForYouTestCatalog): LiveTaxonomy {
  const entities: LiveTaxonomy["entities"] = [];
  for (const make of catalog.makes) {
    entities.push({ kind: "make", name: make.name, make: make.name });
    for (const model of make.models) {
      entities.push({ kind: "model", name: model.name, make: make.name, model: model.name });
      for (const generation of model.generations) {
        entities.push({
          kind: "generation",
          name: generation,
          make: make.name,
          model: model.name,
        });
      }
      for (const variant of model.variants) {
        entities.push({
          kind: "variant",
          name: variant,
          make: make.name,
          model: model.name,
        });
      }
    }
  }
  return {
    entities,
    interests: catalog.interests,
    locations: catalog.locations,
  };
}

export function withProfileInCatalog(
  catalog: ForYouTestCatalog,
  profile: ForYouTestProfile,
): ForYouTestCatalog {
  const live = catalogToLive(catalog);
  return buildForYouTestCatalog({
    entities: [
      ...live.entities,
      ...(profile.make ? [{ kind: "make", name: profile.make, make: profile.make }] : []),
      ...(profile.model
        ? [{ kind: "model", name: profile.model, make: profile.make ?? null, model: profile.model }]
        : []),
      ...(profile.generation
        ? [
            {
              kind: "generation",
              name: profile.generation,
              make: profile.make ?? null,
              model: profile.model ?? null,
            },
          ]
        : []),
      ...(profile.variant
        ? [
            {
              kind: "variant",
              name: profile.variant,
              make: profile.make ?? null,
              model: profile.model ?? null,
            },
          ]
        : []),
    ],
    interests: [...live.interests, ...profile.interests],
    locations: [...live.locations, ...(profile.location ? [profile.location] : [])],
  });
}
