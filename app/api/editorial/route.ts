import { NextResponse } from "next/server";
import { forYouTestIsActive, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { listEditorial } from "@/lib/engine/queries";
import { contextFromTestProfile } from "@/lib/engine/personalize";
import { buildRelevanceDebugRow } from "@/lib/engine/relevance-explanation";
import {
  bucketRankSignals,
  formatRelevanceEngineDebug,
} from "@/lib/engine/relevance-engine";
import { formatQualityFilterDebug } from "@/lib/engine/quality-filter";
import { ENGINE_BRANCH, ENGINE_WAVE, engineCommit } from "@/lib/engine/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testProfile = parseForYouTestProfile(searchParams);
  const testing = forYouTestIsActive(testProfile);
  const strict = searchParams.get("strict") === "1";
  const profileContext = testing ? contextFromTestProfile(testProfile) : null;
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
        ? articles.slice(0, 16).map((article) => {
            const row = buildRelevanceDebugRow(
              article,
              profileContext?.vehicles ?? [],
              profileContext?.interests ?? [],
            );
            const buckets = bucketRankSignals(article.rankSignals);
            return {
              id: row.id,
              title: row.title,
              score: row.score,
              why: row.why,
              vehicleTier: row.vehicleTier,
              signals: row.signals,
              matches: row.matches,
              user: row.user,
              explanation: row.explanation,
              confidence: row.confidence,
              drvRelevance: article.drvRelevance,
              userRelevance: article.userRelevance,
              passedQualityGate: article.passedQualityGate,
              qualityBand: article.qualityBand,
              qualityReason: article.qualityReason,
              editorialEligible: article.editorialEligible,
              editorialExclusionReason: article.editorialExclusionReason,
              debug: [
                formatRelevanceEngineDebug({
                  title: row.title,
                  engine: {
                    ...buckets,
                    drvRelevance: article.drvRelevance,
                    userRelevance: article.userRelevance,
                    totalScore: article.rankScore,
                    passedQualityGate: article.passedQualityGate,
                    gateNote: article.relevanceGateNote,
                  },
                  explanation: row.explanation,
                }),
                formatQualityFilterDebug({
                  quality: {
                    band: article.qualityBand,
                    reason: article.qualityReason,
                    automotiveScore: article.qualityAutomotiveScore,
                    showInPrimaryFeed: article.showInPrimaryFeed,
                    sortPenalty: 0,
                  },
                  engine: {
                    ...buckets,
                    drvRelevance: article.drvRelevance,
                    userRelevance: article.userRelevance,
                    totalScore: article.rankScore,
                    passedQualityGate: article.passedQualityGate,
                    gateNote: article.relevanceGateNote,
                  },
                }),
              ].join("\n\n"),
            };
          })
        : null,
      publications: [...new Set(articles.map((article) => article.publication))],
      articles,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
