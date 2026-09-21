export const ENGINE_BRANCH = "cursor/content-hygiene-fa94";
export const ENGINE_WAVE = "wave-6-98";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
