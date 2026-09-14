import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await ingestAll();
  return NextResponse.json({ results });
}

export async function POST() {
  const results = await ingestAll();
  return NextResponse.json({ results });
}
