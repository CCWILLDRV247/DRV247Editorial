import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rankedListEntries } from "@/lib/db/schema";
import { CONTENT_PRIMARY_SLUGS } from "../../config/magazine-nav";
import type { QualityBand } from "./quality-filter";
import type { VehicleTier } from "./rank";

export const RANKED_LIST_LIMIT = 80;

export const DEFAULT_RANKED_LIST_KEYS = [
  `for-you:${RANKED_LIST_LIMIT}`,
  ...CONTENT_PRIMARY_SLUGS.map((slug) => `${slug}:${RANKED_LIST_LIMIT}`),
] as const;

export type RankedListSnapshotRow = {
  listKey: string;
  position: number;
  articleId: number;
  score: number;
  qualityBand: QualityBand;
  showInPrimaryFeed: boolean;
  vehicleTier: VehicleTier;
  computedAt: number;
};

export function parseRankedListKey(
  key: string,
): { section: string; limit: number; profileQuery: string | null } | null {
  const parts = key.split(":");
  if (parts.length < 2 || !parts[0]) return null;
  const limit = Number(parts[1]);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const profileQuery = parts.slice(2).join(":") || null;
  return { section: parts[0], limit, profileQuery };
}

export async function readRankedList(listKey: string): Promise<RankedListSnapshotRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(rankedListEntries)
    .where(eq(rankedListEntries.listKey, listKey));
  return rows
    .map((row) => ({
      listKey: row.listKey,
      position: row.position,
      articleId: row.articleId,
      score: row.score,
      qualityBand: row.qualityBand as QualityBand,
      showInPrimaryFeed: Boolean(row.showInPrimaryFeed),
      vehicleTier: row.vehicleTier as VehicleTier,
      computedAt: row.computedAt,
    }))
    .sort((a, b) => a.position - b.position);
}

export async function writeRankedList(
  listKey: string,
  items: {
    id: number;
    rankScore: number;
    qualityBand: QualityBand;
    showInPrimaryFeed: boolean;
    vehicleTier: VehicleTier;
  }[],
) {
  const db = await getDb();
  const computedAt = Date.now();
  await db.delete(rankedListEntries).where(eq(rankedListEntries.listKey, listKey));
  if (!items.length) return;
  await db.insert(rankedListEntries).values(
    items.map((item, position) => ({
      listKey,
      position,
      articleId: item.id,
      score: Math.round(item.rankScore),
      qualityBand: item.qualityBand,
      showInPrimaryFeed: item.showInPrimaryFeed,
      vehicleTier: item.vehicleTier,
      computedAt,
    })),
  );
}
