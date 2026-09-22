# 02 — Data model

Schemas for BUILD + MAINTAIN. V1 uses the existing Drizzle + SQLite/Turso client. New tables live in a new module, not in rewritten Editorial tables.

Related: [01 Product architecture](01-product-architecture.md) · [05 Fitment strategy](05-fitment-strategy.md) · [06 Maintenance model](06-maintenance-model.md)

---

## 1. Placement

| File (later implementation) | Contains |
| --- | --- |
| [`lib/db/schema.ts`](../../lib/db/schema.ts) | Editorial tables. **Do not redefine.** Additive columns on `demo_vehicles` only. |
| `lib/db/intelligence-schema.ts` | All new intelligence tables. Imported by the existing Drizzle client. |
| `config/intelligence/*.json` or seed SQL | Initial taxonomy rows (build types, objectives, components, …). |

IDs: text primary keys for user-facing objects (`bld_…`, `mnt_…`, `prd_…`); integer PKs are fine for taxonomy and join rows. Timestamps: Unix ms integers, same as Editorial.

Currency default: `GBP`.

---

## 2. Vehicle — extend, do not fork

Existing `demo_vehicles` ([`lib/db/schema.ts`](../../lib/db/schema.ts)):

```text
demo_vehicles
  id            text PK
  user_id       text → demo_users.id
  make          text not null
  model         text not null
  generation    text
  variant       text
```

This is the garage. Editorial ranking already reads make / model / generation / variant via `GarageVehicle`. Do not create a second vehicles table.

**Additive columns** (nullable, Editorial-safe):

```text
demo_vehicles (additive)
  year            integer
  engine          text
  fuel            text
  transmission    text
  body            text
  power_bhp       integer
  registration    text
  specification   text          -- free-text / JSON notes; sparse on purpose
```

Identity language (make, model, generation, variant) must stay aligned with [`VEHICLE_CATALOG`](../../lib/engine/catalog.ts). Catalog is a gazetteer: it does not prove engine or year fitment.

Users stay on `demo_users` (`id`, `name`, `location`) plus `demo_user_interests`. No new auth in V1.

---

## 3. Taxonomies

All of these are tables so the UI never hard-codes the lists. Seeded, `enabled`, `sort_order`.

### 3.1 Build types

```text
build_types
  id            integer PK
  slug          text unique        -- fast-street
  name          text               -- Fast Street
  description   text
  sort_order    integer
  enabled       integer boolean
```

Initial slugs: `fast-street`, `gt-cruiser`, `show-car`, `oem-plus`, `track`, `classic-upgrade`, `restomod`, `stance`, `sound-and-feel`, `custom`.

`oem-plus` can be both a build type and a style. That is fine: type is the overall direction; style is the aesthetic constraint on a given Build.

### 3.2 Objectives

```text
objective_categories
  id            integer PK
  slug          text unique        -- performance | sound | handling | braking
                                   -- appearance | comfort | preservation
  name          text
  sort_order    integer
  enabled       integer boolean

objectives
  id            integer PK
  category_id   integer → objective_categories.id
  slug          text unique        -- more-power
  name          text               -- More power
  description   text
  sort_order    integer
  enabled       integer boolean
```

Initial objectives:

| Category | Objectives |
| --- | --- |
| Performance | More power, More torque, Better throttle response, Better acceleration, Lower weight |
| Sound | Better exhaust note, Louder, Deeper, More character, Less restrictive |
| Handling | Sharper handling, Lower ride height, Better cornering, Better steering feel |
| Braking | Better braking, Track braking, Brake feel |
| Appearance | Better stance, New wheels, Exterior styling, Interior styling, Aero, Lighting |
| Comfort | Better seats, Better ride, Better audio, Modern technology |
| Preservation | Retain originality, Period correct, OEM specification |

### 3.3 Usage, budget, style

```text
usage_types
  id, slug, name, sort_order, enabled
  -- weekend-road, daily, track-day, show, tour, mixed

budget_bands
  id, slug, name, currency, min_amount, max_amount, sort_order, enabled
  -- under-1k, 1-3k, 3-5k, 5-10k, 10-25k, 25k-plus
  -- GBP; max_amount null means open-ended

styles
  id, slug, name, description, sort_order, enabled
  -- oem-plus, period-correct, aftermarket, track-focused, show, custom
```

### 3.4 Maintenance taxonomies

