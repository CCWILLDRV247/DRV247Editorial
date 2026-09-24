import { ingestEnabledSources } from "../lib/engine/pipeline";
import { DEMO_YOUTUBE_SOURCE_ID } from "../lib/engine/youtube-sources";

const ids = process.argv.slice(2);
const target = ids.length ? ids : [DEMO_YOUTUBE_SOURCE_ID];
console.log("YouTube ingest:", target.join(", "));
console.log(JSON.stringify(await ingestEnabledSources(target), null, 2));
