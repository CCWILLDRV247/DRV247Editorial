# 07 — V1 scope

V1 proves one thing:

> Can DRV247 use what it knows about my car and what I want to do with it to surface genuinely relevant products?

It is not a marketplace. This phase documents the architecture; it does not ship UI or ingest.

Related: [01 Product architecture](01-product-architecture.md) · [03 Recommendation engine](03-recommendation-engine.md) · [08 Technical risks](08-technical-risks.md)

---

## 1. Proof loop (logic, no UI in Phase 01)

```text
1. Select a seeded garage vehicle
2. Choose BUILD or MAINTAIN
3. BUILD:   type + objectives + budget + usage (+ style if set)
   MAINTAIN: component + type (replace / service / specialist) + grade (oem / oem-plus / upgrade)
4. Engine returns a small personalised set
```

That set must be explainable. See [03](03-recommendation-engine.md).

---

## 2. Vehicles in the proof

Use the existing demo garage. Do not invent a second fleet.

| Vehicle id | Car | Owner (demo) |
| --- | --- | --- |
| `veh-964` | Porsche 911 964 Carrera RS | demo-chris |
| `veh-355` | Ferrari F355 | demo-355 |
| `veh-e46` | BMW M3 E46 | demo-m3 |

These already sit in [`lib/engine/seed.ts`](../../lib/engine/seed.ts). Additive spec columns (year, engine, …) may be filled when implementation starts; generation-level fitment is the V1 floor.

---

## 3. Corpus

Curated seed only. `manual` / `csv` adapters. No crawl, no live affiliate firehose.

Enough products to exercise both modes on each car, for example:

- BUILD: exhaust, intake or ECU, suspension, wheels/tyres — with attributes and honest fitment
- MAINTAIN: brake discs/pads, a service item, an exhaust replacement — exact/generation fitment
- A few specialists per marque (Ferrari, Porsche, BMW)

Every seeded product has at least one `vehicle_fitments` row. Critical parts meet the [05](05-fitment-strategy.md) floor.

Quality of the seed **is** the V1 catalogue. Breadth is out of scope.

---

## 4. Result contract

Each recommendation the engine returns:

```text
Product (or specialist)
Image
Name
Manufacturer
Category
Price + currency
Supplier
Fitment label          (honest confidence — see 05)
Why it is relevant     (reason codes → copy)
External link
```

Example (BUILD):

```text
Recommended for your build
Sports exhaust
More character and improved flow while retaining a road-focused setup.

Why we're showing you this
- Fits your vehicle
- Matches Fast Street
- Supports Sound + Performance
- Within your budget

View product
```

No numeric score. No “AI rating”.

---

## 5. In scope (when implementation starts)

- Additive columns on `demo_vehicles`
- `lib/db/intelligence-schema.ts` + taxonomies
- `lib/intelligence/` scorers, fitment matcher, reason copy
- `manual` + `csv` adapters
- Seed corpus for the three cars
- An API or server function that returns the result contract (not the magazine UI)
- BUILD and MAINTAIN as separate objects and pipelines
- `restore` on the intent enum only

---

## 6. Out of scope (this phase and V1)

| Item | Notes |
| --- | --- |
| Final UI / visual design | Architecture only in Phase 01; V1 may expose a raw API or a test page, not the product surface |
| Crawling hundreds of sites | [04](04-source-architecture.md) |
| Marketplace / cart / checkout | Outbound links only |
| Affiliate monetisation | |
| LLM / agents | Deterministic rules |
| Social / community | |
| Ratings and reviews | |
| Workshop booking | |
| Fuzzy product dedup | Exact manufacturer + part number only |
| Real user auth | Demo users |
| Services directory product | A handful of seeded specialists |
| Editorial stories in the result set | Optional later knowledge lane |
| Changing magazine pages, cron, ranking, catalog contents, source CSV | Protect Editorial |

---

## 7. Success criteria

V1 is successful if all of the following are true:

1. **BUILD on F355 / Fast Street / sound + performance / weekend / OEM+ / £5–10k** returns parts a knowledgeable person would accept as relevant, each with readable reasons, and does not lead with a second exhaust if a Capristo is logged.
2. **MAINTAIN on the same car / replace brakes** returns generation-or-better discs/pads, not a show exhaust, and not a 911 pad.
3. A critical part with `model` or `approximate` fitment is **withheld**.
4. Interests on the Modified Desk user do not change MAINTAIN compatibility.
5. Editorial homepage, category, and story pages are unchanged in behaviour.
6. Product ingest cannot run on the editorial cron path.

If the seed is wrong, fix the seed — do not loosen fitment to make the page look full.

---

## 8. Suggested first implementation slices (later)

Not this documentation phase:

1. Schema module + taxonomies + demo_vehicles columns
2. Seed products / fitments / specialists
3. Fitment matcher + safety gate
4. BUILD scorer + reasons
5. MAINTAIN scorer + specialists
6. Thin API for the proof loop

Stop after the API answers the proof question. Do not start the “What do you want to do?” UI until the engine is honest.
