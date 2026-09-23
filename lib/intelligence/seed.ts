import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { demoVehicles } from "@/lib/db/schema";
import {
  budgetBands,
  buildTypes,
  maintenanceComponents,
  maintenanceTypes,
  replacementGrades,
  manufacturers,
  objectiveCategories,
  objectives,
  productSources,
  safetyClasses,
  specialistMarques,
  specialists,
  styles,
  suppliers,
  usageTypes,
  vehicleModifications,
} from "@/lib/db/intelligence-schema";
import { runAdapter } from "./adapters";
import type { NormalisedProduct, ProductSourceRow } from "./adapters/types";
import { persistNormalisedProducts } from "./writer";

type Db = LibSQLDatabase<Record<string, unknown>>;

type TaxonomyFile = {
  safetyClasses: { slug: string; name: string; withholdBelowFitment: string }[];
  buildTypes: { slug: string; name: string; description?: string }[];
  objectiveCategories: { slug: string; name: string }[];
  objectives: { category: string; slug: string; name: string; description?: string }[];
  usageTypes: { slug: string; name: string }[];
  budgetBands: {
    slug: string;
    name: string;
    currency: string;
    minAmount: number | null;
    maxAmount: number | null;
  }[];
  styles: { slug: string; name: string; description?: string }[];
  replacementGrades: { slug: string; name: string; description?: string }[];
  maintenanceTypes: { slug: string; name: string }[];
  maintenanceComponents: { slug: string; name: string; category: string; safetyClass: string }[];
};

type SeedFile = {
  vehicles: {
    id: string;
    year?: number;
    engine?: string;
    fuel?: string;
    transmission?: string;
    body?: string;
    powerBhp?: number;
    registration?: string;
    specification?: string;
  }[];
  sources: { id: string; name: string; kind: string; identifier: string; priority: number }[];
  manufacturers: { id: string; name: string; slug: string; aliases?: string[]; url?: string | null }[];
  suppliers: { id: string; name: string; slug: string; url?: string | null; region?: string | null }[];
  products: NormalisedProduct[];
  specialists: {
    id: string;
    name: string;
    category?: string;
    location?: string;
    url?: string;
    notes?: string;
    source_id?: string;
    marques: { make: string; model?: string | null }[];
  }[];
  modifications: {
    id: string;
    vehicle_id: string;
    category: string;
    product_id?: string | null;
    manufacturer?: string | null;
    description: string;
    notes?: string;
  }[];
};

function readJson<T>(cwd: string, relative: string): T {
  return JSON.parse(fs.readFileSync(path.join(cwd, relative), "utf8")) as T;
}

async function upsertBySlug<T extends { slug: string }>(
  existing: { slug: string }[],
  incoming: T[],
  insert: (row: T, index: number) => Promise<void>,
) {
  const seen = new Set(existing.map((row) => row.slug));
  for (const [index, row] of incoming.entries()) {
    if (seen.has(row.slug)) continue;
    await insert(row, index);
    seen.add(row.slug);
  }
}

