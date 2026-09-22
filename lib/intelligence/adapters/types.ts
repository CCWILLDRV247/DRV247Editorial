import type { FitmentConfidence } from "../types";

export type NormalisedAttribute = {
  attribute: string;
  value: string;
};

export type NormalisedFitment = {
  make: string;
  model?: string | null;
  generation?: string | null;
  year_from?: number | null;
  year_to?: number | null;
  engine?: string | null;
  variant?: string | null;
  notes?: string | null;
  confidence: FitmentConfidence;
  source?: string | null;
};

export type NormalisedProduct = {
  id?: string;
  source_id: string;
  external_id?: string | null;
  sku?: string | null;
  part_number?: string | null;
  product_name: string;
  description?: string | null;
  manufacturer_name?: string | null;
  manufacturer_id?: string | null;
  supplier_name?: string | null;
  supplier_id?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | null;
  currency?: string | null;
  url?: string | null;
  image_url?: string | null;
  availability?: string | null;
  attributes?: NormalisedAttribute[];
  fitments?: NormalisedFitment[];
};

export type ProductSourceRow = {
  id: string;
  name: string;
  kind: string;
  identifier: string | null;
  enabled: boolean;
  priority: number;
};

export type AdapterError = {
  sourceId: string;
  kind: "parse" | "validation" | "http";
  message: string;
};

export type AdapterResult = {
  products: NormalisedProduct[];
  errors: AdapterError[];
};
