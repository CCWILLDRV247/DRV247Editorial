export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Serverless instances do not keep this timer. Cold starts seed via ensureStories().
  if (process.env.VERCEL) return;

  const intervalMs = Number(process.env.INGEST_INTERVAL_MS ?? 15 * 60 * 1000);
  const { ingestAll } = await import("@/lib/ingest");

  setTimeout(() => {
    ingestAll().catch((error) => {
      console.error("[drv247] scheduled ingest failed", error);
    });
  }, 8_000);

  setInterval(() => {
    ingestAll().catch((error) => {
      console.error("[drv247] scheduled ingest failed", error);
    });
  }, intervalMs);
}
