import { NextResponse } from "next/server";
import { listPublicStories } from "@/lib/stories";
import { getCategoryBySlug } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("category");
  const limit = Number(searchParams.get("limit") ?? 40);
  let categoryId: number | undefined;
  if (slug) {
    const category = await getCategoryBySlug(slug);
    if (!category) {
      return NextResponse.json({ error: "Unknown category" }, { status: 404 });
    }
    categoryId = category.id;
  }
  const stories = await listPublicStories({ categoryId, limit });
  return NextResponse.json({ stories });
}
