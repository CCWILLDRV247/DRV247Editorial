import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FitmentConfidence } from "../types";
import type { AdapterResult, NormalisedAttribute, NormalisedProduct, ProductSourceRow } from "./types";

const CATEGORY_MAP: Record<string, string> = {
  exhaust: "exhaust",
  intake: "intake",
  ecu: "ecu",
  suspension: "suspension",
  wheels: "wheels",
  tyres: "tyres",
  "brake-discs": "brake-discs",
  "brake-pads": "brake-pads",
  brakes: "brake-discs",
  filters: "filters",
  cooling: "cooling",
  service: "service",
};

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || (char === "\r" && next === "\n")) {
      if (char === "\r") i += 1;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function parseAttributes(raw: string): NormalisedAttribute[] {
  if (!raw.trim()) return [];
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [attribute, ...rest] = part.split("=");
      return { attribute: attribute.trim(), value: rest.join("=").trim() };
    })
    .filter((row) => row.attribute && row.value);
}

function coerceAvailability(value: string | undefined): string | null {
  const raw = (value ?? "").toLowerCase();
  if (raw === "in_stock" || raw === "limited" || raw === "unknown" || raw === "out") return raw;
  if (!raw) return "unknown";
  return "unknown";
}

function coerceConfidence(value: string | undefined): FitmentConfidence {
  if (
    value === "exact" ||
    value === "generation" ||
    value === "model" ||
    value === "approximate" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function optionalInt(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseProductCsv(text: string, source: ProductSourceRow): AdapterResult {
  const rows = splitCsvRows(text);
  if (rows.length < 2) return { products: [], errors: [] };
  const header = rows[0].map((cell) => cell.trim());
  const products: NormalisedProduct[] = [];
  const errors: AdapterResult["errors"] = [];

  for (const cells of rows.slice(1)) {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    const name = record.product_name?.trim();
    if (!name) {
      errors.push({ sourceId: source.id, kind: "validation", message: "Missing product_name" });
      continue;
    }
    const mappedCategory = record.category
      ? (CATEGORY_MAP[record.category.trim().toLowerCase()] ?? "uncategorised")
      : "uncategorised";
    products.push({
      id: record.id || undefined,
      source_id: record.source_id || source.id,
      sku: record.sku || null,
      part_number: record.part_number || null,
      product_name: name,
      description: record.description || null,
      manufacturer_name: record.manufacturer_name || null,
      supplier_name: record.supplier_name || null,
      category: mappedCategory,
      price: record.price ? Number(record.price) : null,
      currency: record.currency || "GBP",
      url: record.url || null,
      image_url: record.image_url || null,
      availability: coerceAvailability(record.availability),
      attributes: parseAttributes(record.attributes ?? ""),
      fitments: record.make
        ? [
            {
              make: record.make,
              model: record.model || null,
              generation: record.generation || null,
              year_from: optionalInt(record.year_from),
              year_to: optionalInt(record.year_to),
              engine: record.engine || null,
              variant: record.variant || null,
              confidence: coerceConfidence(record.fitment_confidence),
              source: record.fitment_source || "supplier",
            },
          ]
        : [],
    });
  }

  return { products, errors };
}

const SEED_PRODUCTS_CSV = "config/intelligence/seed-products.csv";
const BUNDLED_SEED_PRODUCTS_CSV = fileURLToPath(new URL(`../../../${SEED_PRODUCTS_CSV}`, import.meta.url));

function resolveCsvFile(identifier: string, cwd: string): string {
  if (path.isAbsolute(identifier)) return identifier;
  if (identifier.replace(/\\/g, "/") === SEED_PRODUCTS_CSV && fs.existsSync(BUNDLED_SEED_PRODUCTS_CSV)) {
    return BUNDLED_SEED_PRODUCTS_CSV;
  }
  return path.join(cwd, identifier);
}

export function loadCsvProducts(source: ProductSourceRow, cwd = process.cwd()): AdapterResult {
  if (!source.identifier) {
    return { products: [], errors: [{ sourceId: source.id, kind: "validation", message: "No CSV path" }] };
  }
  const file = resolveCsvFile(source.identifier, cwd);
  try {
    return parseProductCsv(fs.readFileSync(file, "utf8"), source);
  } catch (error) {
    return {
      products: [],
      errors: [
        {
          sourceId: source.id,
          kind: "parse",
          message: error instanceof Error ? error.message : "CSV read failed",
        },
      ],
    };
  }
}
