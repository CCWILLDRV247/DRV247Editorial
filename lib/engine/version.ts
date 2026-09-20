export const ENGINE_BRANCH = "cursor/wave4-ingest-fa44";
export const ENGINE_WAVE = "wave-5-46";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
