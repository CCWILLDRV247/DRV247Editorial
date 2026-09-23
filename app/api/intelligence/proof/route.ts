import { NextResponse } from "next/server";
import { recommend } from "@/lib/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const build = await recommend({
    intent: "build",
    vehicleId: "veh-355",
    build: {
      type: "fast-street",
      objectives: ["more-character", "more-power"],
      usage: "weekend-road",
      style: "oem-plus",
      budget: "5-10k",
      intensity: "moderate",
    },
  });

  const maintain = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    maintain: { type: "replace", component: "brake-discs", grade: "oem" },
  });

  const maintainPads = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    maintain: { type: "replace", component: "brake-pads", grade: "oem" },
  });

  const maintainOemPlus = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    maintain: { type: "replace", component: "brakes", grade: "oem-plus" },
  });

  const maintainUpgrade = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    maintain: { type: "replace", component: "brakes", grade: "upgrade" },
  });

  const maintainAsModified = await recommend({
    intent: "maintain",
    vehicleId: "veh-355",
    userId: "demo-m3",
    maintain: { type: "replace", component: "brake-discs", grade: "oem" },
  });

  const specialist = await recommend({
    intent: "maintain",
    vehicleId: "veh-964",
    maintain: { type: "find-specialist", component: "service" },
  });

  const buildNames = build.recommendations.map((card) => card.name);
  const buildCategories = build.recommendations.map((card) => card.category);
  const exhaustLead = build.recommendations[0]?.category === "exhaust";
  const exhaustPresent = buildCategories.includes("exhaust");
  const maintainNames = [
    ...maintain.recommendations,
    ...maintainPads.recommendations,
  ].map((card) => card.name);
  const maintainCategories = [
    ...maintain.recommendations,
    ...maintainPads.recommendations,
  ].map((card) => card.category);
  const showExhaust = maintainCategories.includes("exhaust");
  const wrongPad = maintainNames.some((name) => /996|911/.test(name));
  const oemNames = [...maintain.recommendations, ...maintainPads.recommendations].map((card) => card.name);
  const oemPlusNames = maintainOemPlus.recommendations.map((card) => card.name);
  const upgradeNames = maintainUpgrade.recommendations.map((card) => card.name);
  const upgradeCodes = maintainUpgrade.recommendations.flatMap((card) => card.reasons.map((reason) => reason.code));
  const withheldCritical = build.trace.withheld
    .concat(maintain.trace.withheld)
    .some((event) => event.productId === "prd-univ-ferrari-discs");
  const modifiedIds = new Set(maintainAsModified.recommendations.map((card) => card.id));
  const deskIds = new Set(maintain.recommendations.map((card) => card.id));
  const interestsDidNotAdmitWrongPart =
    [...modifiedIds].every((id) => deskIds.has(id)) &&
    !maintainAsModified.recommendations.some((card) => card.category === "exhaust");

  const checks = {
    buildFastStreetRelevant:
      build.recommendations.length > 0 &&
      !exhaustLead &&
      build.recommendations.every((card) => card.reasons.length > 0) &&
      build.recommendations.some((card) =>
        ["intake", "ecu", "suspension", "wheels"].includes(card.category ?? ""),
      ),
    capristoDoesNotLead: !exhaustLead && !buildNames.some((name) => /Tubi/i.test(name)),
    exhaustSuppressedIfFitted: exhaustPresent === false,
    maintainBrakesCorrect:
      maintain.recommendations.some((card) => card.category === "brake-discs") &&
      maintainPads.recommendations.some((card) => card.category === "brake-pads") &&
      !showExhaust &&
      !wrongPad &&
      maintain.recommendations.every(
        (card) => card.fitmentConfidence === "exact" || card.fitmentConfidence === "generation",
      ),
    criticalModelWithheld: withheldCritical,
    interestsDoNotOverrideMaintain: interestsDidNotAdmitWrongPart,
    specialistsForService: specialist.recommendations.some((card) => card.kind === "specialist"),
    oemDropsUpgrade:
      oemNames.some((name) => /Ferrari genuine/i.test(name)) &&
      !oemNames.some((name) => /Pagid RS14|Brembo GT/i.test(name)),
    oemPlusKeepsFactoryLanguage:
      oemPlusNames.some((name) => /Brembo/i.test(name)) &&
      !oemPlusNames.some((name) => /Pagid RS14|Brembo GT/i.test(name)),
    upgradeSurfacesUpgrade:
      upgradeNames.some((name) => /Pagid RS14|Brembo GT/i.test(name)) &&
      upgradeNames.some((name) => /Ferrari genuine|Brembo 330mm/i.test(name)) &&
      upgradeCodes.includes("upgrade_replacement"),
    yearEngineEnablesExact: maintain.recommendations.some(
      (card) => card.fitmentConfidence === "exact" && /1997/.test(card.fitmentLabel ?? ""),
    ),
  };

  return NextResponse.json(
    {
      ok: Object.values(checks).every(Boolean),
      checks,
      build: {
        vehicle: "veh-355",
        recommendations: build.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          reasons: card.reasons.map((reason) => reason.label),
          fitmentLabel: card.fitmentLabel,
        })),
        suppressed: build.trace.suppressed,
        withheld: build.trace.withheld,
      },
      maintain: {
        vehicle: "veh-355",
        discs: maintain.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          fitmentLabel: card.fitmentLabel,
          reasons: card.reasons.map((reason) => reason.label),
        })),
        pads: maintainPads.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          fitmentLabel: card.fitmentLabel,
        })),
        oemPlus: maintainOemPlus.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
        })),
        upgrade: maintainUpgrade.recommendations.map((card) => ({
          name: card.name,
          category: card.category,
          reasons: card.reasons.map((reason) => reason.code),
        })),
        withheld: maintain.trace.withheld,
      },
      specialist: specialist.recommendations
        .filter((card) => card.kind === "specialist")
        .map((card) => ({ name: card.name, location: card.location, url: card.url })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
