export const ENGINE_BRANCH = "cursor/type7-ingest-b6ae";
export const ENGINE_WAVE = "wave-7-01";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
