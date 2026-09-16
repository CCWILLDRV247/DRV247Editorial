import {
  EDITORIAL_LOCATIONS,
  INTEREST_TAXONOMY,
  VEHICLE_CATALOG,
  type EditorialCategory,
  type Interest,
} from "./catalog";
import { slugify } from "./normalize";

export type ExtractedEntity = {
  kind: "make" | "model" | "generation" | "variant";
  name: string;
  slug: string;
  make?: string;
  model?: string;
  confidence: number;
};

export type Extraction = {
  entities: ExtractedEntity[];
  makes: string[];
  models: string[];
  generations: string[];
  variants: string[];
  interests: Interest[];
  categories: EditorialCategory[];
  locations: string[];
};

function haystack(title: string, excerpt: string, paragraph: string): string {
  return ` ${[title, excerpt, paragraph].filter(Boolean).join(" ")} `.toLowerCase();
}

function includesToken(text: string, alias: string): boolean {
  const parts = alias
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeReg);
  if (!parts.length) return false;
  const body = parts.join("[\\s-]+");
  return new RegExp(`(?:^|[^a-z0-9])${body}(?:[^a-z0-9]|$)`, "i").test(text);
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Gazetteer over title + teaser + extracted first paragraph. No LLM. */
export function extractEntities(title: string, excerpt = "", paragraph = ""): Extraction {
  const text = haystack(title, excerpt, paragraph);
  const entities: ExtractedEntity[] = [];
  const makes = new Set<string>();
  const models = new Set<string>();
  const generations = new Set<string>();
  const variants = new Set<string>();

  for (const record of VEHICLE_CATALOG) {
    const makeHit = record.aliases.some((alias) => includesToken(text, alias));
    let modelHit: string | null = null;

    for (const model of record.models) {
      const aliasHit = model.aliases.some((alias) => includesToken(text, alias));
      const matchedGens = (model.generations ?? []).filter((generation) =>
        includesToken(text, generation),
      );
      const impliedByGeneration = Boolean(model.generationImpliesModel && matchedGens.length);
      if (!aliasHit && !impliedByGeneration) continue;

      modelHit = model.name;
      models.add(model.name);
      entities.push({
        kind: "model",
        name: model.name,
        slug: slugify(model.name),
        make: record.make,
        model: model.name,
        confidence: aliasHit ? 0.86 : 0.82,
      });
      for (const generation of matchedGens) {
        generations.add(generation);
        entities.push({
          kind: "generation",
          name: generation,
          slug: slugify(generation),
          make: record.make,
          model: model.name,
          confidence: 0.9,
        });
      }
    }

    if (makeHit || modelHit) {
      makes.add(record.make);
      entities.push({
        kind: "make",
        name: record.make,
        slug: slugify(record.make),
        make: record.make,
        confidence: makeHit ? 0.92 : 0.8,
      });
    }
  }

  if (models.has("911") && (includesToken(text, "carrera rs") || generations.has("964"))) {
    if (includesToken(text, "carrera rs") || (generations.has("964") && includesToken(text, "rs"))) {
      variants.add("Carrera RS");
      entities.push({
        kind: "variant",
        name: "Carrera RS",
        slug: "carrera-rs",
        make: "Porsche",
        model: "911",
        confidence: 0.78,
      });
    }
  }
  if (models.has("911") && includesToken(text, "gt3")) {
    variants.add("GT3");
    entities.push({
      kind: "variant",
      name: "GT3",
      slug: "gt3",
      make: "Porsche",
      model: "911",
      confidence: 0.84,
    });
  }

  return {
    entities,
    makes: [...makes],
    models: [...models],
    generations: [...generations],
    variants: [...variants],
    interests: extractInterests(text),
    categories: extractCategories(text),
    locations: extractLocations(text),
  };
}

function extractInterests(text: string): Interest[] {
  const hits: Interest[] = [];
  const rules: [Interest, string[]][] = [
    ["Classic", ["classic", "vintage", "historic"]],
    ["Performance", ["performance", "supercar", "hypercar"]],
    ["Sports Cars", ["sports car", "sportscar", "gt car"]],
    ["Modified", ["modified", "stance", "tuned", "restomod"]],
    ["Motorsport", ["motorsport", "racing", "grand prix", "le mans", "rally"]],
    ["Design", ["design", "styling", "concept", "studio"]],
    ["Car Culture", ["culture", "lifestyle", "scene"]],
    ["Road Trips", ["road trip", "touring", "drive"]],
    ["Collector Cars", ["collector", "concours", "auction"]],
    ["Restoration", ["restoration", "restore", "barn find"]],
    ["Photography", ["photography", "photographer", "shoot"]],
    ["Events", ["event", "goodwood", "villa d'este", "retromobile"]],
  ];
  for (const [interest, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) hits.push(interest);
  }
  return hits;
}

function extractCategories(text: string): EditorialCategory[] {
  const hits: EditorialCategory[] = [];
  const rules: [EditorialCategory, string[]][] = [
    ["News", ["news", "announces", "unveils"]],
    ["Features", ["feature", "profile", "long read"]],
    ["Car Culture", ["culture", "lifestyle"]],
    ["Classic", ["classic", "vintage"]],
    ["Collector", ["collector", "auction", "concours"]],
    ["Performance", ["performance", "supercar"]],
    ["Modified", ["modified", "stance"]],
    ["Motorsport", ["race", "motorsport", "grand prix"]],
    ["Design", ["design", "concept"]],
    ["History", ["history", "heritage"]],
    ["People", ["interview", "profile", "designer"]],
    ["Events", ["event", "show", "goodwood"]],
    ["Road Trips", ["road trip", "tour"]],
    ["Buying", ["for sale", "buyer's", "buying"]],
    ["Market", ["market", "values", "auction"]],
    ["Restoration", ["restoration"]],
    ["Engineering", ["engineering", "chassis", "engine"]],
    ["Lifestyle", ["lifestyle", "fashion"]],
    ["Photography", ["photograph"]],
    ["Video", ["video", "watch"]],
  ];
  for (const [category, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) hits.push(category);
  }
  if (!hits.length) hits.push("Car Culture");
  return hits;
}

function extractLocations(text: string): string[] {
  return EDITORIAL_LOCATIONS.filter((place) => text.includes(place.toLowerCase()));
}

export function isKnownInterest(value: string): value is Interest {
  return (INTEREST_TAXONOMY as readonly string[]).includes(value);
}
