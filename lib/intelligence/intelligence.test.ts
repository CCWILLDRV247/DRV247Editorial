import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bestFitment, capConfidence, fitmentLabel, matchFitmentRow } from "./fitment";
import { applySafetyGate } from "./safety";
import type { FitmentMatch, GarageVehicle, ProductCandidate, VehicleFitmentRow } from "./types";
import { loadBuildConfig, runBuildPipeline, type BuildConfig, type BuildContext } from "./build";
import { loadMaintainConfig, productReplacementGrade, runMaintainPipeline, type MaintainConfig } from "./maintain";
import { loadCsvProducts } from "./adapters/csv";

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

  it("keeps exact when the garage has the year and engine the product claims", () => {
    const row = fitment({
      confidence: "exact",
      yearFrom: 1994,
      yearTo: 1999,
      engine: "3.5 V8",
    });
    const match = matchFitmentRow(vehicle, row);
    assert.equal(match?.effectiveConfidence, "exact");
    assert.match(match?.label ?? "", /1997/);
  });

  it("rejects a year range the garage year misses", () => {
    const row = fitment({
      make: "Porsche",
      model: "911",
      generation: "964",
      yearFrom: 1989,
      yearTo: 1990,
      engine: "3.6",
      confidence: "exact",
    });
    const rs = {
      ...vehicle,
      id: "veh-964",
      make: "Porsche",
      model: "911",
      generation: "964",
      variant: "Carrera RS",
      year: 1992,
      engine: "3.6",
    };
    assert.equal(matchFitmentRow(rs, row), null);
  });

  it("rejects an engine the garage does not have", () => {
    const row = fitment({
      make: "BMW",
      model: "M3",
      generation: "E46",
      yearFrom: 2001,
      yearTo: 2006,
      engine: "3.2 M54",
      confidence: "exact",
    });
    const e46 = {
      ...vehicle,
      id: "veh-e46",
      make: "BMW",
      model: "M3",
      generation: "E46",
      variant: null,
      year: 2003,
      engine: "3.2 S54",
    };
    assert.equal(matchFitmentRow(e46, row), null);
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
      grade_match: 18,
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

  const oem = product({
    id: "prd-oem",
    productName: "Ferrari genuine discs",
    attributes: { safety_class: "critical", spec: "330mm", replacement_grade: "oem" },
  });
  const oemPlus = product({
    id: "prd-oem-plus",
    productName: "Brembo OEM+ discs",
    attributes: { safety_class: "critical", spec: "330mm", oem_plus: "yes", replacement_grade: "oem-plus" },
  });
  const upgrade = product({
    id: "prd-upgrade",
    productName: "Pagid RS discs",
    attributes: {
      safety_class: "critical",
      spec: "330mm",
      appearance: "aftermarket",
      replacement_grade: "upgrade",
      oem_plus: "no",
    },
  });
  const gen: FitmentMatch = {
    row: fitment({ confidence: "generation" }),
    storedConfidence: "generation",
    effectiveConfidence: "generation",
    label: "Fits the F355 Ferrari F355",
  };
  const fitments = new Map([
    [oem.id, gen],
    [oemPlus.id, gen],
    [upgrade.id, gen],
  ]);
  const classes = [{ slug: "critical" as const, withholdBelowFitment: "generation" as const }];
  const components = [{ slug: "brake-discs" as const, safetyClass: "critical" as const }];

  it("classifies OEM, OEM+, and upgrade from attributes", () => {
    assert.equal(productReplacementGrade(oem), "oem");
    assert.equal(productReplacementGrade(oemPlus), "oem-plus");
    assert.equal(productReplacementGrade(upgrade), "upgrade");
  });

  it("OEM drops OEM+ and upgrade, keeps factory-spec", () => {
    const { results, trace } = runMaintainPipeline({
      products: [oem, oemPlus, upgrade],
      fitmentsByProduct: fitments,
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", grade: "oem", specification: vehicle.specification },
      config,
      classes,
      components,
    });
    assert.deepEqual(results.map((card) => card.id), ["prd-oem"]);
    assert.ok(results[0]?.reasons.some((reason) => reason.code === "oem_replacement"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-oem-plus"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-upgrade"));
  });

  it("OEM+ keeps OEM and OEM+, drops aftermarket upgrade", () => {
    const { results, trace } = runMaintainPipeline({
      products: [oem, oemPlus, upgrade],
      fitmentsByProduct: fitments,
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", grade: "oem-plus" },
      config,
      classes,
      components,
    });
    assert.equal(results[0]?.id, "prd-oem-plus");
    assert.ok(results.some((card) => card.id === "prd-oem"));
    assert.ok(!results.some((card) => card.id === "prd-upgrade"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-upgrade"));
    assert.ok(results[0]?.reasons.some((reason) => reason.code === "oem_plus_replacement"));
  });

  it("upgrade ranks the upgrade part first and still keeps OEM", () => {
    const { results } = runMaintainPipeline({
      products: [oem, oemPlus, upgrade],
      fitmentsByProduct: fitments,
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", grade: "upgrade" },
      config,
      classes,
      components,
    });
    assert.equal(results[0]?.id, "prd-upgrade");
    assert.ok(results.some((card) => card.id === "prd-oem"));
    assert.ok(results[0]?.reasons.some((reason) => reason.code === "upgrade_replacement"));
  });

  it("grade does not admit a pad for the wrong car", () => {
    const wrong = product({
      id: "prd-996",
      productName: "996 pads",
      category: "brake-pads",
      attributes: { safety_class: "critical", replacement_grade: "oem" },
    });
    const { results, trace } = runMaintainPipeline({
      products: [wrong],
      fitmentsByProduct: new Map([[wrong.id, null]]),
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-pads", grade: "oem" },
      config,
      classes,
      components: [{ slug: "brake-pads", safetyClass: "critical" }],
    });
    assert.equal(results.length, 0);
    assert.ok(trace.dropped.some((event) => event.productId === "prd-996"));
  });
});

describe("bundled intelligence config", () => {
  it("loads ranking JSON from the module graph, not cwd", () => {
    const build = loadBuildConfig("/tmp/does-not-exist");
    assert.ok(build.weights.fitment_exact > 0);
    const maintain = loadMaintainConfig("/tmp/does-not-exist");
    assert.deepEqual(maintain.componentAliases.brakes, ["brake-discs", "brake-pads"]);
  });

  it("loads the seed CSV from the project cwd, not import.meta.url", () => {
    const result = loadCsvProducts(
      {
        id: "src-design911",
        name: "Design 911",
        kind: "csv",
        identifier: "config/intelligence/seed-products.csv",
        enabled: true,
        priority: 70,
      },
      process.cwd(),
    );
    assert.ok(result.products.length > 0);
    assert.equal(result.errors.length, 0);

    const missing = loadCsvProducts(
      {
        id: "src-design911",
        name: "Design 911",
        kind: "csv",
        identifier: "config/intelligence/seed-products.csv",
        enabled: true,
        priority: 70,
      },
      "/tmp/does-not-exist",
    );
    assert.equal(missing.products.length, 0);
    assert.ok(missing.errors.length > 0);
  });
});
