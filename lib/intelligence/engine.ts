import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { demoUserInterests, demoUsers, demoVehicles } from "@/lib/db/schema";
import {
  budgetBands,
  buildObjectives,
  buildTypes,
  builds,
  maintenanceComponents,
  maintenanceRequests,
  maintenanceTypes,
  replacementGrades,
  manufacturers,
  objectives,
  productAttributes,
  productSources,
  products,
  recommendationReasons,
  recommendations,
  safetyClasses,
  specialistMarques,
  specialists,
  styles,
  suppliers,
  usageTypes,
  vehicleFitments,
  vehicleModifications,
} from "@/lib/db/intelligence-schema";
import { loadBuildConfig, runBuildPipeline, type BuildContext } from "./build";
import { ensureLiveIntelligenceSources } from "./ingest";
import { loadMaintainConfig, normaliseReplacementGrade, runMaintainPipeline } from "./maintain";
import { REPLACEMENT_GRADES } from "./types";
import { bestFitment } from "./fitment";
import type {
  FitmentConfidence,
  FitmentMatch,
  GarageVehicle,
  ProductCandidate,
  RecommendInput,
  RecommendResult,
  ResultCard,
  SpecialistRow,
  VehicleFitmentRow,
} from "./types";
import type { ComponentSafety, SafetyClassRow } from "./safety";

function asFitment(row: typeof vehicleFitments.$inferSelect): VehicleFitmentRow {
  return {
    ...row,
    confidence: row.confidence as FitmentConfidence,
  };
}

async function loadVehicle(vehicleId: string): Promise<GarageVehicle | null> {
  const db = await getDb();
  const [row] = await db.select().from(demoVehicles).where(eq(demoVehicles.id, vehicleId)).limit(1);
  return row ?? null;
}

async function loadSafety(db: Awaited<ReturnType<typeof getDb>>): Promise<{
  classes: SafetyClassRow[];
  components: ComponentSafety[];
}> {
  const classRows = await db.select().from(safetyClasses);
  const componentRows = await db.select().from(maintenanceComponents);
  const classes: SafetyClassRow[] = classRows.map((row) => ({
    slug: row.slug as SafetyClassRow["slug"],
    withholdBelowFitment: row.withholdBelowFitment as FitmentConfidence,
  }));
  const components: ComponentSafety[] = componentRows.map((row) => ({
    slug: row.slug,
    safetyClass:
      (classRows.find((item) => item.id === row.safetyClassId)?.slug as ComponentSafety["safetyClass"]) ??
      "caution",
  }));
  return { classes, components };
}

async function loadCandidates(db: Awaited<ReturnType<typeof getDb>>): Promise<{
  products: ProductCandidate[];
  fitments: VehicleFitmentRow[];
}> {
  const productRows = await db.select().from(products);
  const attributeRows = await db.select().from(productAttributes);
  const fitmentRows = await db.select().from(vehicleFitments);
  const sourceRows = await db.select().from(productSources);
  const manufacturerRows = await db.select().from(manufacturers);
  const supplierRows = await db.select().from(suppliers);
  const attrsByProduct = new Map<string, Record<string, string>>();
  for (const row of attributeRows) {
    const current = attrsByProduct.get(row.productId) ?? {};
    current[row.attribute] = row.value;
    attrsByProduct.set(row.productId, current);
  }
  return {
    products: productRows.map((row) => {
      const source = sourceRows.find((item) => item.id === row.sourceId);
      return {
        id: row.id,
        sourceId: row.sourceId,
        supplierId: row.supplierId,
        manufacturerId: row.manufacturerId,
        productName: row.productName,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory,
        price: row.price,
        currency: row.currency,
        url: row.url,
        imageUrl: row.imageUrl,
        availability: row.availability,
        sku: row.sku,
        partNumber: row.partNumber,
        attributes: attrsByProduct.get(row.id) ?? {},
        manufacturerName: manufacturerRows.find((item) => item.id === row.manufacturerId)?.name ?? null,
        supplierName: supplierRows.find((item) => item.id === row.supplierId)?.name ?? null,
        sourcePriority: source?.priority ?? 50,
        sourceKind: source?.kind ?? "manual",
        sourceName: source?.name ?? "",
      };
    }),
    fitments: fitmentRows.map(asFitment),
  };
}

function attachFitments(
  vehicle: GarageVehicle,
  productRows: ProductCandidate[],
  fitments: VehicleFitmentRow[],
): Map<string, FitmentMatch | null> {
  const map = new Map<string, FitmentMatch | null>();
  for (const product of productRows) {
    map.set(
      product.id,
      bestFitment(
        vehicle,
        fitments.filter((row) => row.productId === product.id),
      ),
    );
  }
  return map;
}

