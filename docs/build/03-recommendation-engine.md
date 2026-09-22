# 03 — Recommendation engine

Two pipelines, one module. BUILD discovers. MAINTAIN replaces. They share fitment and product reads. They do not share a scorer.

Related: [01 Product architecture](01-product-architecture.md) · [05 Fitment strategy](05-fitment-strategy.md) · [06 Maintenance model](06-maintenance-model.md)

---

## 1. Principles

1. Mode is an input, not a filter on a generic ranker.
2. Fitment is a gate, then a label — never a silent assumption.
3. Explanations are first-class. Internal rank is not shown.
4. No LLM in V1. Weighted rules + reason codes, same operational idea as [`config/ranking.json`](../../config/ranking.json).
5. Do not call `scoreArticle`. Magazine relevance is not product relevance.
6. Interests may boost BUILD. They must not override MAINTAIN compatibility.
7. An empty honest set beats a confident wrong part.

Later code lives in `lib/intelligence/` with weights in `config/intelligence/build-ranking.json` and `config/intelligence/maintain-ranking.json`.

---

## 2. Shared preamble

Both modes run this before scoring:

```text
1. Load vehicle (demo_vehicles + catalog identity)
2. Load existing modifications for that vehicle
3. Load candidate products (and specialists, MAINTAIN)
4. Attach the best VehicleFitment per product for this vehicle
5. Drop / mark by safety class + fitment confidence   → see 05
6. Hand the surviving set to the mode scorer
```

“Best fitment” for a vehicle: highest confidence that still matches the known fields (make, then model, then generation, then year/engine/variant if present). A model-level row must not be preferred over a generation-level row when the garage has a generation.

---

## 3. BUILD pipeline

### 3.1 Inputs

```text
Vehicle
+ Build type
+ Objectives
+ Usage
+ Budget band
+ Style
+ Intensity
+ User interests          (boost only)
+ Existing modifications
+ Product fitment
+ Product attributes
+ Source quality          (product_sources.priority, last_success)
```

Example:

```text
F355 GTB
+ fast-street
+ sound, performance
+ weekend-road
+ oem-plus
+ £5,000–£10,000
```

Candidate families this should be able to surface: exhaust, intake, ECU, suspension, wheels/tyres — if they fit, match the direction, and are not already logged as fitted.

### 3.2 Gates (before score)

| Gate | Fail behaviour |
| --- | --- |
| No usable fitment (`unknown`, or missing make) | Drop |
| Safety-critical and confidence below the class floor | Withhold (see 05) |
| Same category already fitted and objective does not ask for another | Suppress that category; record `already_fitted_suppressed` on the trace |
| `road_use = no` when usage is weekend-road / daily / tour | Drop |
| Price present and above band max | Drop from default set (may appear in an “over budget” debug trace, not V1 UI) |

Suppression example: F355 already has a Capristo exhaust → do not lead with another exhaust; prefer complementary work (geometry, brakes) unless the user set an explicit exhaust objective **and** the notes say they want to change it.

### 3.3 Score (internal only)

Weights are illustrative. Tune in config, not in UI copy.

```text
fitment_exact              40
fitment_generation         28
fitment_model              12
matches_build_type         20
supports_primary_objective 18
supports_secondary_obj     8
usage_compatible           12
style_compatible           10
within_budget              10
source_quality             8
interest_boost             6     -- never enough to beat a fitment miss
already_fitted_category   -40
uncertain_as_fact          n/a   -- cannot reach the scorer
```

Build-type → category affinities (config, not code constants), V1 starters:

| Build type | Lean toward |
| --- | --- |
| Fast Street | Exhaust, intake, ECU, suspension, brakes, tyres |
| GT Cruiser | Exhaust (character), seats, audio, suspension (comfort), lighting |
| Show Car | Wheels, exterior, interior, lighting, stance |
| OEM+ | OEM+ attributed parts; suppress competition-only |
| Track | Brakes, suspension, cooling, tyres, engine |
| Classic Upgrade | Period-correct / classic attributes; lighting, cooling, brakes |
| Restomod | Modern capability with classic identity — ECU, brakes, cooling, seats |
| Stance | Wheels, suspension, ride_height=lower |
| Sound & Feel | Exhaust, intake, seats, steering, engine mounts |
| Custom | Light affinities; lean on objectives |

Objective → attribute matching (examples):

| Objective | Attributes that support it |
| --- | --- |
| More character / better exhaust note | `sound` in {character, loud} |
| More power / torque | `performance_gain` in {modest, significant} |
| Lower ride height / better stance | `ride_height=lower`, `appearance` in {oem-plus, aftermarket, show} |
| Retain originality / OEM spec | `oem_plus=yes` or `appearance=oem`, `classic=yes` |

Usage:

- `weekend-road` / `daily` / `tour` require `road_use` ≠ `no`
- `track-day` boosts `track_use=yes`
- `show` boosts appearance attributes

### 3.4 BUILD output

A ranked list of products (V1: small, curated — quality over breadth). Each item carries reason codes, a fitment label, and `recommendation_confidence`.

Editorial stories are **not** in the V1 BUILD set.

---

## 4. MAINTAIN pipeline

### 4.1 Inputs

