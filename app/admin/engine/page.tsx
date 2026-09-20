import { desc } from "drizzle-orm";
import { EngineDesk } from "@/components/admin/engine-desk";
import { getDb } from "@/lib/db";
import { articles, ingestionRuns, mediaSources } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EngineAdminPage() {
  const db = await getDb();
  const sources = await db.select().from(mediaSources);
  const runs = await db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(20);
  const latest = await db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(20);

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <EngineDesk sources={sources} runs={runs} articles={latest} />
      </div>
    </div>
  );
}
