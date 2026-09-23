import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productSources } from "@/lib/db/intelligence-schema";
import { runAdapter } from "./adapters";
import type { AdapterResult, NormalisedProduct, ProductSourceRow } from "./adapters/types";
import { persistNormalisedProducts } from "./writer";

const LIVE_KINDS = new Set(["sitemap", "scrape", "api", "feed", "rss", "xml"]);

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
    await persistNormalisedProducts(db, normalised);
  }

  return {
    pipeline: "intelligence",
    products: normalised.length,
    sources,
  };
}
