import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  getDb();
  const { searchParams } = new URL(request.url);
  const articles = listEditorial({
    userId: searchParams.get("user") ?? "demo-chris",
    section: searchParams.get("section") ?? "for-you",
    sourceId: searchParams.get("source") ?? undefined,
    make: searchParams.get("make") ?? undefined,
    model: searchParams.get("model") ?? undefined,
    generation: searchParams.get("generation") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    interest: searchParams.get("interest") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 40),
  });
  return NextResponse.json({
    section: searchParams.get("section") ?? "for-you",
    user: searchParams.get("user") ?? "demo-chris",
    articles,
  });
}
