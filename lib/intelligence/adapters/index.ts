import type { AdapterResult, NormalisedProduct, ProductSourceRow } from "./types";
import { loadCsvProducts } from "./csv";
import { loadManualProducts } from "./manual";

export function runAdapter(
  source: ProductSourceRow,
  context: { manualProducts?: NormalisedProduct[]; cwd?: string },
): AdapterResult {
  if (!source.enabled) return { products: [], errors: [] };
  if (source.kind === "manual") {
    return loadManualProducts(source, context.manualProducts ?? []);
  }
  if (source.kind === "csv") {
    return loadCsvProducts(source, context.cwd);
  }
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

export type { AdapterResult, NormalisedProduct, ProductSourceRow } from "./types";
