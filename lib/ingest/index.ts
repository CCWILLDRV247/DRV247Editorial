import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sources, stories, type Source } from "@/lib/db/schema";
import { ingestNewsApi } from "./newsapi";
import { ingestRss } from "./rss";
import type { IngestedItem } from "./types";
import { ingestYoutube } from "./youtube";

export type IngestResult = {
  sourceId: number;
  sourceName: string;
  fetched: number;
  inserted: number;
  usedMock: boolean;
  error: string | null;
};

async function itemsForSource(
  source: Source,
): Promise<{ items: IngestedItem[]; usedMock: boolean }> {
  if (source.type === "rss") {
    return { items: await ingestRss(source.identifier), usedMock: false };
  }
  if (source.type === "youtube") {
    return ingestYoutube(source.identifier);
  }
  return ingestNewsApi(source.identifier);
}

function insertItems(source: Source, items: IngestedItem[]) {
  const db = getDb();
  const now = Date.now();
  let inserted = 0;

  for (const item of items) {
    const result = db
      .insert(stories)
      .values({
        sourceId: source.id,
        categoryId: source.defaultCategoryId,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        canonicalUrl: item.canonicalUrl,
        publishedAt: item.publishedAt,
        hidden: false,
        createdAt: now,
      })
      .onConflictDoNothing({ target: stories.canonicalUrl })
      .run();
    inserted += result.changes;
  }

  return inserted;
}

export async function ingestSource(sourceId: number): Promise<IngestResult> {
  const db = getDb();
  const source = db.select().from(sources).where(eq(sources.id, sourceId)).get();
  if (!source) {
    return {
      sourceId,
      sourceName: "unknown",
      fetched: 0,
      inserted: 0,
      usedMock: false,
      error: "Source not found",
    };
  }
  if (!source.enabled) {
    return {
      sourceId,
      sourceName: source.name,
      fetched: 0,
      inserted: 0,
      usedMock: false,
      error: "Source is disabled",
    };
  }

  db.update(sources)
    .set({ lastFetchStatus: "running", lastFetchError: null })
    .where(eq(sources.id, source.id))
    .run();

  try {
    const { items, usedMock } = await itemsForSource(source);
    const inserted = insertItems(source, items);
    const note = usedMock
      ? "Used local mock (no API key). Add YOUTUBE_API_KEY or NEWSAPI_KEY for live data."
      : null;
    db.update(sources)
      .set({
        lastFetchAt: Date.now(),
        lastFetchStatus: "ok",
        lastFetchError: note,
      })
      .where(eq(sources.id, source.id))
      .run();
    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched: items.length,
      inserted,
      usedMock,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    db.update(sources)
      .set({
        lastFetchAt: Date.now(),
        lastFetchStatus: "error",
        lastFetchError: message,
      })
      .where(eq(sources.id, source.id))
      .run();
    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched: 0,
      inserted: 0,
      usedMock: false,
      error: message,
    };
  }
}

export async function ingestAll(): Promise<IngestResult[]> {
  const db = getDb();
  const enabled = db.select().from(sources).where(eq(sources.enabled, true)).all();
  const results: IngestResult[] = [];
  for (const source of enabled) {
    results.push(await ingestSource(source.id));
  }
  return results;
}