async function persistResult(input: {
  mode: "build" | "maintain";
  vehicle: GarageVehicle;
  userId: string;
  buildId?: string;
  requestId?: string;
  cards: ResultCard[];
  fitmentsByProduct: Map<string, FitmentMatch | null>;
}) {
  const db = await getDb();
  const now = Date.now();
  const existing = input.buildId
    ? await db.select({ id: recommendations.id }).from(recommendations).where(eq(recommendations.buildId, input.buildId))
    : input.requestId
      ? await db
          .select({ id: recommendations.id })
          .from(recommendations)
          .where(eq(recommendations.maintenanceRequestId, input.requestId))
      : [];
  if (existing.length) {
    const ids = existing.map((row) => row.id);
    await db.delete(recommendationReasons).where(inArray(recommendationReasons.recommendationId, ids));
    await db.delete(recommendations).where(inArray(recommendations.id, ids));
  }
  for (const [index, card] of input.cards.entries()) {
    const scope = input.buildId ?? input.requestId ?? `${input.mode}_${input.vehicle.id}`;
    const id = `rec_${scope}_${card.kind}_${card.id}`;
    await db.delete(recommendationReasons).where(eq(recommendationReasons.recommendationId, id));
    await db.delete(recommendations).where(eq(recommendations.id, id));
    const match = card.kind === "product" ? input.fitmentsByProduct.get(card.id) : null;
    await db.insert(recommendations).values({
      id,
      mode: input.mode,
      userId: input.userId,
      vehicleId: input.vehicle.id,
      buildId: input.buildId ?? null,
      maintenanceRequestId: input.requestId ?? null,
      productId: card.kind === "product" ? card.id : null,
      specialistId: card.kind === "specialist" ? card.id : null,
      fitmentId: match?.row.id ?? null,
      recommendationConfidence: card.recommendationConfidence,
      createdAt: now + index,
    });
    for (const [sortOrder, reason] of card.reasons.entries()) {
      await db.insert(recommendationReasons).values({
        recommendationId: id,
        code: reason.code,
        label: reason.label,
        detail: reason.detail ?? null,
        sortOrder,
      });
    }
  }
}

