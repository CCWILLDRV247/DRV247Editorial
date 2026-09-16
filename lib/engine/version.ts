export const ENGINE_BRANCH = "cursor/taxonomy-nav-9d2e";
export const ENGINE_WAVE = "wave-2-19";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
