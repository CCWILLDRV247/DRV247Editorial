import {
  GEOGRAPHY_CATALOG,
  type ContentType,
  type GeoKind,
  type Interest,
  type MotorsportSeries,
  type Scene,
} from "./catalog";
import { extractEntities, includesToken, type ExtractedEntity } from "./extract";
import { canonicalEntityId, slugify } from "./normalize";
import { classifyPrimaryDetailed, type ClassifyInput } from "./taxonomy";
import type { ContentPrimary } from "../../config/magazine-nav";

export const MIN_TAG_CONFIDENCE = 60;

export type EntityRelevance = "about" | "relevant" | "mentioned";

export type ClassifiedEntity = ExtractedEntity & {
  relevance: EntityRelevance;
  canonicalId: string;
  source: "rule";
};

export type ClassifiedTag = {
  name: string;
  confidence: number;
  source: "rule";
};

export type ClassifiedGeography = {
  kind: GeoKind;
  name: string;
  slug: string;
  confidence: number;
  source: "rule";
};

export type ArticleClassification = {
  primary: ContentPrimary;
  primaryConfidence: number;
  source: "rule";
  entities: ClassifiedEntity[];
  makes: string[];
  models: string[];
  generations: string[];
  variants: string[];
  interests: Interest[];
  interestTags: ClassifiedTag[];
  categories: string[];
  contentTypes: ClassifiedTag[];
  scenes: ClassifiedTag[];
  motorsport: ClassifiedTag[];
  geography: ClassifiedGeography[];
  locations: string[];
};

export type ClassificationSnapshot = {
  primary: ContentPrimary;
  primaryConfidence: number;
  source: "rule";
  vehicles: {
    kind: string;
    name: string;
    make?: string;
    model?: string;
    chassis?: string;
    relevance: EntityRelevance;
    confidence: number;
    canonicalId: string;
  }[];
  interests: string[];
  contentTypes: string[];
  scenes: string[];
  motorsport: string[];
  geography: { kind: string; name: string }[];
  classifiedAt: number;
};

const CONTENT_TYPE_RULES: [ContentType, string[]][] = [
  ["Build", ["building a", "build", "horsepower", "engine swap", "project car"]],
  ["Feature", ["feature", "profile", "long read", "long-form"]],
  ["Review", ["review", "first drive", "driven", "road test"]],
  ["Technical", ["technical", "how it works", "engineering", "chassis"]],
  ["Guide", ["guide", "how to", "buyer's", "buyers guide"]],
  ["Interview", ["interview", "talks to", "in conversation"]],
  ["Opinion", ["opinion", "column", "comment"]],
  ["History", ["history", "heritage", "the story of"]],
  ["Event", ["concours", "car show", "motor show", "goodwood", "villa d'este"]],
  ["Road Trip", ["road trip", "road-trip", "touring", "stelvio"]],
  ["Motorsport", ["grand prix", "formula 1", "formula one", "wrc", "le mans", "championship"]],
  ["Video", ["video", "watch"]],
  ["News", ["announces", "unveils", "news"]],
];

const SCENE_RULES: [Scene, string[]][] = [
  ["JDM", ["jdm"]],
  ["VIP", ["vip"]],
  ["Stance", ["stance", "fitment"]],
  ["Drift", ["drift", "drifting"]],
  ["Drag", ["drag racing", "drag strip"]],
  ["Lowrider", ["lowrider"]],
  ["Euro", ["euro"]],
  ["Classic", ["classic", "vintage"]],
  ["Air-cooled", ["air-cooled", "air cooled"]],
  ["Hot Rod", ["hot rod", "hotrod"]],
  ["Restomod", ["restomod"]],
  ["Street", ["street machine", "street car"]],
  ["Tuning", ["tuning", "tuned"]],
  ["Underground", ["underground"]],
];