export async function seedIntelligence(db: Db, cwd = process.cwd()) {
  const taxonomies = readJson<TaxonomyFile>(cwd, "config/intelligence/taxonomies.json");
  const seed = readJson<SeedFile>(cwd, "config/intelligence/seed.json");
  const now = Date.now();

  const existingSafety = await db.select().from(safetyClasses);
  await upsertBySlug(existingSafety, taxonomies.safetyClasses, async (row) => {
    await db.insert(safetyClasses).values({
      slug: row.slug,
      name: row.name,
      withholdBelowFitment: row.withholdBelowFitment,
    });
  });

  const existingBuildTypes = await db.select().from(buildTypes);
  await upsertBySlug(existingBuildTypes, taxonomies.buildTypes, async (row, index) => {
    await db.insert(buildTypes).values({
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingObjCats = await db.select().from(objectiveCategories);
  await upsertBySlug(existingObjCats, taxonomies.objectiveCategories, async (row, index) => {
    await db.insert(objectiveCategories).values({
      slug: row.slug,
      name: row.name,
      sortOrder: index,
      enabled: true,
    });
  });
  const objCats = await db.select().from(objectiveCategories);
  const objCatBySlug = new Map(objCats.map((row) => [row.slug, row.id]));
  const existingObjectives = await db.select().from(objectives);
  await upsertBySlug(existingObjectives, taxonomies.objectives, async (row, index) => {
    const categoryId = objCatBySlug.get(row.category);
    if (!categoryId) return;
    await db.insert(objectives).values({
      categoryId,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingUsage = await db.select().from(usageTypes);
  await upsertBySlug(existingUsage, taxonomies.usageTypes, async (row, index) => {
    await db.insert(usageTypes).values({
      slug: row.slug,
      name: row.name,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingBands = await db.select().from(budgetBands);
  await upsertBySlug(existingBands, taxonomies.budgetBands, async (row, index) => {
    await db.insert(budgetBands).values({
      slug: row.slug,
      name: row.name,
      currency: row.currency,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingStyles = await db.select().from(styles);
  await upsertBySlug(existingStyles, taxonomies.styles, async (row, index) => {
    await db.insert(styles).values({
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingGrades = await db.select().from(replacementGrades);
  await upsertBySlug(existingGrades, taxonomies.replacementGrades, async (row, index) => {
    await db.insert(replacementGrades).values({
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      sortOrder: index,
      enabled: true,
    });
  });

  const existingMaintTypes = await db.select().from(maintenanceTypes);
  await upsertBySlug(existingMaintTypes, taxonomies.maintenanceTypes, async (row, index) => {
    await db.insert(maintenanceTypes).values({
      slug: row.slug,
      name: row.name,
      sortOrder: index,
      enabled: true,
    });
  });

  const safetyRows = await db.select().from(safetyClasses);
  const safetyBySlug = new Map(safetyRows.map((row) => [row.slug, row.id]));
  const existingComponents = await db.select().from(maintenanceComponents);
  await upsertBySlug(existingComponents, taxonomies.maintenanceComponents, async (row, index) => {
    await db.insert(maintenanceComponents).values({
      slug: row.slug,
      name: row.name,
      category: row.category,
      safetyClassId: safetyBySlug.get(row.safetyClass) ?? null,
      sortOrder: index,
      enabled: true,
    });
  });

  for (const vehicle of seed.vehicles) {
    await db
      .update(demoVehicles)
      .set({
        year: vehicle.year ?? null,
        engine: vehicle.engine ?? null,
        fuel: vehicle.fuel ?? null,
        transmission: vehicle.transmission ?? null,
        body: vehicle.body ?? null,
        powerBhp: vehicle.powerBhp ?? null,
        registration: vehicle.registration ?? null,
        specification: vehicle.specification ?? null,
      })
      .where(eq(demoVehicles.id, vehicle.id));
  }

  const existingSources = await db.select().from(productSources);
  const sourceById = new Map(existingSources.map((row) => [row.id, row]));
  for (const source of seed.sources) {
    const values = {
      id: source.id,
      name: source.name,
      kind: source.kind,
      identifier: source.identifier,
      enabled: true,
      priority: source.priority,
      lastSuccessAt: now,
      lastFailureAt: null,
      lastError: null,
      lastMethod: source.kind,
      createdAt: now,
    };
    if (sourceById.has(source.id)) {
      await db.update(productSources).set(values).where(eq(productSources.id, source.id));
    } else {
      await db.insert(productSources).values(values);
    }
  }

  const existingManufacturers = await db.select().from(manufacturers);
  const manufacturerIds = new Set(existingManufacturers.map((row) => row.id));
  for (const row of seed.manufacturers) {
    if (manufacturerIds.has(row.id)) continue;
    await db.insert(manufacturers).values({
      id: row.id,
      name: row.name,
      slug: row.slug,
      aliases: row.aliases ? JSON.stringify(row.aliases) : null,
      url: row.url ?? null,
    });
  }

  const existingSuppliers = await db.select().from(suppliers);
  const supplierIds = new Set(existingSuppliers.map((row) => row.id));
  for (const row of seed.suppliers) {
    if (supplierIds.has(row.id)) continue;
    await db.insert(suppliers).values({
      id: row.id,
      name: row.name,
      slug: row.slug,
      url: row.url ?? null,
      region: row.region ?? null,
    });
  }

  const sources = await db.select().from(productSources);
  const adapterSources: ProductSourceRow[] = sources.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    identifier: row.identifier,
    enabled: Boolean(row.enabled),
    priority: row.priority,
  }));

  const normalised: NormalisedProduct[] = [];
  for (const source of adapterSources) {
    // Live catalogue adapters stay off the boot/seed path. Ingest them via
    // /api/cron/intelligence-ingest or scripts/intelligence-ingest.ts.
    const result = await runAdapter(source, { manualProducts: seed.products, cwd, allowLive: false });
    if (result.errors.length) {
      await db
        .update(productSources)
        .set({
          lastFailureAt: Date.now(),
          lastError: result.errors.map((error) => error.message).join("; "),
          lastMethod: source.kind,
        })
        .where(eq(productSources.id, source.id));
    } else if (result.products.length) {
      await db
        .update(productSources)
        .set({
          lastSuccessAt: Date.now(),
          lastError: null,
          lastMethod: source.kind,
        })
        .where(eq(productSources.id, source.id));
    }
    normalised.push(...result.products);
  }
  await persistNormalisedProducts(db, normalised);

  const existingSpecialists = await db.select().from(specialists);
  const specialistIds = new Set(existingSpecialists.map((row) => row.id));
  for (const row of seed.specialists) {
    if (!specialistIds.has(row.id)) {
      await db.insert(specialists).values({
        id: row.id,
        name: row.name,
        category: row.category ?? null,
        location: row.location ?? null,
        url: row.url ?? null,
        notes: row.notes ?? null,
        sourceId: row.source_id ?? null,
        createdAt: now,
      });
    }
    for (const marque of row.marques) {
      const model = marque.model ?? "";
      const already = await db
        .select()
        .from(specialistMarques)
        .where(eq(specialistMarques.specialistId, row.id));
      if (already.some((item) => item.make === marque.make && (item.model ?? "") === model)) {
        continue;
      }
      await db.insert(specialistMarques).values({
        specialistId: row.id,
        make: marque.make,
        model,
      });
    }
  }

  const existingMods = await db.select().from(vehicleModifications);
  const modIds = new Set(existingMods.map((row) => row.id));
  for (const row of seed.modifications) {
    if (modIds.has(row.id)) continue;
    await db.insert(vehicleModifications).values({
      id: row.id,
      vehicleId: row.vehicle_id,
      category: row.category,
      productId: row.product_id ?? null,
      manufacturer: row.manufacturer ?? null,
      description: row.description,
      installationDate: null,
      notes: row.notes ?? null,
      createdAt: now,
    });
  }
}
