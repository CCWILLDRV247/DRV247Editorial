import { NextResponse } from "next/server";
import { listCategories } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ categories });
}
