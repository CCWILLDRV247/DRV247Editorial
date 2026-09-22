# 05 — Fitment strategy

Fitment is a first-class object with an honest confidence. “For Porsche 911” is not compatibility.

Related: [02 Data model](02-data-model.md) · [03 Recommendation engine](03-recommendation-engine.md) · [08 Technical risks](08-technical-risks.md)

---

## 1. Why this is separate

Wrong fitment on brakes, tyres, or suspension is not a bad merchandising miss. The engine defaults to **withhold**, not guess.

`VEHICLE_CATALOG` is a gazetteer (names and aliases). It is not a homologation or ET-file database. It can normalise “nine eleven” → 911. It cannot prove a 964 RS brake disc.

Garage rows today often have only make / model / generation / variant. Year, engine, and registration are additive and may be empty. Confidence must follow **what is actually known**.

---

## 2. Confidence enum

Stored on every `vehicle_fitments` row.

| Value | Meaning | Allowed to say |
| --- | --- | --- |
| `exact` | Make + model + generation, and year and/or engine/variant when the product claim includes them, all match the vehicle | “Fits your {vehicle}” |
| `generation` | Make + model + generation match. Year/engine not claimed or not known on the car | “Fits the {generation} {model}” |
| `model` | Make + model only. Generation not claimed or does not match | “Listed for {make} {model} — generation not confirmed” |
| `approximate` | Inferred, partial, or “most 911s” style claim | “May fit — not confirmed” (lifestyle only) |
| `unknown` | No usable claim | Do not show as a fit |

Rules:

- `approximate` and `unknown` **never** render as confirmed compatibility.
- Do not upgrade confidence because the user is enthusiastic or the part is popular.
- Do not infer `exact` from a title that mentions the marque.
- A product in category “Porsche 911” with no `vehicle_fitments` row is `unknown`.

---

## 3. How a row is classified

Adapters and seed authors set confidence from evidence, not from hope.

| Evidence | Confidence |
| --- | --- |
| Manufacturer application list: 911 (964) 1989–1994, 3.6, matching garage generation (and year if present) | `exact` |
| Manufacturer or specialist: “911 964” / “F355” / “E46 M3”, no year/engine | `generation` |
| “Ferrari F355” / “BMW M3” with no generation | `model` |
| “Most air-cooled 911s”, “M cars”, parsed from prose | `approximate` |
| Missing, conflicting, or only a marque | `unknown` |

`source` on the row records who claimed it: `manufacturer` | `supplier` | `editorial` | `inferred`.

`inferred` cannot be `exact`. `editorial` (a magazine sentence) cannot be `exact`.

When the garage has no generation (unlikely for the three demo cars, possible later), the best possible match is `model` even if the product row is `generation` — compare against known fields only.

---

## 4. Matching a vehicle to a product

Walk known garage fields, tightest first:

```text
1. make
2. model
3. generation
4. year in [year_from, year_to]     if both sides present
5. engine                           if both sides present
6. variant                          if both sides present
```

A product fitment that specifies engine/year the vehicle does **not** have cannot be `exact`. If the vehicle lacks those fields, cap at `generation` (or `model` if generation is also missing).

Multiple fitment rows: take the highest confidence that still matches. Never take a looser row to “help” a safety-critical product onto the page.

Catalog aliases apply to make/model/generation strings only (`F 355` → F355). Aliases do not create year or engine facts.

---

## 5. Safety classes and floors

From `safety_classes` + product / component mapping in [02](02-data-model.md).

| Class | Examples | Minimum fitment to **show** | Minimum `source` |
| --- | --- | --- | --- |
| `critical` | Brakes, suspension, wheels, tyres, engine internals, cooling, fuel, steering, structure | `generation` (prefer `exact`) | `manufacturer` or trusted supplier (source priority ≥ 80) |
| `caution` | Exhaust (emissions/heat), ECU, intake, mounts | `generation` | manufacturer or specialist retailer |
| `lifestyle` | Interior trim, audio, lighting styling, some exterior | `model` allowed; `approximate` only with an explicit “not confirmed” label | any enabled source |

If the floor is not met: `recommendation_confidence = withheld`. No card.

Track-use parts that change chassis or thermal load are `critical` even if sold as “lifestyle upgrades”.

---

## 6. Labels (UI contract, even before UI)

| Confidence | Label pattern |
| --- | --- |
| `exact` | Fits your {year} {make} {model} {variant} |
| `generation` | Fits the {generation} {make} {model} |
| `model` | Listed for {make} {model} — generation not confirmed |
| `approximate` | May fit — not confirmed |
| `unknown` | (not shown) |

Never: “Compatible”, “100% fit”, or a green tick on `model` / `approximate`.

BUILD may still show a `model`-level lifestyle part with the cautious label. MAINTAIN should prefer `exact` / `generation` and withhold `model` on `critical` / `caution` components.

---

## 7. Three confidences

Keep them separate:

```text
fitment_confidence          on vehicle_fitments
source_confidence           derived from product_sources.priority + kind + last_success
recommendation_confidence   on recommendations (high | medium | low | withheld)
```

A high source priority does not upgrade a `model` fitment to `exact`.
A high BUILD score does not upgrade fitment.
`recommendation_confidence` can be `low` or `withheld` even when the product is an excellent match for the build type.

---

## 8. V1 practical bar

The proof corpus is hand-authored for three cars (964, F355, E46). Every seeded product must have at least one `vehicle_fitments` row with an honest confidence. Seed review rejects:

- Marque-only rows marked `exact`
- Critical parts without `generation` or better
- Empty fitment

That discipline matters more than catalogue size. Live feeds later will fail this bar often; the engine must already know how to withhold.
