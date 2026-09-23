import { getDb } from "../lib/db";
import { purgeNonEditorialArticles } from "../lib/engine/pipeline";
import { mediaSources } from "../lib/db/schema";
import { DISABLED_SOURCE_SET, ENABLED_SOURCE_SET } from "../config/wave1-sources";

const KEEP_ENABLED = ["auto_020", "auto_023"] as const;
const KEEP_DISABLED = ["auto_049"] as const;

async function main() {
  const db = await getDb();
  const result = await purgeNonEditorialArticles();
  const sources = await db.select().from(mediaSources);
  const byId = new Map(sources.map((source) => [source.id, source]));
  console.log(
    JSON.stringify(
      {
        removed: result.removed,
        rows: result.rows,
        pistonHeads: sourceState(byId.get("auto_023")),
        classicSportsCar: sourceState(byId.get("auto_020")),
        nineWerks: sourceState(byId.get("auto_049")),
        keepEnabled: KEEP_ENABLED.map((id) => ({
          id,
          dbEnabled: byId.get(id)?.enabled ?? null,
          inEnabledSet: ENABLED_SOURCE_SET.has(id),
          inDisabledSet: DISABLED_SOURCE_SET.has(id),
        })),
        keepDisabled: KEEP_DISABLED.map((id) => ({
          id,
          dbEnabled: byId.get(id)?.enabled ?? null,
          inEnabledSet: ENABLED_SOURCE_SET.has(id),
          inDisabledSet: DISABLED_SOURCE_SET.has(id),
        })),
      },
      null,
      2,
    ),
  );
}

function sourceState(source: { id: string; publication: string; enabled: boolean } | undefined) {
  if (!source) return null;
  return { id: source.id, publication: source.publication, enabled: source.enabled };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
