import { desc } from "drizzle-orm";
import { EngineDesk } from "@/components/admin/engine-desk";
import { YoutubeSourceForm } from "@/components/admin/youtube-source-form";
import { getDb } from "@/lib/db";
import { articles, ingestionRuns, mediaSources } from "@/lib/db/schema";
import { listClassificationDebug } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EngineAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ youtube?: string; youtube_error?: string; name?: string }>;
}) {
  const db = await getDb();
  const params = await searchParams;
  const sources = await db.select().from(mediaSources);
  const runs = await db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(20);
  const latest = await db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(20);
  const classified = await listClassificationDebug(24);
  const notice = youtubeNotice(params);

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <EngineDesk sources={sources} runs={runs} articles={latest} classified={classified}>
          <YoutubeSourceForm notice={notice} />
        </EngineDesk>
      </div>
    </div>
  );
}

function youtubeNotice(params: { youtube?: string; youtube_error?: string; name?: string }) {
  if (params.youtube === "added") {
    return { ok: true, text: `Added ${params.name || "channel"}. Run ingest on that row to pull videos.` };
  }
  if (params.youtube === "updated") {
    return { ok: true, text: `Updated ${params.name || "channel"}.` };
  }
  if (params.youtube === "error") {
    return { ok: false, text: params.youtube_error || "Could not add that channel" };
  }
  return null;
}
