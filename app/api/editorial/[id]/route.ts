import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  getDb();
  const { id } = await context.params;
  const article = getEditorial(Number(id));
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  return NextResponse.json({ article });
}
