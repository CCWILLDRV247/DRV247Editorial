import fs from "node:fs";
import path from "node:path";
import type { AdapterContext, AdapterResult, NormalisedAttribute, NormalisedFitment, NormalisedProduct, ProductSourceRow } from "./types";

export type Design911Config = {
  supplierName: string;
  supplierId: string;
  baseUrl: string;
  sitemapIndex: string;
  productSitemapPattern: string;
  maxSitemaps: number;
  maxProducts: number;
  userAgent: string;
  locales: string[];
  urlMustInclude: string[];
  productPath: string;
  rejectUrl: string[];
  preferKeywords: string[];
  bucketTargets: Record<string, number>;
};

const DEFAULT_CONFIG: Design911Config = {
  supplierName: "Design 911",
  supplierId: "sup-design911",
  baseUrl: "https://www.design911.co.uk",
  sitemapIndex: "https://www.design911.co.uk/sitemap.xml",
  productSitemapPattern: "sitemap-www-design911-co-uk-(9|1[0-4])\\.xml",
  maxSitemaps: 6,
  maxProducts: 24,
  userAgent: "Mozilla/5.0 (compatible; DRV247-Intelligence/1.0; +https://drv247.com)",
  locales: ["/fr/", "/nl/", "/de/", "/es/", "/it/", "/zh/"],
  urlMustInclude: ["964"],
  productPath: "/p/",
  rejectUrl: [
    "ferrari",
    "f355",
    "bmw",
    "e46",
    "944",
    "968",
    "993",
    "996",
    "997",
    "991",
    "992",
    "928",
    "924",
    "boxster",
    "cayman",
    "cayenne",
    "macan",
    "panamera",
    "356",
    "1965-75",
  ],
  preferKeywords: [
    "exhaust",
    "muffler",
    "silencer",
    "brake",
    "disc",
    "pad",
    "damper",
    "bilstein",
    "coilover",
    "suspension",
    "filter",
    "intake",
    "service-kit",
    "service-kits",
  ],
  bucketTargets: {
    "brake-discs": 3,
    "brake-pads": 3,
    exhaust: 5,
    intake: 3,
    filters: 2,
    suspension: 5,
    service: 2,
  },
};

export function isDesign911Source(source: ProductSourceRow): boolean {
  const haystack = `${source.id} ${source.name} ${source.identifier ?? ""}`.toLowerCase();
  return haystack.includes("design911") || haystack.includes("design-911") || haystack.includes("design 911");
}

export function loadDesign911Config(cwd = process.cwd()): Design911Config {
  const file = path.join(cwd, "config/intelligence/design911.json");
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Design911Config>) };
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

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#10093;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractItemprop(html: string, name: string): string | null {
  const content = html.match(new RegExp(`itemprop=["']${name}["'][^>]*content=["']([^"']+)`, "i"));
  if (content?.[1]) return decodeHtml(content[1]);
  const inner = html.match(new RegExp(`itemprop=["']${name}["'][^>]*>([^<]+)`, "i"));
  if (inner?.[1]) return decodeHtml(inner[1]);
  return null;
}

