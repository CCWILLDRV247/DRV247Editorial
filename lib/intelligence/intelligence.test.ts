import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bestFitment, capConfidence, fitmentLabel, matchFitmentRow } from "./fitment";
import { applySafetyGate } from "./safety";
import type { FitmentMatch, GarageVehicle, ProductCandidate, VehicleFitmentRow } from "./types";
import {
  briefAsksBrakingOrHandling,
  isFactoryServicePart,
  loadBuildConfig,
  runBuildPipeline,
  type BuildConfig,
  type BuildContext,
} from "./build";
import {
  isDesign911Product,
  loadMaintainConfig,
  productReplacementGrade,
  runMaintainPipeline,
  type MaintainConfig,
} from "./maintain";
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
    "fast-street": ["exhaust", "intake", "ecu", "suspension", "wheels"],
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
      partner_source: 16,
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
  const oemSupplier = product({
    id: "prd-oem-supplier",
    productName: "Brembo 330mm factory-spec discs",
    attributes: { safety_class: "critical", spec: "330mm", oem_plus: "yes", replacement_grade: "oem-plus" },
  });
  const quietlyBetter = product({
    id: "prd-oem-plus",
    productName: "BMC CDA intake",
    category: "intake",
    attributes: { safety_class: "caution", oem_plus: "yes", appearance: "oem-plus", sound: "character" },
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
    [oemSupplier.id, gen],
    [quietlyBetter.id, gen],
    [upgrade.id, gen],
  ]);
  const classes = [{ slug: "critical" as const, withholdBelowFitment: "generation" as const }];
  const components = [{ slug: "brake-discs" as const, safetyClass: "critical" as const }];

  it("classifies genuine, OEM-supplier like-for-like, quietly better, and upgrade", () => {
    assert.equal(productReplacementGrade(oem), "oem");
    assert.equal(productReplacementGrade(oemSupplier), "oem");
    assert.equal(productReplacementGrade(quietlyBetter), "oem-plus");
    assert.equal(productReplacementGrade(upgrade), "upgrade");
  });

  it("OEM keeps genuine and OEM-supplier factory-spec, drops upgrade", () => {
    const { results, trace } = runMaintainPipeline({
      products: [oem, oemSupplier, upgrade],
      fitmentsByProduct: fitments,
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", grade: "oem", specification: vehicle.specification },
      config,
      classes,
      components,
    });
    assert.ok(results.some((card) => card.id === "prd-oem"));
    assert.ok(results.some((card) => card.id === "prd-oem-supplier"));
    assert.ok(results.every((card) => card.reasons.some((reason) => reason.code === "oem_replacement")));
    assert.ok(!results.some((card) => card.id === "prd-upgrade"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-upgrade"));
  });

  it("OEM+ keeps factory-spec and still drops aftermarket upgrade", () => {
    const { results, trace } = runMaintainPipeline({
      products: [oem, oemSupplier, upgrade],
      fitmentsByProduct: fitments,
      specialists: [],
      context: { vehicle, type: "replace", component: "brake-discs", grade: "oem-plus" },
      config,
      classes,
      components,
    });
    assert.ok(results.some((card) => card.id === "prd-oem"));
    assert.ok(results.some((card) => card.id === "prd-oem-supplier"));
    assert.ok(!results.some((card) => card.id === "prd-upgrade"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-upgrade"));
  });

  it("upgrade ranks the upgrade part first and still keeps OEM", () => {
    const { results } = runMaintainPipeline({
      products: [oem, oemSupplier, upgrade],
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

describe("964 mode contract", () => {
  const rs: GarageVehicle = {
    ...vehicle,
    id: "veh-964",
    userId: "demo-chris",
    make: "Porsche",
    model: "911",
    generation: "964",
    variant: "Carrera RS",
    year: 1992,
    engine: "3.6",
    specification: "964 Carrera RS; 3.6 air-cooled; 322mm front discs; 205/50ZR17 F 255/40ZR17 R",
  };
  const porscheFit = fitment({
    make: "Porsche",
    model: "911",
    generation: "964",
    yearFrom: 1989,
    yearTo: 1994,
    engine: "3.6",
    confidence: "exact",
  });
  const match: FitmentMatch = {
    row: porscheFit,
    storedConfidence: "exact",
    effectiveConfidence: "exact",
    label: "Fits your 1992 Porsche 911 Carrera RS",
  };
  const genuine = product({
    id: "prd-porsche-964-discs",
    productName: "Porsche genuine 322mm 964 front discs",
    manufacturerName: "Porsche",
    supplierName: "Design 911",
    sourceId: "src-porsche",
    sourceName: "Porsche",
    attributes: { safety_class: "critical", spec: "322mm", appearance: "oem", replacement_grade: "oem" },
  });
  const brembo = product({
    id: "prd-brembo-964-discs",
    productName: "Brembo 322mm 964 brake discs",
    manufacturerName: "Brembo",
    supplierName: "Design 911",
    sourceId: "src-brembo",
    sourceName: "Brembo",
    attributes: { safety_class: "critical", spec: "322mm", appearance: "oem", replacement_grade: "oem" },
  });
  const foskersBrembo = product({
    id: "prd-brembo-other",
    productName: "Brembo 322mm 964 brake discs from Foskers",
    manufacturerName: "Brembo",
    supplierName: "Foskers",
    sourceId: "src-brembo",
    sourceName: "Brembo",
    url: "https://www.foskers.com",
    attributes: { safety_class: "critical", spec: "322mm", appearance: "oem", replacement_grade: "oem" },
  });
  const rs14 = product({
    id: "prd-pagid-964-rs14",
    productName: "Pagid RS14 964 brake pads",
    category: "brake-pads",
    manufacturerName: "Pagid",
    supplierName: "Design 911",
    attributes: {
      safety_class: "critical",
      spec: "322mm",
      appearance: "aftermarket",
      replacement_grade: "upgrade",
      oem_plus: "no",
    },
  });
  const springPad = product({
    id: "prd-spring-pad",
    productName: "Rear spring pad",
    category: "suspension",
    attributes: { safety_class: "critical", appearance: "oem", replacement_grade: "oem" },
  });
  const factoryDuct = product({
    id: "prd-factory-duct",
    productName: "Factory brake duct",
    category: "cooling",
    attributes: { safety_class: "caution", appearance: "oem", replacement_grade: "oem" },
  });
  const dansk = product({
    id: "prd-dansk-964-exh",
    productName: "Dansk sports exhaust",
    category: "exhaust",
    manufacturerName: "Dansk",
    supplierName: "Design 911",
    attributes: {
      safety_class: "caution",
      sound: "character",
      performance_gain: "modest",
      oem_plus: "yes",
      appearance: "oem-plus",
      road_use: "yes",
    },
    sourcePriority: 86,
  });

  const maintainConfig: MaintainConfig = {
    weights: {
      fitment_exact: 50,
      fitment_generation: 30,
      correct_component: 40,
      spec_match: 20,
      authoritative_source: 15,
      grade_match: 18,
      partner_source: 16,
      in_stock: 10,
      price_lower_among_ok: 5,
    },
    componentAliases: { brakes: ["brake-discs", "brake-pads"], "brake-discs": ["brake-discs"] },
    workshopComponents: [],
    specialistCategoryForComponent: {},
  };

  it("MAINTAIN OEM keeps genuine, Brembo OEM-supplier, and Design 911 — not a logo ban", () => {
    assert.equal(isDesign911Product(genuine), true);
    assert.equal(isDesign911Product(foskersBrembo), false);
    const { results, trace } = runMaintainPipeline({
      products: [genuine, brembo, foskersBrembo, rs14],
      fitmentsByProduct: new Map([
        [genuine.id, match],
        [brembo.id, match],
        [foskersBrembo.id, match],
        [rs14.id, match],
      ]),
      specialists: [],
      context: { vehicle: rs, type: "replace", component: "brakes", grade: "oem", specification: rs.specification },
      config: maintainConfig,
      classes: [{ slug: "critical", withholdBelowFitment: "generation" }],
      components: [
        { slug: "brake-discs", safetyClass: "critical" },
        { slug: "brake-pads", safetyClass: "critical" },
      ],
    });
    assert.ok(results.some((card) => card.id === "prd-porsche-964-discs"));
    assert.ok(results.some((card) => card.id === "prd-brembo-964-discs"));
    assert.ok(results.some((card) => card.id === "prd-brembo-other"));
    assert.ok(results.some((card) => card.reasons.some((reason) => reason.code === "porsche_partner")));
    assert.ok(!results.some((card) => card.id === "prd-pagid-964-rs14"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-pagid-964-rs14"));
    const partner = results.find((card) => card.id === "prd-brembo-964-discs");
    const other = results.find((card) => card.id === "prd-brembo-other");
    assert.ok(partner && other);
    assert.ok(results.indexOf(partner) < results.indexOf(other));
  });

  it("BUILD Fast Street drops genuine discs, spring pads, factory ducts, and unasked brakes", () => {
    const context: BuildContext = {
      vehicle: rs,
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
      interests: ["Classic"],
      modifications: [],
    };
    assert.equal(isFactoryServicePart(genuine), true);
    assert.equal(isFactoryServicePart(springPad), true);
    assert.equal(isFactoryServicePart(factoryDuct), true);
    assert.equal(
      briefAsksBrakingOrHandling(context),
      false,
    );
    const { results, trace } = runBuildPipeline({
      products: [dansk, genuine, rs14, springPad, factoryDuct],
      fitmentsByProduct: new Map([
        [dansk.id, match],
        [genuine.id, match],
        [rs14.id, match],
        [springPad.id, match],
        [factoryDuct.id, match],
      ]),
      context,
      config: buildConfig,
      classes: [
        { slug: "critical", withholdBelowFitment: "generation" },
        { slug: "caution", withholdBelowFitment: "generation" },
      ],
      components: [
        { slug: "exhaust", safetyClass: "caution" },
        { slug: "brake-discs", safetyClass: "critical" },
        { slug: "brake-pads", safetyClass: "critical" },
        { slug: "suspension", safetyClass: "critical" },
        { slug: "cooling", safetyClass: "caution" },
      ],
    });
    assert.deepEqual(results.map((card) => card.id), ["prd-dansk-964-exh"]);
    assert.ok(trace.dropped.some((event) => event.productId === "prd-porsche-964-discs"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-pagid-964-rs14"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-spring-pad"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-factory-duct"));
  });

  it("BUILD admits a brake upgrade only when the brief asks for braking", () => {
    const context: BuildContext = {
      vehicle: rs,
      buildType: "fast-street",
      buildTypeName: "Fast Street",
      objectives: [{ slug: "better-braking", name: "Better braking" }],
      usage: "weekend-road",
      style: "aftermarket",
      budgetMax: 10000,
      interests: [],
      modifications: [],
    };
    const { results, trace } = runBuildPipeline({
      products: [genuine, rs14],
      fitmentsByProduct: new Map([
        [genuine.id, match],
        [rs14.id, match],
      ]),
      context,
      config: {
        ...buildConfig,
        buildTypeCategories: { "fast-street": ["exhaust", "intake", "ecu", "suspension"] },
        objectiveCategories: { "better-braking": "brakes" },
        objectiveAttributes: { "better-braking": {} },
      },
      classes: [{ slug: "critical", withholdBelowFitment: "generation" }],
      components: [
        { slug: "brake-discs", safetyClass: "critical" },
        { slug: "brake-pads", safetyClass: "critical" },
      ],
    });
    assert.ok(results.some((card) => card.id === "prd-pagid-964-rs14"));
    assert.ok(!results.some((card) => card.id === "prd-porsche-964-discs"));
    assert.ok(trace.dropped.some((event) => event.productId === "prd-porsche-964-discs"));
  });
});
