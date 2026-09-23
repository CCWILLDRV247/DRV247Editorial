# 08 — Technical risks

Risks that can make BUILD + MAINTAIN wrong, unsafe, or harmful to Editorial — and how we contain them.

Related: [01 Product architecture](01-product-architecture.md) · [05 Fitment strategy](05-fitment-strategy.md) · [07 V1 scope](07-v1-scope.md)

---

## 1. Risks

### 1.1 The garage is not a spec record

`demo_vehicles` today has make, model, generation, variant only. No year, engine, registration, or power.

**Impact:** Fitment finer than generation is weak. `exact` will be rare until columns exist and are populated.

**Mitigation:** Additive nullable columns ([02](02-data-model.md)). Cap confidence by known fields ([05](05-fitment-strategy.md)). V1 success is generation-honest, not homologation-perfect.

### 1.2 The catalog is a gazetteer

[`VEHICLE_CATALOG`](../../lib/engine/catalog.ts) knows names and aliases. It does not know engines, VIN rules, or bolt patterns.

**Impact:** Using it as a parts bible will mint false `exact` rows.

**Mitigation:** Import for identity language only. Never upgrade fitment from an alias match. Do not edit catalog contents for intelligence features.

### 1.3 No product, supplier, or specialist data

Nothing in this repo is a commerce graph. V1 quality equals seed quality. The first live feed will expose missing attributes, bad categories, and optimistic fitment.

**Impact:** A thin or sloppy seed “proves” nothing. A feed without a withhold path will ship unsafe cards.

**Mitigation:** Small, reviewed seed for three cars ([07](07-v1-scope.md)). Adapters cannot emit `exact` without evidence ([04](04-source-architecture.md)). Safety floors withhold ([05](05-fitment-strategy.md)).

### 1.4 Shared Turso database with Editorial

Intelligence tables will live in the same SQLite/Turso file as `articles`.

**Impact:** Heavy product ingest can lock or bloat magazine reads. A bad migration can break the live desk.

**Mitigation:** New schema module only; do not rewrite Editorial tables. Separate cron path; no ingest on boot. Row caps per run. Additive `demo_vehicles` columns only. Never put products in `articles`.

### 1.5 Safety-critical advice

Wrong discs, tyres, or coilover applications are worse than an empty list.

**Impact:** Legal and physical harm; trust loss.

**Mitigation:** Safety classes and fitment floors. Default withhold. No taste override on MAINTAIN. No inferred `exact`. Source priority ≥ 80 for critical parts. Do not display `approximate` as a tick.

### 1.6 Deduplication

KW V3 will appear under four titles the moment a second source exists.

**Impact:** Duplicate cards, or a silent merge of different SKUs.

**Mitigation:** V1 does not fuzzy-merge. Optional `canonical_product_id` on exact manufacturer + part number only ([04](04-source-architecture.md)). Display duplicates rather than guess.

### 1.7 No search engine, no LLM

Search is in-memory `includes` on article titles. `ai_summary` is scraped HTML, not a model. There is no embedding index.

**Impact:** Temptation to bolt on an agent or “just embed the catalogue” to skip fitment work.

**Mitigation:** V1 is deterministic rules and reason codes. Knowledge lane (editorial) is later and separate. Do not use magazine search for products.

### 1.8 No real auth

Public identity is three `demo_users`. Admin is a SHA-256 cookie.

**Impact:** A future Clerk/NextAuth user table can fork vehicles if someone “starts clean”.

**Mitigation:** Treat `demo_vehicles` as the garage identity. When auth arrives, map users onto the same vehicle rows. Do not create `vehicles_v2`.

### 1.9 Mode collapse

One “recommendations” table fed by a single ranker will merge “better exhaust” and “failed exhaust”.

**Impact:** The product distinction dies in the first abstraction shortcut.

**Mitigation:** Separate `builds` and `maintenance_requests`. Separate scorers and weight files. Shared reads only (products, fitment, mods).

### 1.10 Editorial regression

Shared files (`schema.ts`, seed, DB client, `ensure.ts`) are easy to “just touch”.

**Impact:** Homepage, For You, ingest, or cron break.

**Mitigation:** Isolation rules in [01](01-product-architecture.md). Do not modify `lib/engine/*` behaviour, public magazine pages, editorial cron, source CSV, merch, or `vercel.json`. Intelligence seed is a different module from [`lib/engine/seed.ts`](../../lib/engine/seed.ts).

---

## 2. Assumptions to validate

| Assumption | If wrong |
| --- | --- |
| This Editorial repo is the only DRV247 codebase. V1 ships here as an isolated module. | Keep the data model portable; do not bind intelligence to magazine page components. |
| “Existing users / vehicles / services” means demo garage + gazetteer. Specialists are greenfield. | If another app owns garage or a directory, integrate rather than fork. |
| V1 may use a curated seed instead of live feeds. | Scope and [04](04-source-architecture.md) still hold; only the first adapter changes. |
| Specialists in V1 are a handful of rows, not a directory product. | Do not build search/map/booking. |
| V1 results are products (+ specialists), not magazine stories. | Knowledge lane stays optional and unmixed. |
| Currency GBP; budget bands are taxonomy rows. | Add currency on the band if we leave the UK. |
| Phase 01 does not implement UI or application code. | Implementation starts only after these docs are accepted. |

---

## 3. Summary (Phase 01)

1. **Reuse:** vehicle gazetteer, demo garage, interest taxonomy, ranking *pattern*, source/adapter *pattern*, Drizzle/Turso/Vercel, confidence-as-a-field.
2. **Create:** Build, MaintenanceRequest, Product, attributes, Fitment, Supplier, Manufacturer, Source, modifications, Specialist, Recommendation + reasons, taxonomies, isolated module paths.
3. **Change later:** additive columns on `demo_vehicles`; import a new schema module.
4. **Do not change:** Editorial engine, pages, cron, catalog contents, source CSV, merch, v1 stories, and the BUILD/MAINTAIN split.
5. **V1 architecture:** sibling module; two pipelines; deterministic scores; honest fitment; curated seed for 964 / F355 / E46.
6. **Biggest risks:** false fitment, seed quality, shared DB, mode collapse, Editorial regression.
7. **Validate:** single codebase, seed-not-feeds, specialists-as-stubs, no UI this phase.

Protect the magazine. Withhold when unsure. Do not rush screens.
