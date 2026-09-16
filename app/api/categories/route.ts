import { NextResponse } from "next/server";
import { listCategories } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ categories });
}
