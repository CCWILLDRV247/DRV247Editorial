import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { ENABLED_SOURCE_IDS, ENABLED_SOURCE_SET } from "../../config/wave1-sources";
import { MERCH_SOURCE_POLICY } from "../../config/merch";
import {
  demoUserInterests,
  demoUsers,
  demoVehicles,
  editorialPrimaryCategories,
  editorialSecondaryCategories,
  mediaSources,
  vehicleEntities,
} from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { VEHICLE_CATALOG } from "./catalog";
import { parseCsv } from "./csv";
import { slugify } from "./normalize";
import { PRIMARY_META, SECONDARY_TAXONOMY } from "./taxonomy";

type Db = LibSQLDatabase<typeof schema>;

export function loadCsvSources(cwd = process.cwd()) {
  const file = path.join(cwd, "config/drv247_uk_eu_automotive_media_sources.csv");
  return parseCsv(fs.readFileSync(file, "utf8"));
}

type SourceSeedValues = {
  id: string;
  publication: string;
  country: string;
  url: string;
  rssUrl: string | null;
  websiteAvailable: boolean;
  scrapeDifficulty: string;
  editorialCategory: string;
  marquesCovered: string;
  relevance: string;
  csvEnabled: boolean;
  enabled: boolean;
  sourceType: string;
  rssVerifiedStatus: string;
  rssConfidence: string;
  priority: number;
  maxArticles: number;
  allowExcerpt: boolean;
  allowImage: boolean;
};

/** Skip Turso writes when CSV/enablement already match. Cold homepage used to UPDATE every source. */
export function sourceSeedUnchanged(
  existing: {
    publication: string;
    country: string;
    url: string;
    rssUrl: string | null;
    websiteAvailable: boolean;
    scrapeDifficulty: string;
    editorialCategory: string;
    marquesCovered: string;
    relevance: string;
    csvEnabled: boolean;
    enabled: boolean;
    sourceType: string;
    rssVerifiedStatus: string;
    rssConfidence: string;
    priority: number;
    maxArticles: number;
    allowExcerpt: boolean;
    allowImage: boolean;
  },
  values: SourceSeedValues,
): boolean {
  return (
    existing.publication === values.publication &&
    existing.country === values.country &&
    existing.url === values.url &&
    existing.rssUrl === values.rssUrl &&
    Boolean(existing.websiteAvailable) === Boolean(values.websiteAvailable) &&
    existing.scrapeDifficulty === values.scrapeDifficulty &&
    existing.editorialCategory === values.editorialCategory &&
    existing.marquesCovered === values.marquesCovered &&
    existing.relevance === values.relevance &&
    Boolean(existing.csvEnabled) === Boolean(values.csvEnabled) &&
    Boolean(existing.enabled) === Boolean(values.enabled) &&
    existing.sourceType === values.sourceType &&
    existing.rssVerifiedStatus === values.rssVerifiedStatus &&
    existing.rssConfidence === values.rssConfidence &&
    existing.priority === values.priority &&
    existing.maxArticles === values.maxArticles &&
    Boolean(existing.allowExcerpt) === Boolean(values.allowExcerpt) &&
    Boolean(existing.allowImage) === Boolean(values.allowImage)
  );
}

