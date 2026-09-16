export async function register() {
  // Ingest is weekly via Vercel cron (`/api/cron/ingest`) plus desk ingest-now.
  // Do not pull feeds on boot — that made serverless homepages ~42s.
}
