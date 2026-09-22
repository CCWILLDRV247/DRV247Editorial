import { NextResponse } from "next/server";
import { recommend } from "@/lib/intelligence";
import type { BuildInput, Intent, MaintainInput } from "@/lib/intelligence/types";
import { INTENTS } from "@/lib/intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseObjectives(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function fromSearchParams(searchParams: URLSearchParams) {
  const intent = (searchParams.get("intent") ?? "build") as Intent;
  const vehicleId = searchParams.get("vehicleId") ?? searchParams.get("vehicle") ?? "";
  const debug = searchParams.get("debug") === "1";
  const build: BuildInput | undefined =
    intent === "build"
      ? {
          type: searchParams.get("type") ?? "fast-street",
          objectives: parseObjectives(searchParams.get("objectives")),
          usage: searchParams.get("usage") ?? undefined,
          style: searchParams.get("style") ?? undefined,
          budget: searchParams.get("budget") ?? undefined,
          intensity: searchParams.get("intensity") ?? undefined,
        }
      : undefined;
  const maintain: MaintainInput | undefined =
    intent === "maintain"
      ? {
          type: searchParams.get("type") ?? "replace",
          component: searchParams.get("component") ?? "",
          urgency: searchParams.get("urgency") ?? undefined,
          notes: searchParams.get("notes") ?? undefined,
        }
      : undefined;
  return {
    intent,
    vehicleId,
    userId: searchParams.get("user") ?? undefined,
    build,
    maintain,
    debug,
  };
}

function serializeResult(
  result: Awaited<ReturnType<typeof recommend>>,
  debug: boolean,
) {
  return {
    mode: result.mode,
    vehicle: {
      id: result.vehicle.id,
      make: result.vehicle.make,
      model: result.vehicle.model,
      generation: result.vehicle.generation,
      variant: result.vehicle.variant,
      year: result.vehicle.year,
      engine: result.vehicle.engine,
    },
    recommendations: result.recommendations.map((card) => ({
      kind: card.kind,
      name: card.name,
      image: card.image,
      manufacturer: card.manufacturer,
      category: card.category,
      price: card.price,
      currency: card.currency,
      supplier: card.supplier,
      fitmentLabel: card.fitmentLabel,
      fitmentConfidence: card.fitmentConfidence,
      reasons: card.reasons,
      url: card.url,
      recommendationConfidence: card.recommendationConfidence,
      location: card.location ?? null,
    })),
    ...(debug ? { trace: result.trace } : {}),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = fromSearchParams(searchParams);
  return run(payload);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    intent?: Intent;
    vehicleId?: string;
    userId?: string;
    build?: BuildInput;
    maintain?: MaintainInput;
    debug?: boolean;
  };
  return run({
    intent: body.intent ?? "build",
    vehicleId: body.vehicleId ?? "",
    userId: body.userId,
    build: body.build,
    maintain: body.maintain,
    debug: Boolean(body.debug),
  });
}

async function run(payload: {
  intent: Intent;
  vehicleId: string;
  userId?: string;
  build?: BuildInput;
  maintain?: MaintainInput;
  debug: boolean;
}) {
  if (!INTENTS.includes(payload.intent)) {
    return NextResponse.json({ error: "intent must be build, maintain, or restore" }, { status: 400 });
  }
  if (payload.intent === "restore") {
    return NextResponse.json(
      { error: "restore is reserved and not implemented in V1" },
      { status: 400 },
    );
  }
  if (!payload.vehicleId) {
    return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
  }
  try {
    const result = await recommend({
      intent: payload.intent,
      vehicleId: payload.vehicleId,
      userId: payload.userId,
      build: payload.build,
      maintain: payload.maintain,
    });
    return NextResponse.json(serializeResult(result, payload.debug), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recommendation failed";
    const status = /unknown/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