export async function seedEngine(db: Db) {
  await seedTaxonomy(db);
  const rows = loadCsvSources();
  const existingRows = await db.select().from(mediaSources);
  const byId = new Map(existingRows.map((row) => [row.id, row]));
  const nowPriority = (id: string) => {
    const index = (ENABLED_SOURCE_IDS as readonly string[]).indexOf(id);
    return index === -1 ? 80 : index + 1;
  };

  for (const row of rows) {
    const merchPolicy = MERCH_SOURCE_POLICY[row.id];
    const enabled = ENABLED_SOURCE_SET.has(row.id);
    const rssUrl =
      merchPolicy?.action === "editorial-rss" ? merchPolicy.rssUrl : row.rss_url || null;
    const values: SourceSeedValues = {
      id: row.id,
      publication: row.publication,
      country: row.country,
      url: row.url,
      rssUrl,
      websiteAvailable: row.website_available === "yes",
      scrapeDifficulty: row.scrape_difficulty,
      editorialCategory: row.editorial_category,
      marquesCovered: row.marques_covered,
      relevance: row.drv247_relevance,
      csvEnabled: row.enabled.toLowerCase() === "true",
      enabled,
      sourceType: row.source_type,
      rssVerifiedStatus: row.rss_verified_status,
      rssConfidence: row.rss_confidence,
      priority: nowPriority(row.id),
      maxArticles: 8,
      allowExcerpt: true,
      allowImage: true,
    };
    const existing = byId.get(row.id);
    if (existing) {
      if (sourceSeedUnchanged(existing, values)) continue;
      await db
        .update(mediaSources)
        .set({
          ...values,
          lastSuccessAt: existing.lastSuccessAt,
          lastFailureAt: existing.lastFailureAt,
          failureCount: existing.failureCount,
          lastHttpStatus: existing.lastHttpStatus,
          lastError: existing.lastError,
          lastMethod: existing.lastMethod,
          lastArticleCount: existing.lastArticleCount,
        })
        .where(eq(mediaSources.id, row.id));
    } else {
      await db.insert(mediaSources).values(values);
    }
  }

  const existingEntities = await db.select().from(vehicleEntities);
  const seen = new Set(
    existingEntities.map((row) => `${row.kind}:${slugify(row.name)}:${row.make ?? ""}`),
  );
  for (const record of VEHICLE_CATALOG) {
    const makeKey = `make:${slugify(record.make)}:${record.make}`;
    if (!seen.has(makeKey)) {
      await db.insert(vehicleEntities).values({
        kind: "make",
        name: record.make,
        slug: slugify(record.make),
        make: record.make,
      });
      seen.add(makeKey);
    }
    for (const model of record.models) {
      const modelKey = `model:${slugify(model.name)}:${record.make}`;
      if (seen.has(modelKey)) continue;
      await db.insert(vehicleEntities).values({
        kind: "model",
        name: model.name,
        slug: slugify(model.name),
        make: record.make,
        model: model.name,
      });
      seen.add(modelKey);
    }
  }

  if (!(await db.select().from(demoUsers).where(eq(demoUsers.id, "demo-chris")).limit(1))[0]) {
    await db.insert(demoUsers).values([
      { id: "demo-chris", name: "Chris", location: "Goodwood" },
      { id: "demo-355", name: "355 Desk", location: "Milan" },
      { id: "demo-m3", name: "Modified Desk", location: "London" },
    ]);
    await db.insert(demoVehicles).values([
      {
        id: "veh-964",
        userId: "demo-chris",
        make: "Porsche",
        model: "911",
        generation: "964",
        variant: "Carrera RS",
      },
      {
        id: "veh-355",
        userId: "demo-355",
        make: "Ferrari",
        model: "F355",
        generation: "F355",
        variant: null,
      },
      {
        id: "veh-e46",
        userId: "demo-m3",
        make: "BMW",
        model: "M3",
        generation: "E46",
        variant: null,
      },
    ]);
    await db.insert(demoUserInterests).values([
      { userId: "demo-chris", interest: "Classic" },
      { userId: "demo-chris", interest: "Collector Cars" },
      { userId: "demo-chris", interest: "Photography" },
      { userId: "demo-355", interest: "Performance" },
      { userId: "demo-355", interest: "Sports Cars" },
      { userId: "demo-355", interest: "Design" },
      { userId: "demo-m3", interest: "Modified" },
      { userId: "demo-m3", interest: "Performance" },
    ]);
  }
}

async function seedTaxonomy(db: Db) {
  const existing = await db.select().from(editorialPrimaryCategories);
  if (existing.length === 0) {
    for (const primary of PRIMARY_META) {
      await db.insert(editorialPrimaryCategories).values({
        slug: primary.slug,
        name: primary.name,
        description: primary.description,
        sortOrder: primary.sortOrder,
        enabled: true,
      });
    }
  }
  const primaries = await db.select().from(editorialPrimaryCategories);
  const bySlug = new Map(primaries.map((row) => [row.slug, row.id]));
  const secondaries = await db.select().from(editorialSecondaryCategories);
  if (secondaries.length === 0) {
    for (const secondary of SECONDARY_TAXONOMY) {
      const primaryId = bySlug.get(secondary.primary);
      if (!primaryId) continue;
      await db.insert(editorialSecondaryCategories).values({
        primaryCategoryId: primaryId,
        slug: secondary.slug,
        name: secondary.name,
        description: null,
        enabled: true,
      });
    }
  }
}
