# 06 — Maintenance model

MAINTAIN is a job, not a build. It answers “what does my car need?” — keep it working, safe, and legal.

Related: [02 Data model](02-data-model.md) · [03 Recommendation engine](03-recommendation-engine.md) · [05 Fitment strategy](05-fitment-strategy.md)

---

## 1. Why this is not a Build

| | BUILD | MAINTAIN |
| --- | --- | --- |
| Question | What could I do with my car? | What does my car need? |
| Object | `builds` | `maintenance_requests` |
| Tone | Discovery | Replacement / diagnosis / care |
| Taste (interests, style) | May steer | Must not override fitment |
| Success | Relevant directions | Correct part or the right specialist |

The same physical component can appear in both worlds:

```text
“I want a better exhaust.”     → Build objective (sound / performance)
“My exhaust needs replacing.”  → Maintenance request (component: exhaust, type: replace)
```

Forcing the second into a Fast Street build would let OEM+ taste hide the right OEM disc or send a show exhaust at a failed MOT.

---

## 2. The job object

`maintenance_requests` — see [02](02-data-model.md).

```text
user + vehicle
type            replace | service | diagnose | mot-prep | find-specialist
component       exhaust | brake-discs | brake-pads | ...
symptom         optional free text
urgency         low | soon | urgent
mileage         optional
notes
status          open → looking_for_parts | looking_for_specialist
                → in_progress → complete | cancelled
```

Examples:

```text
Vehicle:   Ferrari F355 GTB
Type:      replace
Component: brake-discs, brake-pads
Status:    looking_for_parts
```

```text
Vehicle:   BMW M3 E46
Type:      replace
Component: exhaust
Status:    looking_for_parts
```

```text
Vehicle:   Porsche 911 964
Type:      find-specialist
Component: service
Urgency:   soon
```

A user can have many open requests on one car. Completing a request does not create or close a Build.

---

## 3. Component taxonomy (initial)

Extensible rows, not UI constants. `safety_class` travels with the component.

| Slug | Name | Class | Typical type |
| --- | --- | --- | --- |
| `brake-discs` | Brake discs | critical | replace |
| `brake-pads` | Brake pads | critical | replace |
| `tyres` | Tyres | critical | replace |
| `suspension` | Suspension components | critical | replace |
| `steering` | Steering | critical | replace / diagnose |
| `cooling` | Cooling system | critical | replace / diagnose |
| `clutch` | Clutch | caution | replace |
| `exhaust` | Exhaust | caution | replace |
| `battery` | Battery | caution | replace |
| `filters` | Filters | lifestyle | service / replace |
| `service` | Service | caution | service |
| `mot` | MOT preparation | caution | mot-prep |
| `engine` | Engine (general) | critical | diagnose |
| `other` | Other | caution | diagnose |

Add rows rather than encoding new components in the scorer.

---

## 4. Types

| Type | Engine does |
| --- | --- |
| `replace` | Compatible replacement products for the component |
| `service` | Service items (filters, fluids if seeded) + specialists |
| `diagnose` | Specialists first; products only if the component is already known |
| `mot-prep` | Common MOT-related replacements if seeded + specialists |
| `find-specialist` | Specialists only |

V1 does not implement a diagnostic graph. `symptom` is stored for later and may be shown to a specialist; it does not invent a component.

---

## 5. Scoring contract

Full weights: [03 Recommendation engine](03-recommendation-engine.md).

Order is fixed:

1. Correct vehicle fitment
2. Correct component
3. Correct specification
4. Reliability / quality
5. Availability
6. Price

Interests, build type, style, and “Fast Street” energy are not inputs.

Fitment floors for MAINTAIN are at least as strict as BUILD, and stricter on `critical` / `caution`: `model` is not enough. See [05](05-fitment-strategy.md).

Specification: when the vehicle or notes state a size (disc diameter, tyre size, battery type) and the product has a `spec` attribute, a conflict drops the product. Unknown spec is allowed; do not fabricate a match.

---

## 6. Specialists

No services directory exists in this repo. V1 seeds a few marque-relevant specialists.

Show specialists when:

- type is `find-specialist` or `diagnose`, or
- no safe product survives, or
- the component is typically workshop work (service, cooling, clutch)

A specialist result uses `marque_specialist` / `component_category` reasons and an outbound URL. No booking flow.

---

## 7. Relationship to modifications and builds

- A logged `vehicle_modifications` row for the same component is **context**, not a block. The user said it needs replacing.
- An active Build on the same car must not rewrite this request into discovery mode.
- Completing a replace request may later suggest adding a modification (“log this part as fitted”). That is a follow-up, not V1.

---

## 8. What MAINTAIN will not do in V1

- Workshop booking or diary
- Live MOT / service-history APIs
- Fault-code diagnosis
- Letting budget or taste admit the wrong pad or tyre
- Merging requests into Build objectives
