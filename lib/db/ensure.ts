import { count } from "drizzle-orm";
import { ingestAll } from "@/lib/ingest";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";

const globalForIngest = globalThis as unknown as {
  drvEnsureStories?: Promise<void>;
};

export async function ensureStories() {
  const db = getDb();
  const [{ value }] = db.select({ value: count() }).from(stories).all();
  if (value > 0) return;

  if (!globalForIngest.drvEnsureStories) {
    globalForIngest.drvEnsureStories = ingestAll()
      .then(() => undefined)
      .catch((error) => {
        globalForIngest.drvEnsureStories = undefined;
        throw error;
      });
  }

  await globalForIngest.drvEnsureStories;

  const [{ value: after }] = db.select({ value: count() }).from(stories).all();
  if (after === 0) {
    globalForIngest.drvEnsureStories = undefined;
  }
}