```text
Vehicle
+ Maintenance type
+ Component
+ Replacement grade     oem | oem-plus | upgrade   (default oem)
+ Symptom / notes
+ Urgency
+ Mileage (if present)
+ Exact / generation fitment
+ Specification (vehicle + product spec attribute)
+ Availability
+ Source quality
```

Interests, build type, style, and budget taste are **not** inputs. Replacement grade is a job constraint (which quality of part to fetch), not BUILD taste. Price may order a compatible set; it must not admit an incompatible part. Grade must not admit a part that fails fitment.

### 4.2 Priority (strict)

1. Correct vehicle fitment
2. Correct component
3. Correct specification
4. Replacement grade (oem / oem-plus / upgrade)
5. Reliability / quality (manufacturer + source)
6. Availability
7. Price

If (1) or (2) fail, stop. Do not “helpfully” substitute a different component because the user likes Modified content.

### 4.3 Gates

| Gate | Fail behaviour |
| --- | --- |
| Product category / subcategory does not match the component | Drop |
| Fitment below the component’s safety floor | Withhold |
| Spec conflict when both sides are known (e.g. disc diameter) | Drop |
| Replacement grade mismatch (see 4.3a) | Drop |
| `availability = out` | Drop from default set |

### 4.3a Replacement grade

Job input, default `oem`. Classify a product from `replacement_grade` if set, else from `appearance` / `oem_plus` / `competition` / `track_use`.

| Job | Keep | Drop |
| --- | --- | --- |
| `oem` | Factory-spec / `oem` | OEM+ and upgrade (aftermarket, show, competition, `oem_plus=no`) |
| `oem-plus` | OEM and OEM+ | Upgrade (aftermarket, show, competition) |
| `upgrade` | All that still fit | Nothing on grade — still keep OEM |

A matching grade adds `grade_match` and a reason (`oem_replacement` / `oem_plus_replacement` / `upgrade_replacement`). Fitment still wins: an exact OEM disc outranks a generation-only upgrade.

### 4.4 Score (internal only)

```text
fitment_exact              50
fitment_generation         30
correct_component          40
spec_match                 20
authoritative_source       15
grade_match                18
in_stock                   10
price_lower_among_ok        5
```

No interest weights. No build-type weights. `grade_match` cannot beat a fitment miss.

### 4.5 Specialists

After products (or when type is `find-specialist`, or when no safe product survives), attach specialists whose `specialist_marques` match the vehicle make (and model if set) and whose category covers the component.

Specialists get reason codes such as `marque_specialist`, `component_category`. They are not scored with product weights.

---

## 5. Reason codes

Stored on `recommendation_reasons`. UI copy is derived from codes. No raw number.

| Code | Typical label |
| --- | --- |
| `fits_vehicle` | Fits your F355 GTB |
| `fits_generation` | Fits the F355 generation |
| `fitment_model_only` | Listed for Ferrari F355 — generation not confirmed |
| `authoritative_fitment` | Fitment from the manufacturer |
| `matches_build_type` | Matches Fast Street |
| `supports_objective` | Supports Sound + Performance |
| `within_budget` | Within your budget |
| `road_focused` | Suitable for road-focused use |
| `oem_plus_direction` | Compatible with your OEM+ direction |
| `correct_component` | Correct replacement component |
| `oem_replacement` | OEM-spec replacement |
| `oem_plus_replacement` | OEM+ replacement |
| `upgrade_replacement` | Upgrade replacement |
| `spec_match` | Matches the stated specification |
| `available` | Currently available |
| `marque_specialist` | Specialises in Ferrari |
| `already_fitted_suppressed` | Trace only |

Uncertain codes (`fitment_model_only`) must change the visible fitment label. They must not be rewritten as “Fits your car”.

### 5.1 Example card (BUILD)

**Sports exhaust** — More character and improved flow while retaining a road-focused setup.

Why we’re showing you this

- Fits your vehicle
- Matches Fast Street
- Supports Sound + Performance
- Within your budget

View product → supplier URL

Do not print `score: 86`.

---

## 6. Confidence of the recommendation

Separate from fitment confidence.

```text
recommendation_confidence
  high      fitment exact or generation, all gates passed, ≥2 strong reasons
  medium    fitment generation or model (lifestyle only), gates passed
  low       thin reasons or model-level lifestyle fitment
  withheld  safety gate failed — not shown as a recommendation
```

`withheld` rows may be logged for debugging. They are not results.

---

## 7. Existing modifications

For BUILD:

- Same category already fitted → suppress unless the user explicitly targets that category.
- Prefer complementary categories using a small config graph (exhaust fitted → consider suspension, brakes, geometry; suspension fitted → consider alignment, brakes, tyres).

For MAINTAIN:

- A logged modification in that component is context (“you already have a Capristo”) but does not block a replace request. The user said it needs replacing.

---

## 8. Knowledge lane (not V1)

A later pass may attach editorial articles that share make/model/generation via `article_entities`. That is a separate list, scored by the existing magazine ranker if at all. It must not be mixed into product rank or used as fitment evidence by itself.

---

## 9. What V1 must prove

Given one seeded vehicle and one BUILD or MAINTAIN payload, the engine returns a small set of products (and specialists where relevant) whose reasons a person can read and agree with — and withholds anything it cannot stand behind.
