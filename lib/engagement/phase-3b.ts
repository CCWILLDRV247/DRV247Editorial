/** Phase 3B public discovery. Default off. 3A must not turn this on. */
export const PHASE_3B_ENV = "DRV247_PHASE_3B";

export function isPhase3bEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[PHASE_3B_ENV];
  return raw === "1" || raw === "true";
}