```text
maintenance_types
  id, slug, name, sort_order, enabled
  -- replace, service, diagnose, mot-prep, find-specialist

maintenance_components
  id, slug, name, category, safety_class_id, sort_order, enabled
  -- exhaust, brake-discs, brake-pads, battery, clutch, tyres,
  -- suspension, filters, cooling, service, mot
```

### 3.5 Safety classes

```text
safety_classes
  id            integer PK
  slug          text unique        -- critical | caution | lifestyle
  name          text
  withhold_below_fitment  text     -- exact | generation | model
```

Map product categories and maintenance components onto a class. Critical: brakes, suspension, wheels, tyres, engine internals, cooling, fuel, steering, structure. See [05 Fitment strategy](05-fitment-strategy.md).

---

## 4. Build

A Build is a persistent, user-owned object. Many builds per vehicle.

```text
builds
  id                text PK
  user_id           text not null → demo_users.id
  vehicle_id        text not null → demo_vehicles.id
  name              text not null           -- "Fast Street"
  mode              text not null           -- build   (column reserved; always build)
  build_type_id     integer → build_types.id
  usage_id          integer → usage_types.id
  budget_band_id    integer → budget_bands.id
  style_id          integer → styles.id
  intensity         text                    -- light | moderate | full
  status            text not null           -- draft | active | parked | complete
  created_at        integer not null
  updated_at        integer not null

build_objectives
  build_id          text → builds.id
  objective_id      integer → objectives.id
  primary key (build_id, objective_id)
```

Example:

```text
Vehicle:  1997 Ferrari F355 GTB          (demo veh-355 + year/engine when known)
Build:    Fast Street
Type:     fast-street
Objectives: more-character, more-power
Usage:    weekend-road
Style:    oem-plus
Budget:   5-10k
```

`mode` stays on the row so a future RESTORE object can share the persistence pattern without merging into Build. RESTORE does not get tables in V1.

---

## 5. Maintenance request

Do not force maintenance into `builds`.

```text
maintenance_requests
  id                text PK
  user_id           text not null → demo_users.id
  vehicle_id        text not null → demo_vehicles.id
  type_id           integer → maintenance_types.id
  component_id      integer → maintenance_components.id
  symptom           text
  urgency           text                    -- low | soon | urgent
  mileage           integer
  notes             text
  status            text not null           -- open | looking_for_parts
                                            -- looking_for_specialist
                                            -- in_progress | complete | cancelled
  created_at        integer not null
  completed_at      integer
```

Example:

```text
Vehicle:   Ferrari F355 GTB
Type:      replace
Component: brake-discs + brake-pads   (two requests, or notes if bundled)
Status:    looking_for_parts
```

---

## 6. Existing modifications

```text
vehicle_modifications
  id                  text PK
  vehicle_id          text not null → demo_vehicles.id
  category            text not null         -- exhaust | suspension | wheels | ...
  product_id          text → products.id    -- nullable if the part is unknown
  manufacturer        text
  description         text not null         -- "Capristo exhaust"
  installation_date   integer
  notes               text
  created_at          integer not null
```

The engine uses this to suppress “another exhaust” and to steer BUILD toward complementary work (geometry, brakes). See [03 Recommendation engine](03-recommendation-engine.md).

---

## 7. Commerce trio: source, manufacturer, supplier

These are not the same organisation.

```text
product_sources
  id                text PK
  name              text not null
  kind              text not null           -- manual | csv | api | feed
                                            -- rss | xml | sitemap | scrape
  identifier        text                    -- URL, feed path, or file key
  enabled           integer boolean
  priority          integer default 50
  last_success_at   integer
  last_failure_at   integer
  last_error        text
  last_method       text
  created_at        integer not null

manufacturers
  id                text PK
  name              text not null
  slug              text unique
  aliases           text                    -- JSON string array
  url               text

suppliers
  id                text PK
  name              text not null
  slug              text unique
  url               text
  region            text                    -- UK | EU | ...
```

A manufacturer creates the product. A supplier sells it. A source provides the data.

---

## 8. Product

Sparse on purpose. Adapters write only what they have.

```text
products
  id                    text PK
  source_id             text not null → product_sources.id
  supplier_id           text → suppliers.id
  manufacturer_id       text → manufacturers.id
  canonical_product_id  text → products.id     -- nullable; V1 rarely set
  product_name          text not null
  description           text
  category              text                   -- exhaust | suspension | ...
  subcategory           text
  price                 real
  currency              text default 'GBP'
  url                   text
  image_url             text
  availability          text                   -- in_stock | limited | unknown | out
  sku                   text
  part_number           text
  last_updated          integer
  created_at            integer not null

product_attributes
  id            integer PK
  product_id    text not null → products.id
  attribute     text not null
  value         text not null
  unique (product_id, attribute)
```

