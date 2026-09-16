import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
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

type Db = BetterSQLite3Database<typeof schema>;

export function loadCsvSources(cwd = process.cwd()) {
  const file = path.join(cwd, "config/drv247_uk_eu_automotive_media_sources.csv");
  return parseCsv(fs.readFileSync(file, "utf8"));
}

export function seedEngine(db: Db) {
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
    const existing = db.select().from(mediaSources).where(eq(mediaSources.id, row.id)).get();
    if (existing) {
      db.update(mediaSources)
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
        .where(eq(mediaSources.id, row.id))
        .run();
    } else {
      db.insert(mediaSources).values(values).run();
    }
  }

  const catalogCount = db.select().from(vehicleEntities).all().length;
  if (catalogCount === 0) {
    for (const record of VEHICLE_CATALOG) {
      db.insert(vehicleEntities)
        .values({
          kind: "make",
          name: record.make,
          slug: slugify(record.make),
          make: record.make,
        })
        .run();
      for (const model of record.models) {
        db.insert(vehicleEntities)
          .values({
            kind: "model",
            name: model.name,
            slug: slugify(model.name),
            make: record.make,
            model: model.name,
          })
          .run();
      }
    }
  }

  if (!db.select().from(demoUsers).where(eq(demoUsers.id, "demo-chris")).get()) {
    db.insert(demoUsers)
      .values([
        { id: "demo-chris", name: "Chris", location: "Goodwood" },
        { id: "demo-355", name: "355 Desk", location: "Milan" },
        { id: "demo-m3", name: "Modified Desk", location: "London" },
      ])
      .run();
    db.insert(demoVehicles)
      .values([
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
      ])
      .run();
    db.insert(demoUserInterests)
      .values([
        { userId: "demo-chris", interest: "Classic" },
        { userId: "demo-chris", interest: "Collector Cars" },
        { userId: "demo-chris", interest: "Photography" },
        { userId: "demo-355", interest: "Performance" },
        { userId: "demo-355", interest: "Sports Cars" },
        { userId: "demo-355", interest: "Design" },
        { userId: "demo-m3", interest: "Modified" },
        { userId: "demo-m3", interest: "Performance" },
      ])
      .run();
  }
}
