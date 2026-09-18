export const ENGINE_BRANCH = "cursor/editorial-metadata-f4cb";
export const ENGINE_WAVE = "wave-6-74";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
