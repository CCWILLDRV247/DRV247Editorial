/** Desk "Ingest now" with no body must hit the culture engine, not v1 RSS. */
export function adminIngestMode(body: { sourceId?: number; pipeline?: string } | null) {
  if (body?.pipeline === "v1" || typeof body?.sourceId === "number") return "v1" as const;
  return "culture" as const;
}
