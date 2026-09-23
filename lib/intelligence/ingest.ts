import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productSources, products } from "@/lib/db/intelligence-schema";
import { runAdapter } from "./adapters";
import type { AdapterResult, NormalisedProduct, ProductSourceRow } from "./adapters/types";
import { deleteProductsForSources, persistNormalisedProducts } from "./writer";

const LIVE_KINDS = new Set(["sitemap", "scrape", "api", "feed", "rss", "xml"]);

export function liveSourceIdsMissingProducts(
  sources: { id: string; enabled: boolean | number; kind: string }[],
  productSourceIds: string[],
): string[] {
  const present = new Set(productSourceIds);
  return sources
    .filter((row) => Boolean(row.enabled) && LIVE_KINDS.has(row.kind) && !present.has(row.id))
    .map((row) => row.id);
}

let liveIngestInflight: Promise<IntelligenceIngestResult> | null = null;

export type IntelligenceIngestResult = {
  pipeline: "intelligence";
  products: number;
  sources: {
    sourceId: string;
    kind: string;
    products: number;
    errors: AdapterResult["errors"];
  }[];
};

export async function ingestIntelligenceSources(options?: {
  sourceIds?: string[];
  cwd?: string;
}): Promise<IntelligenceIngestResult> {
  const db = await getDb();
  const cwd = options?.cwd ?? process.cwd();
  const rows = await db.select().from(productSources);
  const selected = rows.filter((row) => {
    if (!row.enabled) return false;
    if (!LIVE_KINDS.has(row.kind)) return false;
    if (options?.sourceIds?.length) return options.sourceIds.includes(row.id);
    return true;
  });

  const normalised: NormalisedProduct[] = [];
  const sources: IntelligenceIngestResult["sources"] = [];

  for (const row of selected) {
    const source: ProductSourceRow = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      identifier: row.identifier,
      enabled: Boolean(row.enabled),
      priority: row.priority,
    };
    const result = await runAdapter(source, { cwd, allowLive: true });
    if (result.errors.length && !result.products.length) {
      await db
        .update(productSources)
        .set({
          lastFailureAt: Date.now(),
          lastError: result.errors.map((error) => error.message).join("; ").slice(0, 1000),
          lastMethod: source.kind,
        })
        .where(eq(productSources.id, source.id));
    } else {
      await db
        .update(productSources)
        .set({
          lastSuccessAt: Date.now(),
          lastError: result.errors.length
            ? result.errors.map((error) => error.message).join("; ").slice(0, 1000)
            : null,
          lastMethod: source.kind,
        })
        .where(eq(productSources.id, source.id));
    }
    normalised.push(...result.products);
    sources.push({
      sourceId: source.id,
      kind: source.kind,
      products: result.products.length,
      errors: result.errors,
    });
  }

  if (normalised.length) {
    const replaced = [...new Set(normalised.map((item) => item.source_id))];
    await deleteProductsForSources(db, replaced);
    await persistNormalisedProducts(db, normalised);
  }

  return {
    pipeline: "intelligence",
    products: normalised.length,
    sources,
  };
}

export async function missingLiveSourceIds(): Promise<string[]> {
  const db = await getDb();
  const [sourceRows, productRows] = await Promise.all([
    db
      .select({
        id: productSources.id,
        enabled: productSources.enabled,
        kind: productSources.kind,
      })
      .from(productSources),
    db.select({ sourceId: products.sourceId }).from(products),
  ]);
  return liveSourceIdsMissingProducts(
    sourceRows,
    productRows.map((row) => row.sourceId),
  );
}

/**
 * First `/intelligence` or `/api/intelligence` use loads empty live sources
 * (Eurospares, Design 911). Not magazine boot, not the Monday editorial cron.
 */
export async function ensureLiveIntelligenceSources(options?: {
  cwd?: string;
}): Promise<IntelligenceIngestResult | null> {
  const sourceIds = await missingLiveSourceIds();
  if (!sourceIds.length) return null;
  if (!liveIngestInflight) {
    liveIngestInflight = ingestIntelligenceSources({
      sourceIds,
      cwd: options?.cwd,
    }).finally(() => {
      liveIngestInflight = null;
    });
  }
  return liveIngestInflight;
}

export function startLiveIntelligenceIngest(): void {
  void ensureLiveIntelligenceSources();
}
