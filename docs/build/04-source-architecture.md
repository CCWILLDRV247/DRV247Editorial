# 04 — Source architecture

Product data enters DRV247 through a source abstraction, then a single normalised schema. Retailer-specific logic stays inside adapters.

Related: [02 Data model](02-data-model.md) · [05 Fitment strategy](05-fitment-strategy.md) · [07 V1 scope](07-v1-scope.md)

---

## 1. Why an abstraction

Editorial already works this way: `media_sources` + [`lib/engine/adapters/`](../../lib/engine/adapters/) (`rss`, `sitemap`, `scrape`) + one `articles` write path.

Product ingest copies the **shape**, not the magazine pipeline.

```text
product_sources row
        │
        v
   adapter (kind)
        │
        v
   normalise → Product + Attributes + Fitment + Manufacturer + Supplier
        │
        v
   intelligence tables
```

Do not sprinkle “if supplier === X” through scoring, UI, or Editorial.

Do not reuse `media_sources` or `articles` for products. Do not share the Monday editorial cron.

---

## 2. Source record

See `product_sources` in [02 Data model](02-data-model.md).

```text
kind: manual | csv | api | feed | rss | xml | sitemap | scrape
```

V1 implements `manual` and `csv` only. The other kinds are reserved so adding a feed later is a new adapter file, not a remodel.

Each source has enablement, priority (source quality), and last-run health — same operational idea as `media_sources`.

---

## 3. Adapter contract

One module per kind, later under `lib/intelligence/adapters/`.

```text
Input:   product_sources row + fetch context
Output:  NormalisedProduct[]
Errors:  structured (http status, parse, validation) — never thrown through Editorial
```

`NormalisedProduct` (adapter output, not a table):

```text
source_id
external_id / sku / part_number     (any that exist)
product_name
description?
manufacturer_name?
supplier_name?
category?
subcategory?
price?
currency?
url?
image_url?
availability?
attributes[]                        { attribute, value }
fitments[]                          { make, model, generation, year_from, year_to,
                                      engine, variant, notes, confidence, source }
```

Adapters may leave fields empty. The writer persists sparse `products` rows.

Rules:

- Adapters do not write Editorial tables.
- Adapters do not invent `confidence: exact` without evidence (see [05](05-fitment-strategy.md)).
- Adapters do not scrape unless that kind is explicitly enabled. V1 does not scrape.
- Image handling stays URL-in, URL-out — same as magazine OG images. No new CDN in V1.

---

## 4. Kinds

| Kind | Role | V1 |
| --- | --- | --- |
| `manual` | Hand-authored seed / admin JSON | **Yes** — primary proof corpus |
| `csv` | Spreadsheet or affiliate-style export mapped by column config | **Yes** — second adapter, even if unused at first |
| `api` | Supplier or manufacturer HTTP API | Later |
| `feed` | Affiliate / product feed (CSV/XML/JSON URL) | Later |
| `rss` | Product-ish RSS (rare; keep for symmetry) | Later |
| `xml` | Sitemap-adjacent or dealer XML | Later |
| `sitemap` | Discover product URLs | Later |
| `scrape` | Controlled HTML extract | Later, never default |

A new supplier is a new `product_sources` row plus, if needed, a mapping file — not a new scorer.

---

## 5. Normalisation

Every source lands on the Product schema in [02](02-data-model.md).

| Concern | Rule |
| --- | --- |
| Names | Store source name as-is on `product_name`. Do not rewrite marketing titles in V1. |
| Manufacturer | Resolve via `manufacturers.slug` + `aliases`. Create if missing (csv/manual). |
| Supplier | Resolve via `suppliers.slug`. One source often implies one supplier. |
| Category | Map through a source-specific dictionary into DRV247 component slugs (`exhaust`, `suspension`, …). Unmapped → `uncategorised` and excluded from scoring until mapped. |
| Price | Store number + currency. Missing price is allowed. |
| Availability | Coerce to `in_stock` \| `limited` \| `unknown` \| `out`. |
| Fitment | Each claim is a `vehicle_fitments` row with an explicit confidence. Make names passed through catalog aliases. |

Editorial `extractEntities` is **not** the product normaliser. Optionally, later, catalog aliases can help parse a free-text “fits 964 / 993” field. That is intelligence code, not a change to [`lib/engine/extract.ts`](../../lib/engine/extract.ts).

---

## 6. Canonicalisation (do not solve perfectly in V1)

Different sources will list the same part:

```text
KW V3 Coilover Kit
KW Variant 3
KW Variant 3 Coilovers
KW V3 Suspension
```

**V1 approach**

1. Keep every source row. Do not merge automatically.
2. `canonical_product_id` is nullable. Leave it null unless a human or an exact key says otherwise.
3. Exact key, when both sides exist: `normalise(manufacturer slug) + normalise(part_number)`.
4. If two rows share that key, point the newer at the older as canonical (or at a chosen winner). Display the canonical name; keep source URLs as offer rows.

**Not in V1**

- Fuzzy title similarity
- LLM clustering
- Silent merge of different part numbers
- Treating “KW V3” without a part number as the same SKU across suppliers

**Later**

- Blocking + scoring (manufacturer + normalised title tokens + category)
- Human review queue for probable duplicates
- Offer model: one canonical product, many supplier rows (today `supplier_id` already sits on `products`, so this is a data shift, not a new concept)

Documented so V1 does not paint us into a “one row per string” corner, and does not pretend dedup is done.

---

## 7. Ingest operations

When implementation starts:

- Separate route, e.g. `app/api/cron/intelligence-ingest` — **not** `app/api/cron/ingest`.
- Hard cap on rows per run (magazine already caps articles per source).
- Same Turso database, different tables. No lock-step with Monday editorial ingest.
- No ingest on boot. Follow the magazine guard in [`lib/db/ensure.ts`](../../lib/db/ensure.ts).
- Seed path: `config/intelligence/seed-products.csv` (or JSON) loaded by intelligence seed, not [`lib/engine/seed.ts`](../../lib/engine/seed.ts).

V1 can load the curated corpus at seed time via `manual` / `csv` and skip cron entirely.

---

## 8. Source quality

`product_sources.priority` and recent success feed the `source_quality` weight in [03](03-recommendation-engine.md).

Suggested V1 priority bands:

| Band | Examples |
| --- | --- |
| 80–100 | Manufacturer catalogue, official fitment |
| 50–79 | Known specialist retailer, structured feed |
| 20–49 | Manual research, mixed confidence |
| 0–19 | Unverified scrape (not used in V1) |

Safety-critical products should prefer sources in the top band. See [05](05-fitment-strategy.md).

---

## 9. What we will not do in V1

- Crawl hundreds of sites
- Affiliate checkout or tracking pixels
- Retailer-specific rank boosts outside `priority`
- Using magazine merch filters as a product catalogue ([`config/merch.ts`](../../config/merch.ts) stays an editorial blocklist)
