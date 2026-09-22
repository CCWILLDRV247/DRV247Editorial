import type { AdapterResult, NormalisedProduct, ProductSourceRow } from "./types";

export function loadManualProducts(
  source: ProductSourceRow,
  products: NormalisedProduct[],
): AdapterResult {
  const owned = products.filter((product) => product.source_id === source.id);
  return {
    products: owned.map((product) => ({
      ...product,
      source_id: source.id,
      availability: product.availability ?? "unknown",
      currency: product.currency ?? "GBP",
    })),
    errors: [],
  };
}
