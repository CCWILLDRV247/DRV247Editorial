import { ingestEnabledSources } from "@/lib/engine/pipeline";
import { getDb } from "@/lib/db";
import { mediaSources } from "@/lib/db/schema";

const globalForIngest = globalThis as unknown as {
  drvEnsureCulture?: Promise<void>;
};

/** v1 RSS is leftover on this branch — do not auto-fill the homepage with it. */
export async function ensureStories() {
  return;
}

export async function ensureCultureArticles() {
  const db = getDb();
  const pending = db
    .select()
    .from(mediaSources)
    .all()
    .filter((source) => source.enabled && source.lastSuccessAt == null && source.lastFailureAt == null)
    .map((source) => source.id);
  if (!pending.length) return;

  if (!globalForIngest.drvEnsureCulture) {
    globalForIngest.drvEnsureCulture = ingestEnabledSources(pending)
      .then(() => undefined)
      .catch((error) => {
        console.error("[drv247] culture ingest failed", error);
        globalForIngest.drvEnsureCulture = undefined;
      });
  }

  await globalForIngest.drvEnsureCulture;
}
