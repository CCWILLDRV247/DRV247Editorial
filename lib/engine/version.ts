export const ENGINE_BRANCH = "explore/ingest-personalization";
export const ENGINE_WAVE = "wave-1-10";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
