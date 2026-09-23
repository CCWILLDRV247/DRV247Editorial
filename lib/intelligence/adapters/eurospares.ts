import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";
import type {
  AdapterContext,
  AdapterResult,
  NormalisedAttribute,
  NormalisedFitment,
  NormalisedProduct,
  ProductSourceRow,
} from "./types";

const execFileAsync = promisify(execFile);

export type EurosparesConfig = {
  supplierName: string;
  supplierId: string;
  baseUrl: string;
  sitemapIndex: string;
  diagramSitemapPattern: string;
  maxSitemaps: number;
  maxDiagrams: number;
  maxProducts: number;
  userAgent: string;
  modelPath: string;
  preferKeywords: string[];
  rejectDiagram: string[];
  yearFrom: number;
  yearTo: number;
};

const DEFAULT_CONFIG: EurosparesConfig = {
  supplierName: "Eurospares",
  supplierId: "sup-eurospares",
  baseUrl: "https://www.eurospares.co.uk",
  sitemapIndex: "https://www.eurospares.co.uk/sitemap-gb.xml",
  diagramSitemapPattern: "diagrams-[128]-gb\\.xml\\.gz",
  maxSitemaps: 3,
  maxDiagrams: 6,
  maxProducts: 24,
  userAgent: "Mozilla/5.0 (compatible; DRV247-Intelligence/1.0; +https://drv247.com)",
  modelPath: "/ferrari/355/355-5-2-motronic/",
  preferKeywords: [
    "brake-disc",
    "calipers-for-front-and-rear-brakes",
    "exhaust-system",
    "air-intake",
    "front-suspension-shock-absorber-and-brake-disc",
    "rear-suspension-shock-absorber-and-brake-disc",
  ],
  rejectDiagram: ["challenge", "348", "360", "430", "964", "e46", "porsche", "bmw"],
  yearFrom: 1996,
  yearTo: 1999,
};

const FASTENER = /^(washer|screw|bolt|nut|spacer|pipe|cover|spring|clamp|ring|rosetta|mounting)\b/i;

export function isEurosparesSource(source: ProductSourceRow): boolean {
  const haystack = `${source.id} ${source.name} ${source.identifier ?? ""}`.toLowerCase();
  return haystack.includes("eurospares");
}

