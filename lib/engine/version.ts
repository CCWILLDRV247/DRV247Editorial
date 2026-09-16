export const ENGINE_BRANCH = "cursor/wave2-sources-9d2e";
export const ENGINE_WAVE = "wave-2-21";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
