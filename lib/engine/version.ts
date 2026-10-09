export const ENGINE_BRANCH = "cursor/weekly-freshness-ad06";
export const ENGINE_WAVE = "wave-7-02";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
