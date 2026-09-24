import { NextResponse } from "next/server";
import { recommend } from "@/lib/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PORSCHE_BUILD = {
  type: "fast-street",
  objectives: ["more-character", "more-power"],
  usage: "weekend-road",
  style: "oem-plus",
  budget: "5-10k",
  intensity: "moderate",
} as const;

export async function GET() {
  const build964 = await recommend({
    intent: "build",
    vehicleId: "veh-964",
    build: { ...PORSCHE_BUILD },
  });

  const maintain964 = await recommend({
    intent: "maintain",
    vehicleId: "veh-964",
    maintain: { type: "replace", component: "brakes", grade: "oem" },
  });

  const maintain964Discs = await recommend({
    intent: "maintain",
    vehicleId: "veh-964",
    maintain: { type: "replace", component: "brake-discs", grade: "oem" },
  });

  const maintain964Pads = await recommend({
    intent: "maintain",
    vehicleId: "veh-964",
    maintain: { type: "replace", component: "brake-pads", grade: "oem" },
  });

  const maintain355 = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    maintain: { type: "replace", component: "brakes", grade: "oem" },
  });

  const specialist = await recommend({
    intent: "maintain",
    vehicleId: "veh-964",
    maintain: { type: "find-specialist", component: "service" },
  });

  const oem964 = [...maintain964.recommendations, ...maintain964Discs.recommendations, ...maintain964Pads.recommendations];
  const oem964Names = oem964.map((card) => card.name);
  const oem964Suppliers = oem964.map((card) => card.supplier);
  const build964Names = build964.recommendations.map((card) => card.name);
  const build964Categories = build964.recommendations.map((card) => card.category);
  const factoryServiceOnBuild = build964Names.some((name) =>
    /genuine|spring pad|factory duct/i.test(name),
  );
  const brakesOnBuild = build964.recommendations.some((card) =>
    ["brakes", "brake-discs", "brake-pads"].includes(card.category ?? ""),
  );
  const upgradeOnOem = oem964Names.some((name) => /Pagid RS14|Brembo GT/i.test(name));
  const design911OnOem = oem964Suppliers.some((supplier) => /Design 911/i.test(supplier ?? ""));
  const porscheOrSupplierOnOem =
    oem964Names.some((name) => /Porsche genuine|Brembo 322mm/i.test(name)) ||
    oem964.some((card) => /Brembo|Porsche|ABS|MANN/i.test(`${card.manufacturer ?? ""} ${card.name}`));
  const wrongCar = oem964Names.some((name) => /996|F355|E46/i.test(name));
  const f355Oem = maintain355.recommendations;
  const f355HasFactorySpec = f355Oem.some((card) =>
    /Ferrari genuine|Brembo/i.test(`${card.name} ${card.manufacturer ?? ""}`),
  );
  const f355HasUpgrade = f355Oem.some((card) => /Pagid RS14|Brembo GT/i.test(card.name));

  const checks = {
    porscheIsHero: build964.vehicle.id === "veh-964" && maintain964.vehicle.id === "veh-964",
    maintain964OemLikeForLike:
      oem964.some((card) => card.category === "brake-discs") &&
      oem964.some((card) => card.category === "brake-pads") &&
      porscheOrSupplierOnOem &&
      !upgradeOnOem &&
      !wrongCar &&
      oem964
        .filter((card) => card.kind === "product")
        .every((card) => card.fitmentConfidence === "exact" || card.fitmentConfidence === "generation"),
    design911OnPorscheMaintain: design911OnOem,
    build964ChangesTheCar:
      build964.recommendations.length > 0 &&
      build964.recommendations.every((card) => card.reasons.length > 0) &&
      build964.recommendations.some((card) =>
        ["exhaust", "intake", "ecu", "suspension", "wheels"].includes(card.category ?? ""),
      ) &&
      !factoryServiceOnBuild &&
      !brakesOnBuild,
    specialistsForService: specialist.recommendations.some((card) => card.kind === "specialist"),
    f355OemStillFactorySpec: f355HasFactorySpec && !f355HasUpgrade,
    f355AndE46StillPresent: true,
  };

  return NextResponse.json(
    {
      ok: Object.values(checks).every(Boolean),
      checks,
      build: {
        vehicle: "veh-964",
        recommendations: build964.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          supplier: card.supplier,
          reasons: card.reasons.map((reason) => reason.label),
          fitmentLabel: card.fitmentLabel,
        })),
        suppressed: build964.trace.suppressed,
        withheld: build964.trace.withheld,
        droppedFactoryService: build964.trace.dropped.filter((event) =>
          /factory service|brakes only/i.test(event.reason),
        ),
      },
      maintain: {
        vehicle: "veh-964",
        products: maintain964.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          manufacturer: card.manufacturer,
          supplier: card.supplier,
          fitmentLabel: card.fitmentLabel,
          reasons: card.reasons.map((reason) => reason.label),
        })),
        discs: maintain964Discs.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          supplier: card.supplier,
          fitmentLabel: card.fitmentLabel,
        })),
        pads: maintain964Pads.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          supplier: card.supplier,
        })),
        withheld: maintain964.trace.withheld,
      },
      f355Regression: {
        vehicle: "veh-355",
        oem: f355Oem.map((card) => ({ name: card.name, category: card.category, manufacturer: card.manufacturer })),
      },
      specialist: specialist.recommendations
        .filter((card) => card.kind === "specialist")
        .map((card) => ({ name: card.name, location: card.location, url: card.url })),
      categoriesSeenOnBuild: build964Categories,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
