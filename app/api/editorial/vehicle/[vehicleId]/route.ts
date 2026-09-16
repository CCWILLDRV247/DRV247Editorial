import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ vehicleId: string }> },
) {
  getDb();
  const { vehicleId } = await context.params;
  const articles = listEditorial({ vehicleId, limit: 40 });
  return NextResponse.json({ vehicleId, articles });
}
