import { NextResponse } from "next/server";
import { forYouTestIsActive, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { listEditorial } from "@/lib/engine/queries";
import { ENGINE_BRANCH, ENGINE_WAVE, engineCommit } from "@/lib/engine/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testProfile = parseForYouTestProfile(searchParams);
  const testing = forYouTestIsActive(testProfile);
  const strict = searchParams.get("strict") === "1";
  const articles = await listEditorial({
    userId: testing ? undefined : (searchParams.get("user") ?? undefined),
    section: searchParams.get("section") ?? "for-you",
    sourceId: searchParams.get("source") ?? undefined,
    testProfile: testing ? testProfile : undefined,
    hardFilter: strict || undefined,
    make: testing ? undefined : (searchParams.get("make") ?? undefined),
    model: testing ? undefined : (searchParams.get("model") ?? undefined),
    generation: testing ? undefined : (searchParams.get("generation") ?? undefined),
    category: searchParams.get("category") ?? undefined,
    interest: testing ? undefined : (searchParams.get("interest") ?? undefined),
    q: searchParams.get("q") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 40),
  });
  return NextResponse.json(
    {
      engine: ENGINE_WAVE,
      branch: ENGINE_BRANCH,
      commit: engineCommit(),
      section: searchParams.get("section") ?? "for-you",
      user: testing ? "test-filter" : (searchParams.get("user") ?? null),
      testProfile: testing ? testProfile : null,
      ranking: testing
        ? articles.map((article) => ({
            id: article.id,
            title: article.title,
            score: article.rankScore,
            why: article.why,
            vehicleTier: article.vehicleTier,
            signals: article.rankSignals,
          }))
        : null,
      publications: [...new Set(articles.map((article) => article.publication))],
      articles,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
