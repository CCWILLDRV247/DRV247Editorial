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
  chassis?: string;
  inTitle?: boolean;
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
  return ` ${[title, excerpt, paragraph].filter(Boolean).join(" ")} `
    .toLowerCase()
    .replace(/[’‘‛]/g, "'");
}

export function includesToken(text: string, alias: string): boolean {
  const needle = alias.toLowerCase().trim().replace(/[’‘‛]/g, "'");
  const hay = text.replace(/[’‘‛]/g, "'");
  const parts = needle.split(/\s+/).filter(Boolean).map(escapeReg);
  if (!parts.length) return false;
  const body = parts.join("[\\s-]+");
  const plural = /^[0-9]+$/.test(needle.replace(/[\s-]/g, "")) ? "s?" : "";
  return new RegExp(`(?:^|[^a-z0-9])${body}${plural}(?:[^a-z0-9]|$)`, "i").test(hay);
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inTitleHay(title: string, alias: string) {
  return includesToken(` ${title} `, alias);
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
      const chassis = matchedGens[0];
      entities.push({
        kind: "model",
        name: model.name,
        slug: slugify(model.name),
        make: record.make,
        model: model.name,
        chassis,
        inTitle:
          model.aliases.some((alias) => inTitleHay(title, alias)) ||
          matchedGens.some((generation) => inTitleHay(title, generation)),
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
          chassis: generation,
          inTitle: inTitleHay(title, generation),
          confidence: 0.9,
        });
      }
      for (const variant of model.variants ?? []) {
        if (!includesToken(text, variant)) continue;
        variants.add(variant);
        entities.push({
          kind: "variant",
          name: variant,
          slug: slugify(variant),
          make: record.make,
          model: model.name,
          chassis,
          inTitle: inTitleHay(title, variant),
          confidence: 0.8,
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
        inTitle: record.aliases.some((alias) => inTitleHay(title, alias)),
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
      inTitle: inTitleHay(title, "gt3"),
      confidence: 0.84,
    });
  }
  if (
    models.has("911") &&
    (includesToken(text, "carrera 2") ||
      includesToken(text, "c2") ||
      (includesToken(text, "c2") && includesToken(text, "carrera")))
  ) {
    if (!variants.has("Carrera 2")) {
      variants.add("Carrera 2");
      entities.push({
        kind: "variant",
        name: "Carrera 2",
        slug: "carrera-2",
        make: "Porsche",
        model: "911",
        inTitle: inTitleHay(title, "carrera 2") || inTitleHay(title, "c2"),
        confidence: 0.8,
      });
    }
    if (!variants.has("C2")) {
      variants.add("C2");
      entities.push({
        kind: "variant",
        name: "C2",
        slug: "c2",
        make: "Porsche",
        model: "911",
        inTitle: inTitleHay(title, "c2"),
        confidence: 0.8,
      });
    }
  }
  if (models.has("F355") && (includesToken(text, "gtb") || includesToken(text, "355 gtb"))) {
    if (!variants.has("GTB")) {
      variants.add("GTB");
      entities.push({
        kind: "variant",
        name: "GTB",
        slug: "gtb",
        make: "Ferrari",
        model: "F355",
        inTitle: inTitleHay(title, "gtb") || inTitleHay(title, "355 gtb"),
        confidence: 0.84,
      });
    }
  }
  if (models.has("348")) {
    const threeFortyEight: [string, string[]][] = [
      ["tb", ["tb", "348 tb"]],
      ["ts", ["ts", "348 ts"]],
      ["Spider", ["spider", "348 spider"]],
      ["Challenge", ["challenge", "348 challenge"]],
      ["GT Competizione", ["gt competizione", "348 gt competizione", "gtc"]],
    ];
    for (const [name, needles] of threeFortyEight) {
      if (variants.has(name) || !needles.some((needle) => includesToken(text, needle))) continue;
      variants.add(name);
      entities.push({
        kind: "variant",
        name,
        slug: slugify(name),
        make: "Ferrari",
        model: "348",
        inTitle: needles.some((needle) => inTitleHay(title, needle)),
        confidence: 0.84,
      });
    }
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
    ["Air-cooled", ["air-cooled", "air cooled", "aircooled"]],
    ["Performance", ["performance", "supercar", "hypercar"]],
    ["Sports Cars", ["sports car", "sportscar", "gt car"]],
    ["Supercars", ["supercar", "hypercar"]],
    ["Modern Classics", ["modern classic", "youngtimer"]],
    ["Modified", ["modified", "stance", "tuned", "restomod"]],
    ["Tuning", ["tuning", "tuned", "aftermarket"]],
    ["JDM", ["jdm"]],
    ["Euro", ["euro"]],
    ["American", ["american muscle", "muscle car", "hot rod"]],
    ["Motorsport", ["motorsport", "racing", "grand prix", "le mans", "rally"]],
    ["Rally", ["rally", "wrc"]],
    ["Drift", ["drift", "drifting"]],
    ["Drag Racing", ["drag racing", "drag strip"]],
    ["Track", ["track day", "time attack"]],
    ["Design", ["design", "styling", "concept", "studio"]],
    ["Automotive Design", ["automotive design", "car design"]],
    ["Car Culture", ["culture", "lifestyle", "scene"]],
    ["Road Trips", ["road trip", "touring", "drive"]],
    ["Collector Cars", ["collector", "concours", "auction"]],
    ["Collecting", ["collecting"]],
    ["Restoration", ["restoration", "restore", "barn find"]],
    ["Photography", ["photography", "photographer", "shoot"]],
    ["Events", ["event", "goodwood", "villa d'este", "retromobile"]],
    ["Engine Swaps", ["engine swap", "ls swap", "k-swap"]],
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

export { haystack as entityHaystack };

export function isKnownInterest(value: string): value is Interest {
  return (INTEREST_TAXONOMY as readonly string[]).includes(value);
}
