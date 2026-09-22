import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bestFitment, capConfidence, fitmentLabel, matchFitmentRow } from "./fitment";
import { applySafetyGate } from "./safety";
import type { FitmentMatch, GarageVehicle, ProductCandidate, VehicleFitmentRow } from "./types";
import { runBuildPipeline, type BuildConfig, type BuildContext } from "./build";
import { runMaintainPipeline, type MaintainConfig } from "./maintain";

const vehicle: GarageVehicle = {
  id: "veh-355",
  userId: "demo-355",
  make: "Ferrari",
  model: "F355",
  generation: "F355",
  variant: null,
  year: 1997,
  engine: "3.5 V8",
  fuel: "petrol",
  transmission: "manual",
  body: "coupe",
  powerBhp: 380,
  registration: null,
  specification: "F355 GTB; 330mm front discs",
};

function fitment(partial: Partial<VehicleFitmentRow> & Pick<VehicleFitmentRow, "confidence">): VehicleFitmentRow {
  return {
    id: 1,
    productId: "prd",
    make: "Ferrari",
    model: "F355",
    generation: "F355",
    yearFrom: null,
    yearTo: null,
    engine: null,
    variant: null,
    notes: null,
    source: "manufacturer",
    sourceId: "src",
    ...partial,
  };
}

function product(partial: Partial<ProductCandidate> & Pick<ProductCandidate, "id" | "productName">): ProductCandidate {
  return {
    sourceId: "src-brembo",
    supplierId: "sup",
    manufacturerId: "mfr",
    description: null,
    category: "brake-discs",
    subcategory: null,
    price: 100,
    currency: "GBP",
    url: "https://example.com",
    imageUrl: null,
    availability: "in_stock",
    sku: "x",
    partNumber: "x",
    attributes: { safety_class: "critical" },
    manufacturerName: "Brembo",
    supplierName: "Foskers",
    sourcePriority: 95,
    sourceKind: "manual",
    sourceName: "Brembo",
    ...partial,
  };
}

describe("fitment matcher", () => {
  it("caps exact to generation when the garage lacks year/engine the product claims", () => {
    const row = fitment({
      confidence: "exact",
      yearFrom: 1994,
      yearTo: 1999,
      engine: "3.5 V8",
    });
    const stripped = { ...vehicle, year: null, engine: null };
    const match = matchFitmentRow(stripped, row);
    assert.equal(match?.effectiveConfidence, "generation");
  });

  it("rejects a 996 pad on an F355", () => {
    const row = fitment({
      make: "Porsche",
      model: "911",
      generation: "996",
      confidence: "generation",
    });
    assert.equal(matchFitmentRow(vehicle, row), null);
  });

  it("prefers generation over model when both match", () => {
    const best = bestFitment(vehicle, [
      fitment({ id: 1, confidence: "model", generation: null }),
      fitment({ id: 2, confidence: "generation", generation: "F355" }),
    ]);
    assert.equal(best?.row.id, 2);
    assert.equal(best?.effectiveConfidence, "generation");
  });

  it("uses catalog aliases for F 355", () => {
    const match = matchFitmentRow(vehicle, fitment({ model: "F 355", confidence: "generation" }));
    assert.ok(match);
  });

  it("never labels model fitment as confirmed", () => {
    const label = fitmentLabel("model", vehicle);
    assert.match(label ?? "", /generation not confirmed/);
    assert.doesNotMatch(label ?? "", /Fits your/);
  });

  it("does not upgrade confidence", () => {
    assert.equal(capConfidence("model", "exact"), "model");
  });
});

describe("safety gate", () => {
  const classes = [
    { slug: "critical" as const, withholdBelowFitment: "generation" as const },
    { slug: "caution" as const, withholdBelowFitment: "generation" as const },
    { slug: "lifestyle" as const, withholdBelowFitment: "model" as const },
  ];

  it("withholds a critical part with model fitment", () => {
    const candidate = product({ id: "prd-univ", productName: "Universal discs" });
    const match: FitmentMatch = {
      row: fitment({ confidence: "model", generation: null, source: "inferred" }),
      storedConfidence: "model",
      effectiveConfidence: "model",
      label: "Listed for Ferrari F355 — generation not confirmed",
    };
    const decision = applySafetyGate({
      product: candidate,
      match,
      mode: "maintain",
      classes,
      components: [{ slug: "brake-discs", safetyClass: "critical" }],
    });
    assert.equal(decision.decision, "withhold");
  });

  it("passes a generation manufacturer disc", () => {
    const candidate = product({ id: "prd-ok", productName: "Brembo discs" });
    const match: FitmentMatch = {
      row: fitment({ confidence: "generation" }),
      storedConfidence: "generation",
      effectiveConfidence: "generation",
      label: "Fits the F355 Ferrari F355",
    };
    const decision = applySafetyGate({
      product: candidate,
      match,
      mode: "maintain",
      classes,
      components: [{ slug: "brake-discs", safetyClass: "critical" }],
    });
    assert.equal(decision.decision, "pass");
  });
});

