export const ENGINE_BRANCH = "cursor/editorial-loading-speed-1981";
export const ENGINE_WAVE = "wave-3-28";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
