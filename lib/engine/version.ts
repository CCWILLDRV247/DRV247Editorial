export const ENGINE_BRANCH = "cursor/dyler-events-skip-a0b6";
export const ENGINE_WAVE = "wave-6-97";

export function engineCommit() {
  return process.env.ENGINE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local";
}
