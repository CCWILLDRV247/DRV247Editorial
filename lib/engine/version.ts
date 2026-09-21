export const ENGINE_BRANCH = "cursor/interlude-red-rule-0c1e";
export const ENGINE_WAVE = "wave-6-89";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
