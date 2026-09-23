import type { AdapterContext, AdapterResult, ProductSourceRow } from "./types";
import { loadCsvProducts } from "./csv";
import { loadDesign911Products, isDesign911Source } from "./design911";
import { loadEurosparesProducts, isEurosparesSource } from "./eurospares";
import { loadManualProducts } from "./manual";

function reserved(source: ProductSourceRow): AdapterResult {
  return {
    products: [],
    errors: [
      {
        sourceId: source.id,
        kind: "validation",
        message: `Adapter kind "${source.kind}" is reserved and not implemented in V1`,
      },
    ],
  };
}

export async function runAdapter(
  source: ProductSourceRow,
  context: AdapterContext = {},
): Promise<AdapterResult> {
  if (!source.enabled) return { products: [], errors: [] };
  if (source.kind === "manual") {
    return loadManualProducts(source, context.manualProducts ?? []);
  }
  if (source.kind === "csv") {
    return loadCsvProducts(source, context.cwd);
  }
  if (source.kind === "sitemap") {
    if (!context.allowLive) return { products: [], errors: [] };
    if (isDesign911Source(source)) {
      return loadDesign911Products(source, context);
    }
    if (isEurosparesSource(source)) {
      return loadEurosparesProducts(source, context);
    }
    return reserved(source);
  }
  return reserved(source);
}

export type { AdapterContext, AdapterResult, NormalisedProduct, ProductSourceRow } from "./types";
