import { getDb } from "@/lib/db";

/** Schema/seed only. Do not ingest on page load — that made Vercel cold starts ~42s. */
export async function ensureStories() {
  await getDb();
}

export async function ensureCultureArticles() {
  await getDb();
}