export function loadEurosparesConfig(cwd = process.cwd()): EurosparesConfig {
  const file = path.join(cwd, "config/intelligence/eurospares.json");
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(fs.readFileSync(file, "utf8")) as Partial<EurosparesConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

export function cleanEurosparesName(raw: string): string {
  return raw
    .replace(/\\u0022/g, '"')
    .replace(/-?\s*Span Class=.*?\/Span\s*-+\s*/gi, "")
    .replace(/Alternative \(#[^)]+\)\s*-+\s*/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:]+/, "")
    .trim();
}

export function isAllowedEurosparesDiagram(url: string, config: EurosparesConfig): boolean {
  const value = url.toLowerCase();
  if (!value.includes(config.modelPath)) return false;
  if (config.rejectDiagram.some((token) => value.includes(token))) return false;
  return config.preferKeywords.some((token) => value.includes(token));
}

export function selectEurosparesDiagrams(urls: string[], config: EurosparesConfig): string[] {
  const unique = [...new Set(urls.filter((url) => isAllowedEurosparesDiagram(url, config)))];
  const ranked = unique.sort((a, b) => {
    const score = (url: string) => config.preferKeywords.filter((token) => url.includes(token)).length;
    return score(b) - score(a);
  });
  return ranked.slice(0, config.maxDiagrams);
}

export function mapEurosparesCategory(name: string, diagramUrl: string): { category: string; subcategory: string | null } {
  const haystack = `${name} ${diagramUrl}`.toLowerCase();
  if (/brake pad|pad kit|pads set/.test(haystack)) return { category: "brake-pads", subcategory: "brakes" };
  if (/brake disc|brake rotor/.test(haystack)) return { category: "brake-discs", subcategory: "brakes" };
  if (/caliper/.test(haystack)) return { category: "brake-discs", subcategory: "brakes" };
  if (/exhaust|silencer|muffler|manifold/.test(haystack)) return { category: "exhaust", subcategory: "exhaust" };
  if (/air filter|air intake|throttle/.test(haystack)) return { category: "intake", subcategory: "intake" };
  if (/oil filter|service/.test(haystack)) return { category: "filters", subcategory: "service" };
  if (/suspension|shock absorber|wishbone|damper/.test(haystack)) return { category: "suspension", subcategory: "suspension" };
  return { category: "uncategorised", subcategory: null };
}

function pushAttribute(rows: NormalisedAttribute[], attribute: string, value: string) {
  if (!rows.some((row) => row.attribute === attribute)) rows.push({ attribute, value });
}

export function inferEurosparesAttributes(category: string, name: string): NormalisedAttribute[] {
  const haystack = name.toLowerCase();
  const rows: NormalisedAttribute[] = [];
  if (category === "brake-discs" || category === "brake-pads" || category === "suspension") {
    pushAttribute(rows, "safety_class", "critical");
    pushAttribute(rows, "road_use", "yes");
  }
  if (category === "exhaust" || category === "intake" || category === "filters") {
    pushAttribute(rows, "safety_class", "caution");
    pushAttribute(rows, "road_use", "yes");
  }
  if (/racing|fiorano|challenge|track/.test(haystack)) {
    pushAttribute(rows, "appearance", "aftermarket");
    pushAttribute(rows, "replacement_grade", "upgrade");
    pushAttribute(rows, "track_use", "yes");
  } else if (category === "exhaust") {
    pushAttribute(rows, "sound", "character");
    pushAttribute(rows, "performance_gain", "modest");
    pushAttribute(rows, "appearance", "oem");
    pushAttribute(rows, "replacement_grade", "oem");
  } else if (category === "intake") {
    pushAttribute(rows, "appearance", "oem");
    pushAttribute(rows, "oem_plus", "yes");
    pushAttribute(rows, "replacement_grade", "oem");
  } else {
    pushAttribute(rows, "appearance", "oem");
    pushAttribute(rows, "replacement_grade", "oem");
  }
  const size = haystack.match(/(\d{3})\s*mm/);
  if (size) pushAttribute(rows, "spec", `${size[1]}mm`);
  return rows;
}

export function rejectEurosparesProduct(input: { name: string; url: string; manufacturer?: string | null }): string | null {
  const haystack = `${input.name} ${input.url} ${input.manufacturer ?? ""}`.toLowerCase();
  if (/\b964\b|\be46\b/.test(haystack)) return "Out of scope: 964/E46";
  if (/\bporsche\b|\bbmw\b/.test(haystack)) return "Out of scope: non-Ferrari";
  if (/\bmaserati\b/.test(haystack) && !/\bferrari\b/.test(haystack)) return "Out of scope: non-Ferrari";
  if (/\b348\b/.test(haystack) && !/\bf355\b|\b355\b/.test(haystack)) return "Wrong Ferrari generation";
  if (FASTENER.test(input.name)) return "Fastener, not a recommendable part";
  if (!/ferrari|f355|\b355\b|brembo|exhaust|silencer|brake|pad|disc|caliper|intake|filter|suspension|shock/i.test(haystack)) {
    return "Not an F355-relevant part";
  }
  return null;
}

export function inferEurosparesFitment(config: EurosparesConfig): NormalisedFitment {
  return {
    make: "Ferrari",
    model: "F355",
    generation: "F355",
    year_from: config.yearFrom,
    year_to: config.yearTo,
    engine: null,
    variant: null,
    notes: "Supplier parts diagram for Ferrari 355 5.2 Motronic. Not a manufacturer application file.",
    confidence: "generation",
    source: "supplier",
  };
}

type JsonLdProduct = {
  name?: string;
  mpn?: string;
  description?: string;
  image?: string;
  manufacturer?: { name?: string } | string;
  offers?: { price?: string | number; priceCurrency?: string };
  isAccessoryOrSparePartFor?: { brand?: { name?: string } };
  "@id"?: string;
};

export function parseEurosparesJsonLd(html: string): JsonLdProduct[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1],
  );
  const products: JsonLdProduct[] = [];
  const seen = new Set<string>();
  for (const raw of blocks) {
    try {
      const data = JSON.parse(raw) as JsonLdProduct & { "@type"?: string };
      if (data["@type"] !== "Product" || !data.name || !data.mpn) continue;
      if (seen.has(data.mpn)) continue;
      seen.add(data.mpn);
      products.push(data);
    } catch {
      // skip malformed JSON-LD
    }
  }
  return products;
}

export function normaliseEurosparesProduct(
  parsed: JsonLdProduct,
  diagramUrl: string,
  source: ProductSourceRow,
  config: EurosparesConfig,
): NormalisedProduct | { error: string } {
  const name = cleanEurosparesName(parsed.name ?? "");
  if (!name) return { error: "Missing name" };
  const url = `${config.baseUrl}/parts/${parsed.mpn}/ferrari`;
  const manufacturer =
    typeof parsed.manufacturer === "string" ? parsed.manufacturer : parsed.manufacturer?.name ?? "Ferrari";
  const rejected = rejectEurosparesProduct({ name, url, manufacturer });
  if (rejected) return { error: rejected };
  const mapped = mapEurosparesCategory(name, diagramUrl);
  if (mapped.category === "uncategorised") return { error: "Unmapped category" };
  const priceRaw = parsed.offers?.price;
  const price = priceRaw != null ? Number(priceRaw) : null;
  const image = parsed.image && /productphotos/i.test(parsed.image) ? parsed.image : parsed.image ?? null;
  return {
    id: `prd-euro-${slugify(parsed.mpn ?? name)}`,
    source_id: source.id,
    external_id: url,
    sku: parsed.mpn ?? null,
    part_number: parsed.mpn ?? null,
    product_name: name,
    description: parsed.description ? cleanEurosparesName(parsed.description) : null,
    manufacturer_name: manufacturer,
    supplier_name: config.supplierName,
    supplier_id: config.supplierId,
    category: mapped.category,
    subcategory: mapped.subcategory,
    price: price != null && Number.isFinite(price) && price > 0 ? price : null,
    currency: parsed.offers?.priceCurrency || "GBP",
    url,
    image_url: image,
    availability: "unknown",
    attributes: inferEurosparesAttributes(mapped.category, name),
    fitments: [inferEurosparesFitment(config)],
  };
}

function pickBucketed(products: NormalisedProduct[], config: EurosparesConfig): NormalisedProduct[] {
  const targets: Record<string, number> = {
    "brake-discs": 4,
    "brake-pads": 4,
    exhaust: 6,
    intake: 3,
    suspension: 4,
    filters: 2,
  };
  const ranked = [...products];
  const picked: NormalisedProduct[] = [];
  const counts = new Map<string, number>();
  for (const product of ranked) {
    if (picked.length >= config.maxProducts) break;
    const bucket = product.category ?? "other";
    const used = counts.get(bucket) ?? 0;
    if (used >= (targets[bucket] ?? 2)) continue;
    picked.push(product);
    counts.set(bucket, used + 1);
  }
  for (const product of ranked) {
    if (picked.length >= config.maxProducts) break;
    if (!picked.includes(product)) picked.push(product);
  }
  return picked.slice(0, config.maxProducts);
}

async function fetchBytes(url: string, config: EurosparesConfig, fetchImpl: typeof fetch): Promise<Buffer> {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": config.userAgent, Accept: "application/gzip,application/xml,text/html,*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function maybeGunzip(buf: Buffer): string {
  if (buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf).toString("utf8");
  return buf.toString("utf8");
}

async function fetchHtmlWithChrome(url: string): Promise<string> {
  const chrome = ["/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((bin) =>
    fs.existsSync(bin),
  );
  if (!chrome) throw new Error("Chrome is required to read Eurospares HTML behind Sucuri");
  const profile = path.join(os.tmpdir(), "drv247-eurospares-chrome");
  const { stdout } = await execFileAsync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      "--dump-dom",
      url,
    ],
    { timeout: 45000, maxBuffer: 12 * 1024 * 1024 },
  );
  if (!stdout.includes("application/ld+json") && /You are being redirected/i.test(stdout)) {
    throw new Error(`Sucuri challenge still present for ${url}`);
  }
  return stdout;
}

