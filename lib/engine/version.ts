export const ENGINE_BRANCH = "cursor/restore-editorial-intelligence-1b18";
export const ENGINE_WAVE = "wave-6-99";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
