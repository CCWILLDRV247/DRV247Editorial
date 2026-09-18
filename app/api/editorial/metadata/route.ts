import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { backfillArticleMetadata } from "@/lib/engine/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  await requireAdmin();
  const result = await backfillArticleMetadata();
  return NextResponse.json(result);
}