const buildConfig: BuildConfig = {
  weights: {
    fitment_exact: 40,
    fitment_generation: 28,
    fitment_model: 12,
    matches_build_type: 20,
    supports_primary_objective: 18,
    supports_secondary_obj: 8,
    usage_compatible: 12,
    style_compatible: 10,
    within_budget: 10,
    source_quality: 8,
    interest_boost: 6,
    already_fitted_category: -40,
  },
  buildTypeCategories: {
    "fast-street": ["exhaust", "intake", "ecu", "suspension"],
  },
  objectiveAttributes: {
    "more-character": { sound: ["character", "loud"] },
    "more-power": { performance_gain: ["modest", "significant"] },
  },
  objectiveCategories: {
    "more-character": "sound",
    "more-power": "performance",
  },
  complementaryCategories: { exhaust: ["suspension"] },
  roadUsages: ["weekend-road"],
  interestCategoryHints: { Performance: ["intake", "ecu"] },
};

describe("BUILD pipeline", () => {
  it("suppresses another exhaust when one is already fitted", () => {
    const context: BuildContext = {
      vehicle,
      buildType: "fast-street",
      buildTypeName: "Fast Street",
      objectives: [
        { slug: "more-character", name: "More character" },
        { slug: "more-power", name: "More power" },
      ],
      usage: "weekend-road",
      style: "oem-plus",
      budgetMax: 10000,
      budgetName: "£5,000–£10,000",
      interests: ["Performance"],
      modifications: [
        {
          id: "mod",
          vehicleId: "veh-355",
          category: "exhaust",
          productId: "prd-capristo",
          manufacturer: "Capristo",
          description: "Capristo exhaust",
          notes: null,
        },
      ],
    };
    const intake = product({
      id: "prd-intake",
      productName: "BMC intake",
      category: "intake",
      attributes: {
        safety_class: "caution",
        sound: "character",
        performance_gain: "modest",
        road_use: "yes",
        oem_plus: "yes",
      },
      sourcePriority: 84,
    });
    const exhaust = product({
      id: "prd-tubi",
      productName: "Tubi exhaust",
      category: "exhaust",
      attributes: {
        safety_class: "caution",
        sound: "loud",
        road_use: "yes",
      },
      sourcePriority: 45,
    });
    const match: FitmentMatch = {
      row: fitment({ confidence: "generation" }),
      storedConfidence: "generation",
      effectiveConfidence: "generation",
      label: "Fits the F355 Ferrari F355",
    };
    const { results, trace } = runBuildPipeline({
      products: [intake, exhaust],
      fitmentsByProduct: new Map([
        [intake.id, match],
        [exhaust.id, match],
      ]),
      context,
      config: buildConfig,
      classes: [{ slug: "caution", withholdBelowFitment: "generation" }],
      components: [{ slug: "exhaust", safetyClass: "caution" }, { slug: "intake", safetyClass: "caution" }],
    });
    assert.equal(results[0]?.id, "prd-intake");
    assert.ok(trace.suppressed.some((event) => event.productId === "prd-tubi"));
    assert.ok(results[0]?.reasons.some((reason) => reason.code === "supports_objective"));
    assert.ok(!results.some((card) => "score" in card));
  });
});

describe("MAINTAIN pipeline", () => {
  const config: MaintainConfig = {
    weights: {
      fitment_exact: 50,
      fitment_generation: 30,
      correct_component: 40,
      spec_match: 20,
      authoritative_source: 15,
      in_stock: 10,
      price_lower_among_ok: 5,
    },
    componentAliases: { "brake-discs": ["brake-discs"], brakes: ["brake-discs", "brake-pads"] },
    workshopComponents: ["service"],
    specialistCategoryForComponent: { "brake-discs": ["service"], service: ["service"] },
  };

  it("returns generation discs and drops a show exhaust", () => {
    const disc = product({
      id: "prd-disc",
      productName: "Brembo 330mm discs",
      category: "brake-discs",
      attributes: { safety_class: "critical", spec: "330mm" },
    });
    const exhaust = product({
      id: "prd-show",
      productName: "Show exhaust",
      category: "exhaust",
      attributes: { safety_class: "caution", sound: "loud" },
    });
    const pad911 = product({
      id: "prd-911",
      productName: "996 pads",
      category: "brake-pads",
      attributes: { safety_class: "critical" },
    });
    const gen: FitmentMatch = {
      row: fitment({ confidence: "generation" }),
      storedConfidence: "generation",
      effectiveConfidence: "generation",
      label: "Fits the F355 Ferrari F355",
    };
    const { results, trace } = runMaintainPipeline({
      products: [disc, exhaust, pad911],
      fitmentsByProduct: new Map([
        [disc.id, gen],
        [exhaust.id, gen],
        [pad911.id, null],
      ]),
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", specification: vehicle.specification },
      config,
      classes: [
        { slug: "critical", withholdBelowFitment: "generation" },
        { slug: "caution", withholdBelowFitment: "generation" },
      ],
      components: [
        { slug: "brake-discs", safetyClass: "critical" },
        { slug: "exhaust", safetyClass: "caution" },
      ],
    });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, "prd-disc");
    assert.ok(results[0]?.reasons.some((reason) => reason.code === "correct_component"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-show"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-911"));
  });
});
