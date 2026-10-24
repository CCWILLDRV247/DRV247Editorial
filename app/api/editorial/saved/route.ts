import { NextResponse } from "next/server";
import { listMagazineStoriesByIds } from "@/lib/engine/magazine";
import { SAVED_ARTICLES_MAX, normalizeSavedArticleIds } from "@/lib/engagement/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = normalizeSavedArticleIds(searchParams.getAll("ids").flatMap((value) => value.split(",")));
  const stories = await listMagazineStoriesByIds(ids.slice(0, SAVED_ARTICLES_MAX));
  return NextResponse.json({ stories });
}