const MOTORSPORT_RULES: [MotorsportSeries, string[]][] = [
  ["F1", ["formula 1", "formula one", "f1", "grand prix"]],
  ["WRC", ["wrc", "world rally"]],
  ["GT", ["gt racing", "gt3 championship", "imsa"]],
  ["Endurance", ["endurance", "le mans", "wec"]],
  ["Touring Cars", ["touring car", "btcc", "wtcr"]],
  ["Rallycross", ["rallycross"]],
  ["NASCAR", ["nascar"]],
  ["Drag", ["drag racing"]],
  ["Drift", ["formula drift", "drift championship"]],
];

function tagConfidence(title: string, rest: string, needles: string[]): number | null {
  const titleHits = needles.filter((needle) => includesToken(title, needle)).length;
  const restHits = needles.filter((needle) => includesToken(rest, needle)).length;
  if (titleHits) return Math.min(94, 78 + titleHits * 6);
  if (restHits) return Math.min(82, 64 + restHits * 5);
  return null;
}

function collectTags<T extends string>(
  title: string,
  rest: string,
  rules: [T, string[]][],
): ClassifiedTag[] {
  const tags: ClassifiedTag[] = [];
  for (const [name, needles] of rules) {
    const confidence = tagConfidence(title, rest, needles);
    if (confidence == null || confidence < MIN_TAG_CONFIDENCE) continue;
    tags.push({ name, confidence, source: "rule" });
  }
  return tags;
}

function vehicleKey(entity: ExtractedEntity) {
  return `${entity.make ?? ""}::${entity.model ?? entity.name}`.toLowerCase();
}

function comparisonSides(title: string) {
  const match = title.match(/\b(beats|vs\.?|versus|compared to|against)\b/i);
  if (!match || match.index == null) return null;
  return {
    before: title.slice(0, match.index),
    after: title.slice(match.index),
  };
}

function assignRelevance(
  entities: ExtractedEntity[],
  title: string,
  rest: string,
): ClassifiedEntity[] {
  const models = entities.filter((entity) => entity.kind === "model");
  const titleModelKeys = new Set(
    models.filter((entity) => entity.inTitle).map((entity) => vehicleKey(entity)),
  );
  const uniqueModels = new Set(models.map((entity) => vehicleKey(entity)));
  const sides = comparisonSides(title);
  const comparison =
    Boolean(sides) ||
    includesToken(rest, "vs") ||
    includesToken(rest, "versus") ||
    includesToken(rest, "compared to") ||
    includesToken(rest, "beats the");

  return entities.map((entity) => {
    const key = vehicleKey(entity);
    const inTitle = Boolean(entity.inTitle);
    const inRest = includesToken(rest, entity.name);
    const token = entity.kind === "make" ? entity.name : entity.name;
    const inBefore = sides ? includesToken(sides.before, token) : false;
    const inAfter = sides ? includesToken(sides.after, token) : false;
    let relevance: EntityRelevance = "mentioned";
    if (sides && (inBefore || inAfter)) {
      relevance = inBefore && !inAfter ? "about" : inAfter && !inBefore ? "mentioned" : "relevant";
    } else if (entity.kind === "make") {
      const ownModels = models.filter((model) => (model.make ?? "") === entity.name);
      const focused = ownModels.some((model) => titleModelKeys.has(vehicleKey(model)));
      if (inTitle && (focused || uniqueModels.size <= 1)) relevance = "about";
      else if (inTitle || focused) relevance = "relevant";
      else relevance = uniqueModels.size >= 3 ? "mentioned" : inRest ? "relevant" : "mentioned";
    } else if (inTitle && (titleModelKeys.has(key) || uniqueModels.size <= 2)) {
      relevance = "about";
    } else if (inTitle) {
      relevance = "relevant";
    } else if (titleModelKeys.size && !titleModelKeys.has(key) && (comparison || uniqueModels.size >= 3)) {
      relevance = "mentioned";
    } else if (inRest && uniqueModels.size <= 2) {
      relevance = "relevant";
    }

    return {
      ...entity,
      relevance,
      confidence: entity.confidence,
      canonicalId: canonicalEntityId({
        kind: entity.kind,
        name: entity.name,
        make: entity.make,
        model: entity.model,
      }),
      source: "rule" as const,
      chassis: entity.chassis,
    };
  }).filter((entity) => Math.round(entity.confidence * 100) >= MIN_TAG_CONFIDENCE || entity.relevance !== "mentioned");
}

