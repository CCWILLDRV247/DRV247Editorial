import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listEditorial, listEngineSources } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sourceId: string }> },
) {
  getDb();
  const { sourceId } = await context.params;
  const source = listEngineSources().find((row) => row.id === sourceId);
  if (!source) {
    return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  }
  const articles = listEditorial({ sourceId, limit: 40 });
  return NextResponse.json({ source, articles });
}