export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  if (input.intent === "restore") {
    throw new Error("restore is reserved and not implemented in V1");
  }
  await ensureLiveIntelligenceSources();
  const db = await getDb();
  const vehicle = await loadVehicle(input.vehicleId);
  if (!vehicle) throw new Error(`Unknown vehicle ${input.vehicleId}`);
  const userId = input.userId ?? vehicle.userId;
  const [user] = await db.select().from(demoUsers).where(eq(demoUsers.id, userId)).limit(1);
  if (!user) throw new Error(`Unknown user ${userId}`);

  const interestRows = await db
    .select()
    .from(demoUserInterests)
    .where(eq(demoUserInterests.userId, userId));
  const modifications = await db
    .select()
    .from(vehicleModifications)
    .where(eq(vehicleModifications.vehicleId, vehicle.id));
  const { products: productRows, fitments } = await loadCandidates(db);
  const fitmentsByProduct = attachFitments(vehicle, productRows, fitments);
  const { classes, components } = await loadSafety(db);

  if (input.intent === "build") {
    if (!input.build) throw new Error("BUILD requires type, objectives, and budget");
    const buildConfig = loadBuildConfig();
    const [typeRow] = await db
      .select()
      .from(buildTypes)
      .where(eq(buildTypes.slug, input.build.type))
      .limit(1);
    if (!typeRow) throw new Error(`Unknown build type ${input.build.type}`);
    const objectiveRows = input.build.objectives.length
      ? await db.select().from(objectives)
      : [];
    const selectedObjectives = input.build.objectives
      .map((slug) => objectiveRows.find((row) => row.slug === slug))
      .filter((row): row is (typeof objectiveRows)[number] => Boolean(row));
    const [usageRow] = input.build.usage
      ? await db.select().from(usageTypes).where(eq(usageTypes.slug, input.build.usage)).limit(1)
      : [];
    const [styleRow] = input.build.style
      ? await db.select().from(styles).where(eq(styles.slug, input.build.style)).limit(1)
      : [];
    const [budgetRow] = input.build.budget
      ? await db.select().from(budgetBands).where(eq(budgetBands.slug, input.build.budget)).limit(1)
      : [];

    const context: BuildContext = {
      vehicle,
      buildType: typeRow.slug,
      buildTypeName: typeRow.name,
      objectives: selectedObjectives.map((row) => ({ slug: row.slug, name: row.name })),
      usage: usageRow?.slug,
      style: styleRow?.slug,
      budgetMax: budgetRow?.maxAmount ?? null,
      budgetName: budgetRow?.name,
      notes: input.build.notes,
      interests: interestRows.map((row) => row.interest),
      modifications,
    };
    const { results, trace } = runBuildPipeline({
      products: productRows,
      fitmentsByProduct,
      context,
      config: buildConfig,
      classes,
      components,
    });

    let buildId: string | undefined;
    if (input.persist !== false) {
      buildId = `bld_proof_${vehicle.id}_${typeRow.slug}`;
      const now = Date.now();
      const existing = await db.select().from(builds).where(eq(builds.id, buildId)).limit(1);
      const values = {
        id: buildId,
        userId,
        vehicleId: vehicle.id,
        name: input.build.name ?? typeRow.name,
        mode: "build" as const,
        buildTypeId: typeRow.id,
        usageId: usageRow?.id ?? null,
        budgetBandId: budgetRow?.id ?? null,
        styleId: styleRow?.id ?? null,
        intensity: input.build.intensity ?? "moderate",
        status: "active",
        createdAt: existing[0]?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing[0]) await db.update(builds).set(values).where(eq(builds.id, buildId));
      else await db.insert(builds).values(values);
      await db.delete(buildObjectives).where(eq(buildObjectives.buildId, buildId));
      for (const objective of selectedObjectives) {
        await db.insert(buildObjectives).values({ buildId, objectiveId: objective.id });
      }
      await persistResult({
        mode: "build",
        vehicle,
        userId,
        buildId,
        cards: results,
        fitmentsByProduct,
      }).catch(() => undefined);
    }
    return { mode: "build", vehicle, recommendations: results, trace };
  }

  if (!input.maintain) throw new Error("MAINTAIN requires type and component");
  const maintainConfig = loadMaintainConfig();
  const gradeSlug = normaliseReplacementGrade(input.maintain.grade);
  if (input.maintain.grade && !(REPLACEMENT_GRADES as readonly string[]).includes(input.maintain.grade)) {
    throw new Error(`Unknown replacement grade ${input.maintain.grade}`);
  }
  const [typeRow] = await db
    .select()
    .from(maintenanceTypes)
    .where(eq(maintenanceTypes.slug, input.maintain.type))
    .limit(1);
  if (!typeRow) throw new Error(`Unknown maintenance type ${input.maintain.type}`);
  const [gradeRow] = await db
    .select()
    .from(replacementGrades)
    .where(eq(replacementGrades.slug, gradeSlug))
    .limit(1);
  if (!gradeRow) throw new Error(`Unknown replacement grade ${gradeSlug}`);
  const [componentRow] = await db
    .select()
    .from(maintenanceComponents)
    .where(eq(maintenanceComponents.slug, input.maintain.component))
    .limit(1);
  const specialistRows = await db.select().from(specialists);
  const marqueRows = await db.select().from(specialistMarques);
  const specialistList: SpecialistRow[] = specialistRows.map((row) => ({
    ...row,
    marques: marqueRows
      .filter((marque) => marque.specialistId === row.id)
      .map((marque) => ({ make: marque.make, model: marque.model || null })),
  }));

  const { results, trace } = runMaintainPipeline({
    products: productRows,
    fitmentsByProduct,
    specialists: specialistList,
    context: {
      vehicle,
      type: typeRow.slug,
      component: componentRow?.slug ?? input.maintain.component,
      grade: gradeSlug,
      notes: input.maintain.notes,
      specification: vehicle.specification,
    },
    config: maintainConfig,
    classes,
    components,
  });

  if (input.persist !== false) {
    const requestId = `mnt_proof_${vehicle.id}_${typeRow.slug}_${input.maintain.component}_${gradeSlug}`;
    const now = Date.now();
    const existing = await db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);
    const values = {
      id: requestId,
      userId,
      vehicleId: vehicle.id,
      typeId: typeRow.id,
      componentId: componentRow?.id ?? null,
      replacementGradeId: gradeRow.id,
      symptom: input.maintain.symptom ?? null,
      urgency: input.maintain.urgency ?? "soon",
      mileage: input.maintain.mileage ?? null,
      notes: input.maintain.notes ?? null,
      status: typeRow.slug === "find-specialist" ? "looking_for_specialist" : "looking_for_parts",
      createdAt: existing[0]?.createdAt ?? now,
      completedAt: null,
    };
    if (existing[0]) await db.update(maintenanceRequests).set(values).where(eq(maintenanceRequests.id, requestId));
    else await db.insert(maintenanceRequests).values(values);
    await persistResult({
      mode: "maintain",
      vehicle,
      userId,
      requestId,
      cards: results,
      fitmentsByProduct,
    }).catch(() => undefined);
  }

  return { mode: "maintain", vehicle, recommendations: results, trace };
}
