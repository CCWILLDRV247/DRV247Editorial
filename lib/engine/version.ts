export const ENGINE_BRANCH = "cursor/back-button-124d";
export const ENGINE_WAVE = "wave-6-97";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
