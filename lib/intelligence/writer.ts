import { eq, inArray } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  manufacturers,
  productAttributes,
  products,
  recommendationReasons,
  recommendations,
  suppliers,
  vehicleFitments,
} from "@/lib/db/intelligence-schema";
import type { NormalisedProduct } from "./adapters/types";
import { canonicalMake, canonicalModel } from "./identity";

type Db = LibSQLDatabase<Record<string, unknown>>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function exactKey(manufacturerSlug: string | null, partNumber: string | null): string | null {
  if (!manufacturerSlug || !partNumber) return null;
  return `${slugify(manufacturerSlug)}::${slugify(partNumber)}`;
}

export async function deleteProductsForSources(db: Db, sourceIds: string[]) {
  if (!sourceIds.length) return;
  const existing = await db.select({ id: products.id }).from(products).where(inArray(products.sourceId, sourceIds));
  if (!existing.length) return;
  const productIds = existing.map((row) => row.id);
  const existingFitments = await db
    .select({ id: vehicleFitments.id })
    .from(vehicleFitments)
    .where(inArray(vehicleFitments.productId, productIds));
  if (existingFitments.length) {
    const fitmentIds = existingFitments.map((row) => row.id);
    const linked = await db
      .select({ id: recommendations.id })
      .from(recommendations)
      .where(inArray(recommendations.fitmentId, fitmentIds));
    if (linked.length) {
      const recIds = linked.map((row) => row.id);
      await db.delete(recommendationReasons).where(inArray(recommendationReasons.recommendationId, recIds));
      await db.delete(recommendations).where(inArray(recommendations.id, recIds));
    }
    await db.delete(vehicleFitments).where(inArray(vehicleFitments.productId, productIds));
  }
  await db.delete(productAttributes).where(inArray(productAttributes.productId, productIds));
  await db.delete(products).where(inArray(products.id, productIds));
}

export async function persistNormalisedProducts(db: Db, incoming: NormalisedProduct[]) {
  const now = Date.now();
  const manufacturerRows = await db.select().from(manufacturers);
  const supplierRows = await db.select().from(suppliers);
  const existingProducts = await db.select().from(products);
  const manufacturersBySlug = new Map(manufacturerRows.map((row) => [row.slug, row]));
  const suppliersBySlug = new Map(supplierRows.map((row) => [row.slug, row]));
  const byExact = new Map<string, string>();
  for (const row of existingProducts) {
    const manufacturer = manufacturerRows.find((item) => item.id === row.manufacturerId);
    const key = exactKey(manufacturer?.slug ?? null, row.partNumber);
    if (key) byExact.set(key, row.id);
  }

  for (const item of incoming) {
    let manufacturerId = item.manufacturer_id ?? null;
    if (!manufacturerId && item.manufacturer_name) {
      const slug = slugify(item.manufacturer_name);
      const existing = manufacturersBySlug.get(slug);
      if (existing) {
        manufacturerId = existing.id;
      } else {
        manufacturerId = `mfr-${slug}`;
        await db.insert(manufacturers).values({
          id: manufacturerId,
          name: item.manufacturer_name,
          slug,
          aliases: null,
          url: null,
        });
        manufacturersBySlug.set(slug, {
          id: manufacturerId,
          name: item.manufacturer_name,
          slug,
          aliases: null,
          url: null,
        });
      }
    }

    let supplierId = item.supplier_id ?? null;
    if (!supplierId && item.supplier_name) {
      const slug = slugify(item.supplier_name);
      const existing = suppliersBySlug.get(slug);
      if (existing) {
        supplierId = existing.id;
      } else {
        supplierId = `sup-${slug}`;
        await db.insert(suppliers).values({
          id: supplierId,
          name: item.supplier_name,
          slug,
          url: null,
          region: null,
        });
        suppliersBySlug.set(slug, {
          id: supplierId,
          name: item.supplier_name,
          slug,
          url: null,
          region: null,
        });
      }
    }

    const productId = item.id || `prd-${slugify(item.product_name)}-${item.source_id}`;
    const manufacturerSlug =
      manufacturerId != null ? (manufacturersBySlug.get(
        [...manufacturersBySlug.values()].find((row) => row.id === manufacturerId)?.slug ?? "",
      )?.slug ?? null) : null;
    const key = exactKey(manufacturerSlug, item.part_number ?? null);
    let canonicalProductId: string | null = null;
    if (key) {
      const older = byExact.get(key);
      if (older && older !== productId) canonicalProductId = older;
      else byExact.set(key, productId);
    }

    const category = item.category || "uncategorised";
    const existing = existingProducts.find((row) => row.id === productId);
    const values = {
      id: productId,
      sourceId: item.source_id,
      supplierId,
      manufacturerId,
      canonicalProductId,
      productName: item.product_name,
      description: item.description ?? null,
      category,
      subcategory: item.subcategory ?? null,
      price: item.price ?? null,
      currency: item.currency ?? "GBP",
      url: item.url ?? null,
      imageUrl: item.image_url ?? null,
      availability: item.availability ?? "unknown",
      sku: item.sku ?? null,
      partNumber: item.part_number ?? null,
      lastUpdated: now,
      createdAt: existing?.createdAt ?? now,
    };
    if (existing) {
      await db.update(products).set(values).where(eq(products.id, productId));
    } else {
      await db.insert(products).values(values);
      existingProducts.push({ ...values, canonicalProductId });
    }

    await db.delete(productAttributes).where(eq(productAttributes.productId, productId));
    for (const attribute of item.attributes ?? []) {
      await db.insert(productAttributes).values({
        productId,
        attribute: attribute.attribute,
        value: attribute.value,
      });
    }

    const existingFitments = await db
      .select({ id: vehicleFitments.id })
      .from(vehicleFitments)
      .where(eq(vehicleFitments.productId, productId));
    if (existingFitments.length) {
      const fitmentIds = existingFitments.map((row) => row.id);
      const linked = await db
        .select({ id: recommendations.id })
        .from(recommendations)
        .where(inArray(recommendations.fitmentId, fitmentIds));
      if (linked.length) {
        const recIds = linked.map((row) => row.id);
        await db.delete(recommendationReasons).where(inArray(recommendationReasons.recommendationId, recIds));
        await db.delete(recommendations).where(inArray(recommendations.id, recIds));
      }
    }
    await db.delete(vehicleFitments).where(eq(vehicleFitments.productId, productId));
    for (const fitment of item.fitments ?? []) {
      const make = canonicalMake(fitment.make) ?? fitment.make;
      await db.insert(vehicleFitments).values({
        productId,
        make,
        model: fitment.model ? canonicalModel(make, fitment.model) : null,
        generation: fitment.generation ?? null,
        yearFrom: fitment.year_from ?? null,
        yearTo: fitment.year_to ?? null,
        engine: fitment.engine ?? null,
        variant: fitment.variant ?? null,
        notes: fitment.notes ?? null,
        confidence: fitment.confidence,
        source: fitment.source ?? null,
        sourceId: item.source_id,
      });
    }
  }
}
