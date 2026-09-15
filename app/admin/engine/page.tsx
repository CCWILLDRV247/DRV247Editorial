import { desc } from "drizzle-orm";
import { EngineDesk } from "@/components/admin/engine-desk";
import { ensureCultureArticles } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { articles, ingestionRuns, mediaSources } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function EngineAdminPage() {
  await ensureCultureArticles();
  const db = getDb();
  const sources = db.select().from(mediaSources).all();
  const runs = db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(20).all();
  const latest = db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(20).all();

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <EngineDesk sources={sources} runs={runs} articles={latest} />
      </div>
    </div>
  );
}