export function classifyArticle(
  title: string,
  excerpt = "",
  paragraph = "",
  publication = "",
): ArticleClassification {
  const extracted = extractEntities(title, excerpt, paragraph);
  const titleHay = ` ${title} `;
  const restHay = ` ${excerpt} ${paragraph} `;
  const entities = assignRelevance(extracted.entities, titleHay, restHay);
  const contentTypes = collectTags(titleHay, restHay, CONTENT_TYPE_RULES);
  const scenes = collectTags(titleHay, restHay, SCENE_RULES);
  const motorsport = collectTags(titleHay, restHay, MOTORSPORT_RULES);
  const geography: ClassifiedGeography[] = [];
  for (const place of GEOGRAPHY_CATALOG) {
    const confidence = tagConfidence(titleHay, restHay, place.aliases);
    if (confidence == null || confidence < MIN_TAG_CONFIDENCE) continue;
    geography.push({
      kind: place.kind,
      name: place.name,
      slug: slugify(place.name),
      confidence,
      source: "rule",
    });
  }

  const interestTags: ClassifiedTag[] = extracted.interests.map((name) => ({
    name,
    confidence: includesToken(titleHay, name.toLowerCase()) ? 78 : 68,
    source: "rule" as const,
  }));

  const classifyInput: ClassifyInput = {
    title,
    excerpt: [excerpt, paragraph].filter(Boolean).join(" "),
    publication,
    categories: extracted.categories,
    interests: extracted.interests,
    contentTypes: contentTypes.map((row) => row.name),
    scenes: scenes.map((row) => row.name),
  };
  const primary = classifyPrimaryDetailed(classifyInput);

  return {
    primary: primary.primary,
    primaryConfidence: primary.confidence,
    source: "rule",
    entities,
    makes: extracted.makes,
    models: extracted.models,
    generations: extracted.generations,
    variants: extracted.variants,
    interests: extracted.interests,
    interestTags,
    categories: extracted.categories,
    contentTypes,
    scenes,
    motorsport,
    geography,
    locations: [...new Set([...extracted.locations, ...geography.map((row) => row.name)])],
  };
}

export function classificationSnapshot(classified: ArticleClassification): ClassificationSnapshot {
  return {
    primary: classified.primary,
    primaryConfidence: classified.primaryConfidence,
    source: classified.source,
    vehicles: classified.entities.map((entity) => ({
      kind: entity.kind,
      name: entity.name,
      make: entity.make,
      model: entity.model,
      chassis: entity.chassis,
      relevance: entity.relevance,
      confidence: Math.round(entity.confidence * 100),
      canonicalId: entity.canonicalId,
    })),
    interests: classified.interests,
    contentTypes: classified.contentTypes.map((row) => row.name),
    scenes: classified.scenes.map((row) => row.name),
    motorsport: classified.motorsport.map((row) => row.name),
    geography: classified.geography.map((row) => ({ kind: row.kind, name: row.name })),
    classifiedAt: Date.now(),
  };
}

export function parseClassificationSnapshot(
  metadata: string | null | undefined,
): ClassificationSnapshot | null {
  if (!metadata?.trim()) return null;
  try {
    const parsed = JSON.parse(metadata) as { classification?: ClassificationSnapshot };
    return parsed.classification ?? null;
  } catch {
    return null;
  }
}

export function mergeClassificationMetadata(
  metadata: string | null | undefined,
  classification: ClassificationSnapshot,
): string {
  let parsed: Record<string, unknown> = {};
  if (metadata?.trim()) {
    try {
      const value = JSON.parse(metadata) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({ ...parsed, classification });
}
