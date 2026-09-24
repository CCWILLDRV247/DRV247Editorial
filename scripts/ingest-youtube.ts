import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";
import { DEMO_YOUTUBE_SOURCE_ID } from "../lib/engine/youtube-sources";

async function main() {
  if (process.env.TURSO_DATABASE_URL && process.env.YOUTUBE_ALLOW_REMOTE !== "1") {
    throw new Error(
      "Refusing YouTube ingest against Turso. Unset TURSO_DATABASE_URL for local mock preview, or set YOUTUBE_ALLOW_REMOTE=1.",
    );
  }
  await getDb();
  const ids = process.argv.slice(2);
  const target = ids.length ? ids : [DEMO_YOUTUBE_SOURCE_ID];
  console.log("YouTube ingest:", target.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(target), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
