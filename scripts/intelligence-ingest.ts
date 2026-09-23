import { ingestIntelligenceSources } from "../lib/intelligence/ingest";

async function main() {
  const sourceIds = process.argv.slice(2).filter((value) => !value.startsWith("-"));
  const result = await ingestIntelligenceSources({
    sourceIds: sourceIds.length ? sourceIds : undefined,
    cwd: process.cwd(),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
