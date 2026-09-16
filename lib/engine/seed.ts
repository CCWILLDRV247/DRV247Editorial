import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { WAVE1_SOURCE_SET } from "../../config/wave1-sources";
import {
  demoUserInterests,
  demoUsers,
  demoVehicles,
  mediaSources,
  vehicleEntities,
} from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { VEHICLE_CATALOG } from "./catalog";
import { parseCsv } from "./csv";
import { slugify } from "./normalize";

type Db = LibSQLDatabase<typeof schema>;

export function loadCsvSources(cwd = process.cwd()) {
  const file = path.join(cwd, "config/drv247_uk_eu_automotive_media_sources.csv");
  return parseCsv(fs.readFileSync(file, "utf8"));
}

export async function seedEngine(db: Db) {
  const already = await db.select({ id: mediaSources.id }).from(mediaSources).limit(1);
  if (already.length) {
    return;
  }

  const rows = loadCsvSources();
  const nowPriority = (id: string) => {
    const order = [...WAVE1_SOURCE_SET];
    const index = order.indexOf(id);
    return index === -1 ? 80 : index + 1;
  };

  for (const row of rows) {
    const enabled = WAVE1_SOURCE_SET.has(row.id);
    const values = {
      id: row.id,
      publication: row.publication,
      country: row.country,
      url: row.url,
      rssUrl: row.rss_url || null,
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
    const existing = (
      await db.select().from(mediaSources).where(eq(mediaSources.id, row.id)).limit(1)
    )[0];
    if (existing) {
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

  const catalogCount = (await db.select().from(vehicleEntities)).length;
  if (catalogCount === 0) {
    for (const record of VEHICLE_CATALOG) {
      await db.insert(vehicleEntities).values({
        kind: "make",
        name: record.make,
        slug: slugify(record.make),
        make: record.make,
      });
      for (const model of record.models) {
        await db.insert(vehicleEntities).values({
          kind: "model",
          name: model.name,
          slug: slugify(model.name),
          make: record.make,
          model: model.name,
        });
      }
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
