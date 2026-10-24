/** Viewport-gated Keep Exploring analytics — Vercel only (see docs/keep-exploring.md). */

import type { KeepExploringReason } from "@/lib/engine/keep-exploring";

export const KEEP_EXPLORING_ANALYTICS = {
  section: "keep_exploring_section_impression",
  card: "keep_exploring_card_impression",
  click: "keep_exploring_card_click",
} as const;

export type KeepExploringAnalyticsPayload = {
  currentArticleId: number;
  recommendedArticleId?: number;
  position?: number;
  reason?: KeepExploringReason;
  categorySlug?: string;
  sessionKey?: string;
};

export async function trackKeepExploring(
  name: (typeof KEEP_EXPLORING_ANALYTICS)[keyof typeof KEEP_EXPLORING_ANALYTICS],
  data: KeepExploringAnalyticsPayload,
): Promise<void> {
  try {
    const { track } = await import("@vercel/analytics");
    track(name, data);
  } catch {
    // Analytics must never block navigation or impressions.
  }
}
