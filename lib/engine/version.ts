export const ENGINE_BRANCH = "cursor/persistent-turso-9d2e";
export const ENGINE_WAVE = "wave-1-10";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