export function extractImageUrl(html: string, baseUrl: string): string | null {
  const nested = html.match(
    /itemprop=["']image["'][\s\S]{0,400}?itemprop=["']url["'][^>]*content=["']([^"']+)/i,
  );
  if (nested?.[1]) return nested[1].split("?")[0];
  const upload = html.match(/uploads\/products\/[^"' ?]+/i);
  if (upload?.[0]) return `${baseUrl.replace(/\/$/, "")}/${upload[0]}`;
  return null;
}

export function extractAdditionalSkus(html: string): string[] {
  return [...html.matchAll(/Additional SKU[\s\S]{0,240}?itemprop=["']value["'][^>]*content=["']([^"']+)/gi)].map(
    (match) => decodeHtml(match[1]),
  );
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

export function urlBucket(url: string): string {
  const value = url.toLowerCase();
  if (/cover-plate|pad-pin|pin-kit|bolt|nut|washer|gasket|bracket/.test(value)) return "other";
  if (/brake-disc|disc-rotor|brake-rotor/.test(value)) return "brake-discs";
  if (/brake-pad/.test(value)) return "brake-pads";
  if (/exhaust|muffler|silencer/.test(value)) return "exhaust";
  if (/bmc|kandn|k-and-n|vortex|designtek-air/.test(value) && /filter|intake/.test(value)) return "intake";
  if (/air-filter|oil-filter/.test(value)) return "filters";
  if (/coilover|damper|shock|bilstein|suspension|lowering-spring/.test(value)) return "suspension";
  if (/service-kit/.test(value)) return "service";
  return "other";
}

function containsRejectedToken(url: string, token: string): boolean {
  const value = url.toLowerCase();
  const needle = token.toLowerCase();
  if (/^\d+$/.test(needle)) {
    const bounded = new RegExp(`(^|[^0-9])${needle}([^0-9]|$)`);
    return bounded.test(value);
  }
  return value.includes(needle);
}

export function isAllowedDesign911Url(url: string, config: Design911Config): boolean {
  const value = url.toLowerCase();
  if (!value.includes(config.productPath)) return false;
  if (config.locales.some((locale) => value.includes(locale))) return false;
  if (!config.urlMustInclude.every((token) => value.includes(token))) return false;
  if (config.rejectUrl.some((token) => containsRejectedToken(value, token))) return false;
  if (!config.preferKeywords.some((token) => value.includes(token))) return false;
  const turboOnly = /(?:^|[^0-9])965(?:[^0-9]|$)|turbo/.test(value) && !/(c2|c4|carrera|964-rs|\/rs)/.test(value);
  if (turboOnly) return false;
  if (/1965|1966|1967|1968|1969|1970|1971|1972|1973|1974|1975/.test(value) && /caliper/.test(value)) {
    return false;
  }
  if (/cover-plate|pad-pin|pin-kit|(?:^|-)bolt(?:-|$)|(?:^|-)nut(?:-|$)|washer|gasket|bracket/.test(value)) {
    return false;
  }
  return true;
}

export function scoreDesign911Url(url: string, config: Design911Config): number {
  const value = url.toLowerCase();
  let score = 0;
  if (value.includes("porsche-964")) score += 20;
  if (/(c2|c4|carrera|964-rs)/.test(value)) score += 8;
  if (value.includes("964-rs") || value.includes("carrera-rs")) score += 6;
  for (const keyword of config.preferKeywords) {
    if (value.includes(keyword)) score += 4;
  }
  const bucket = urlBucket(url);
  if (bucket !== "other") score += 10;
  return score;
}

export function selectDesign911Urls(urls: string[], config: Design911Config): string[] {
  const unique = [...new Set(urls.filter((url) => isAllowedDesign911Url(url, config)))];
  const ranked = unique
    .map((url) => ({ url, score: scoreDesign911Url(url, config), bucket: urlBucket(url) }))
    .sort((a, b) => b.score - a.score);
  const picked: string[] = [];
  const counts = new Map<string, number>();
  for (const row of ranked) {
    if (picked.length >= config.maxProducts) break;
    const target = config.bucketTargets[row.bucket] ?? 1;
    const used = counts.get(row.bucket) ?? 0;
    if (used >= target) continue;
    picked.push(row.url);
    counts.set(row.bucket, used + 1);
  }
  for (const row of ranked) {
    if (picked.length >= config.maxProducts) break;
    if (picked.includes(row.url)) continue;
    picked.push(row.url);
  }
  return picked.slice(0, config.maxProducts);
}

export function mapDesign911Category(category: string | null, name: string, url: string): {
  category: string;
  subcategory: string | null;
} {
  const haystack = `${category ?? ""} ${name} ${url}`.toLowerCase();
  if (/service kit/.test(haystack)) {
    return { category: "service", subcategory: category };
  }
  if (/cover plate|pad pin|pin kit|bolt|nut|washer|gasket|bracket/.test(haystack)) {
    return { category: "uncategorised", subcategory: category };
  }
  if (/brake disc|brake-disc|disc rotor|brake rotor/.test(haystack)) {
    return { category: "brake-discs", subcategory: category };
  }
  if (/brake pad|brake-pad/.test(haystack)) {
    return { category: "brake-pads", subcategory: category };
  }
  if (/exhaust|muffler|silencer/.test(haystack)) {
    return { category: "exhaust", subcategory: category };
  }
  if (/coilover|shock absorber|damper|suspension|lowering spring/.test(haystack)) {
    return { category: "suspension", subcategory: category };
  }
  if (
    /(bmc|k&n|k and n|vortex|designtek).{0,40}(air filter|intake)|(air filter|intake).{0,40}(bmc|k&n|k and n|vortex|designtek)|performance air filter/.test(
      haystack,
    )
  ) {
    return { category: "intake", subcategory: category };
  }
  if (/air filter|oil filter/.test(haystack)) {
    return { category: "filters", subcategory: category };
  }
  return { category: "uncategorised", subcategory: category };
}

function pushAttribute(rows: NormalisedAttribute[], attribute: string, value: string) {
  if (!rows.some((row) => row.attribute === attribute)) {
    rows.push({ attribute, value });
  }
}

export function inferDesign911Attributes(input: {
  category: string;
  name: string;
  description: string;
  sourceCategory: string | null;
}): NormalisedAttribute[] {
  const haystack = `${input.name} ${input.description} ${input.sourceCategory ?? ""}`.toLowerCase();
  const rows: NormalisedAttribute[] = [];
  if (input.category === "brake-discs" || input.category === "brake-pads" || input.category === "suspension") {
    pushAttribute(rows, "safety_class", "critical");
    pushAttribute(rows, "road_use", "yes");
  }
  if (input.category === "exhaust" || input.category === "intake" || input.category === "service") {
    pushAttribute(rows, "safety_class", "caution");
    pushAttribute(rows, "road_use", "yes");
  }
  if (input.category === "filters") {
    pushAttribute(rows, "appearance", "oem");
    pushAttribute(rows, "replacement_grade", "oem");
    pushAttribute(rows, "road_use", "yes");
  }
  if (input.category === "brake-discs" || input.category === "brake-pads") {
    if (/ebc|pagid|rs14|red stuff|sport|race|track/.test(haystack)) {
      pushAttribute(rows, "appearance", "aftermarket");
      pushAttribute(rows, "replacement_grade", "upgrade");
    } else {
      pushAttribute(rows, "appearance", "oem");
      pushAttribute(rows, "replacement_grade", "oem");
    }
  }
  if (input.category === "exhaust") {
    pushAttribute(rows, "sound", /race|loud/.test(haystack) ? "loud" : "character");
    pushAttribute(rows, "performance_gain", "modest");
    pushAttribute(rows, "appearance", "aftermarket");
  }
  if (input.category === "intake") {
    pushAttribute(rows, "performance_gain", "modest");
    pushAttribute(rows, "appearance", "oem-plus");
    pushAttribute(rows, "oem_plus", "yes");
  }
  if (input.category === "suspension") {
    if (/clubsport|race|track/.test(haystack)) {
      pushAttribute(rows, "ride_height", "track");
      pushAttribute(rows, "track_use", "yes");
      pushAttribute(rows, "appearance", "aftermarket");
      pushAttribute(rows, "replacement_grade", "upgrade");
    } else if (/coilover|lowering/.test(haystack)) {
      pushAttribute(rows, "ride_height", "lower");
      pushAttribute(rows, "appearance", "aftermarket");
      pushAttribute(rows, "replacement_grade", "upgrade");
    } else {
      pushAttribute(rows, "appearance", "oem-plus");
      pushAttribute(rows, "oem_plus", "yes");
      pushAttribute(rows, "replacement_grade", "oem-plus");
    }
  }
  const diameter = haystack.match(/ø\s*:?\s*(\d+)\s*mm|(\d+)\s*mm/);
  if (diameter) {
    pushAttribute(rows, "spec", `${diameter[1] ?? diameter[2]}mm`);
  }
  return rows;
}

export function parseYearRange(text: string): { year_from: number | null; year_to: number | null } {
  const range = text.match(/(19\d{2}|8\d|9\d)\s*[-–\/]\s*(19\d{2}|8\d|9\d)/);
  if (!range) return { year_from: null, year_to: null };
  const expand = (raw: string): number => {
    const value = Number(raw);
    if (value >= 1980 && value <= 1999) return value;
    if (value >= 80 && value <= 99) return 1900 + value;
    return value;
  };
  const year_from = expand(range[1]);
  const year_to = expand(range[2]);
  if (!Number.isFinite(year_from) || !Number.isFinite(year_to)) return { year_from: null, year_to: null };
  return { year_from, year_to };
}

export function rejectDesign911Page(input: {
  name: string;
  description: string;
  category: string | null;
  url: string;
}): string | null {
  const haystack = `${input.name} ${input.description} ${input.category ?? ""} ${input.url}`.toLowerCase();
  if (/\bf355\b|\be46\b/.test(haystack)) return "Out of scope: F355/E46";
  if (/\bferrari\b|\bbmw\b/.test(haystack) && !/\b964\b/.test(haystack)) return "Out of scope: non-Porsche";
  if (!/\b964\b/.test(haystack) || !/porsche/.test(haystack)) return "Not a Porsche 964 listing";
  if (/\b(993|944|968|996|997|991|992)\b/.test(haystack)) {
    return "Mixed chassis listing";
  }
  if (/1965|1966|1967|1968|1969|1970|1971|1972|1973|1974|1975/.test(haystack) && /caliper/.test(haystack)) {
    return "Early 911 caliper kit, not 964";
  }
  return null;
}

export function inferDesign911Fitment(input: {
  name: string;
  description: string;
  category: string | null;
}): NormalisedFitment | null {
  const haystack = `${input.name} ${input.description} ${input.category ?? ""}`;
  if (!/\b964\b/i.test(haystack) || !/porsche/i.test(haystack)) return null;
  const years = parseYearRange(haystack);
  const engine = /\b3\.6\s*l?\b/i.test(haystack) && !/\b3\.3\b/.test(haystack) ? "3.6" : null;
  return {
    make: "Porsche",
    model: "911",
    generation: "964",
    year_from: years.year_from,
    year_to: years.year_to,
    engine,
    variant: null,
    notes: "Supplier listing for 911 (964). Not a manufacturer application file.",
    confidence: "generation",
    source: "supplier",
  };
}

export type ParsedDesign911Page = {
  name: string;
  sku: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  additionalSkus: string[];
};

export function parseDesign911Html(html: string, baseUrl: string): ParsedDesign911Page | null {
  const name = extractItemprop(html, "name");
  if (!name) return null;
  const rawPrice = extractItemprop(html, "price");
  const price = rawPrice ? Number(rawPrice) : null;
  return {
    name,
    sku: extractItemprop(html, "sku"),
    brand: extractItemprop(html, "brand"),
    price: price != null && Number.isFinite(price) && price > 0 ? price : null,
    currency: extractItemprop(html, "priceCurrency") || "GBP",
    category: extractItemprop(html, "category"),
    description: extractItemprop(html, "description"),
    image_url: extractImageUrl(html, baseUrl),
    additionalSkus: extractAdditionalSkus(html),
  };
}

export function normaliseDesign911Product(
  parsed: ParsedDesign911Page,
  url: string,
  source: ProductSourceRow,
  config: Design911Config,
): NormalisedProduct | { error: string } {
  const rejected = rejectDesign911Page({
    name: parsed.name,
    description: parsed.description ?? "",
    category: parsed.category,
    url,
  });
  if (rejected) return { error: rejected };
  const mapped = mapDesign911Category(parsed.category, parsed.name, url);
  if (mapped.category === "uncategorised") return { error: "Unmapped category" };
  const fitment = inferDesign911Fitment({
    name: parsed.name,
    description: parsed.description ?? "",
    category: parsed.category,
  });
  if (!fitment) return { error: "No honest 964 fitment" };
  const sku = parsed.sku;
  const partNumber = sku || parsed.additionalSkus[0] || null;
  const id = `prd-d911-${slugify(sku || url)}`;
  return {
    id,
    source_id: source.id,
    external_id: url,
    sku,
    part_number: partNumber,
    product_name: parsed.name,
    description: parsed.description,
    manufacturer_name: parsed.brand,
    supplier_name: config.supplierName,
    supplier_id: config.supplierId,
    category: mapped.category,
    subcategory: mapped.subcategory,
    price: parsed.price,
    currency: parsed.currency ?? "GBP",
    url,
    image_url: parsed.image_url,
    availability: "unknown",
    attributes: inferDesign911Attributes({
      category: mapped.category,
      name: parsed.name,
      description: parsed.description ?? "",
      sourceCategory: parsed.category,
    }),
    fitments: [fitment],
  };
}

async function fetchText(
  url: string,
  config: Design911Config,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": config.userAgent,
        Accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, status: response.status, message: `HTTP ${response.status} for ${url}` };
    }
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : `Fetch failed for ${url}`,
    };
  }
}

export async function discoverDesign911Urls(
  config: Design911Config,
  fetchImpl: typeof fetch,
): Promise<{ urls: string[]; errors: string[] }> {
  const errors: string[] = [];
  const index = await fetchText(config.sitemapIndex, config, fetchImpl);
  if (!index.ok) return { urls: [], errors: [index.message] };
  const shardPattern = new RegExp(config.productSitemapPattern, "i");
  const shards = extractLocs(index.text).filter((loc) => shardPattern.test(loc)).slice(0, config.maxSitemaps);
  const urls: string[] = [];
  for (const shard of shards) {
    const xml = await fetchText(shard, config, fetchImpl);
    if (!xml.ok) {
      errors.push(xml.message);
      continue;
    }
    urls.push(...extractLocs(xml.text));
  }
  return { urls, errors };
}

export async function loadDesign911Products(
  source: ProductSourceRow,
  context: AdapterContext = {},
): Promise<AdapterResult> {
  const config = loadDesign911Config(context.cwd);
  if (source.identifier) config.sitemapIndex = source.identifier;
  const fetchImpl = context.fetchImpl ?? fetch;
  const discovered = await discoverDesign911Urls(config, fetchImpl);
  const errors: AdapterResult["errors"] = discovered.errors.map((message) => ({
    sourceId: source.id,
    kind: "http" as const,
    message,
  }));
  const selected = selectDesign911Urls(discovered.urls, config);
  const products: NormalisedProduct[] = [];
  for (const url of selected) {
    const page = await fetchText(url, config, fetchImpl);
    if (!page.ok) {
      errors.push({ sourceId: source.id, kind: "http", message: page.message });
      continue;
    }
    const parsed = parseDesign911Html(page.text, config.baseUrl);
    if (!parsed) {
      errors.push({ sourceId: source.id, kind: "parse", message: `No itemprop name on ${url}` });
      continue;
    }
    const normalised = normaliseDesign911Product(parsed, url, source, config);
    if ("error" in normalised) {
      errors.push({ sourceId: source.id, kind: "validation", message: `${normalised.error}: ${url}` });
      continue;
    }
    products.push(normalised);
  }
  return { products, errors };
}