Do not assume a source fills every column.

### 8.1 Attribute keys (V1 vocabulary)

Stored as rows, not columns, so the list can grow.

| Attribute | Typical values | Used by |
| --- | --- | --- |
| `performance_gain` | none / modest / significant | BUILD |
| `sound` | subtle / character / loud | BUILD |
| `weight` | lighter / similar / heavier | BUILD |
| `comfort` | improved / similar / reduced | BUILD |
| `appearance` | oem / oem-plus / aftermarket / show | BUILD |
| `ride_height` | stock / lower / track | BUILD |
| `material` | stainless / titanium / forged / … | both |
| `installation_difficulty` | bolt-on / workshop / specialist | both |
| `road_use` | yes / caution / no | both |
| `track_use` | yes / caution / no | BUILD |
| `oem_plus` | yes / no | BUILD |
| `competition` | yes / no | BUILD |
| `classic` | yes / no | BUILD |
| `noise` | quiet / moderate / loud | BUILD |
| `warranty` | yes / no / unknown | both |
| `safety_class` | critical / caution / lifestyle | gate |
| `spec` | free text (e.g. 330mm discs, 5x130) | MAINTAIN |

---

## 9. Fitment

First-class. A category of “for Porsche 911” is not enough.

```text
vehicle_fitments
  id              integer PK
  product_id      text not null → products.id
  make            text not null
  model           text
  generation      text
  year_from       integer
  year_to         integer
  engine          text
  variant         text
  notes           text
  confidence      text not null
                  -- exact | generation | model | approximate | unknown
  source          text                    -- manufacturer | supplier | editorial | inferred
  source_id       text → product_sources.id
```

Rules: [05 Fitment strategy](05-fitment-strategy.md). Approximate / unknown must never render as confirmed compatibility.

---

## 10. Specialist

Greenfield. No businesses table exists today.

```text
specialists
  id              text PK
  name            text not null
  category        text                    -- service | restoration | performance | tyres | ...
  location        text
  url             text
  notes           text
  source_id       text → product_sources.id
  created_at      integer not null

specialist_marques
  specialist_id   text → specialists.id
  make            text not null
  model           text                    -- nullable = marque-level
  primary key (specialist_id, make, model)
```

V1 seeds a handful for the three demo cars. This is not a directory product.

---

## 11. Recommendation

```text
recommendations
  id                         text PK
  mode                       text not null        -- build | maintain
  user_id                    text not null → demo_users.id
  vehicle_id                 text not null → demo_vehicles.id
  build_id                   text → builds.id
  maintenance_request_id     text → maintenance_requests.id
  product_id                 text → products.id
  specialist_id              text → specialists.id
  fitment_id                 integer → vehicle_fitments.id
  recommendation_confidence  text not null
                             -- high | medium | low | withheld
  created_at                 integer not null

recommendation_reasons
  id                  integer PK
  recommendation_id   text not null → recommendations.id
  code                text not null
                      -- fits_vehicle | matches_build_type | supports_objective
                      -- within_budget | road_focused | oem_plus_direction
                      -- authoritative_fitment | correct_component
                      -- already_fitted_suppressed  (used in traces, not UI cards)
  label               text not null           -- "Fits your F355 GTB"
  detail              text
  sort_order          integer
```

A recommendation is a product **or** a specialist (one of `product_id` / `specialist_id` set). Internal rank is not stored for display. See [03 Recommendation engine](03-recommendation-engine.md).

---

## 12. Intent enum (no restore tables)

```text
intent: build | maintain | restore
```

`restore` is reserved for the entry point and for API validation. No restore-specific tables in V1.

---

## 13. What changes vs what is new

| Change | When |
| --- | --- |
| Additive nullable columns on `demo_vehicles` | First implementation PR, not this docs phase |
| New `intelligence-schema.ts` imported by the Drizzle client | Same PR |
| Editorial table definitions, queries, pages, cron | **Never** for this work |

---

## 14. Indexing (implementation note)

When tables are created, add:

- `builds (user_id, vehicle_id, status)`
- `maintenance_requests (user_id, vehicle_id, status)`
- `vehicle_modifications (vehicle_id, category)`
- `vehicle_fitments (make, model, generation)`
- `products (manufacturer_id, part_number)`
- `products (canonical_product_id)`
- `product_attributes (product_id, attribute)`
