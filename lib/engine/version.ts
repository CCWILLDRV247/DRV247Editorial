export const ENGINE_BRANCH = "cursor/junk-story-purge-9354";
export const ENGINE_WAVE = "wave-5-46";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
