import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { reprocessArticles } from "@/lib/engine/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  await requireAdmin();
  getDb();
  const count = await reprocessArticles();
  return NextResponse.json({ reprocessed: count });
}
