import { NextResponse } from "next/server";
import { ensureCultureArticles } from "@/lib/db/ensure";
import { listEditorial } from "@/lib/engine/queries";
import { ENGINE_BRANCH, ENGINE_WAVE, engineCommit } from "@/lib/engine/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  await ensureCultureArticles();
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
  return NextResponse.json(
    {
      engine: ENGINE_WAVE,
      branch: ENGINE_BRANCH,
      commit: engineCommit(),
      section: searchParams.get("section") ?? "for-you",
      user: searchParams.get("user") ?? "demo-chris",
      publications: [...new Set(articles.map((article) => article.publication))],
      articles,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