export async function discoverEurosparesDiagrams(
  config: EurosparesConfig,
  fetchImpl: typeof fetch,
): Promise<{ urls: string[]; errors: string[] }> {
  const errors: string[] = [];
  let indexXml: string;
  try {
    indexXml = maybeGunzip(await fetchBytes(config.sitemapIndex, config, fetchImpl));
  } catch (error) {
    return { urls: [], errors: [error instanceof Error ? error.message : "Sitemap index failed"] };
  }
  const shardPattern = new RegExp(config.diagramSitemapPattern, "i");
  const shards = extractLocs(indexXml).filter((loc) => shardPattern.test(loc)).slice(0, config.maxSitemaps);
  const urls: string[] = [];
  for (const shard of shards) {
    try {
      const xml = maybeGunzip(await fetchBytes(shard, config, fetchImpl));
      urls.push(...extractLocs(xml));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed ${shard}`);
    }
  }
  return { urls, errors };
}

export async function loadEurosparesProducts(
  source: ProductSourceRow,
  context: AdapterContext = {},
): Promise<AdapterResult> {
  const config = loadEurosparesConfig(context.cwd);
  if (source.identifier) config.sitemapIndex = source.identifier;
  const fetchImpl = context.fetchImpl ?? fetch;
  const discovered = await discoverEurosparesDiagrams(config, fetchImpl);
  const errors: AdapterResult["errors"] = discovered.errors.map((message) => ({
    sourceId: source.id,
    kind: "http" as const,
    message,
  }));
  const selected = selectEurosparesDiagrams(discovered.urls, config);
  const incoming: NormalisedProduct[] = [];
  for (const diagramUrl of selected) {
    let html: string;
    try {
      const direct = await fetchImpl(diagramUrl, {
        headers: { "User-Agent": config.userAgent, Accept: "text/html" },
      });
      const text = await direct.text();
      html = /application\/ld\+json/.test(text) ? text : await fetchHtmlWithChrome(diagramUrl);
    } catch (error) {
      errors.push({
        sourceId: source.id,
        kind: "http",
        message: error instanceof Error ? error.message : `Failed ${diagramUrl}`,
      });
      continue;
    }
    const parsed = parseEurosparesJsonLd(html);
    if (!parsed.length) {
      errors.push({ sourceId: source.id, kind: "parse", message: `No JSON-LD products on ${diagramUrl}` });
      continue;
    }
    for (const item of parsed) {
      const normalised = normaliseEurosparesProduct(item, diagramUrl, source, config);
      if ("error" in normalised) {
        errors.push({ sourceId: source.id, kind: "validation", message: `${normalised.error}: ${item.mpn}` });
        continue;
      }
      incoming.push(normalised);
    }
  }
  return { products: pickBucketed(incoming, config), errors };
}
