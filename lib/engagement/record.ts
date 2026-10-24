import { FOR_YOU_TEST_STORAGE_KEY, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import type { EngagementEventPayload } from "./events";
import { trackEngagement } from "./events";
import { writeEventFromAnalyticsName, type EngagementWriteEvent } from "./ingest";
import { recordRecentInteractionInStorage, type RecentInteractionKind } from "./recent";

const ANALYTICS_TO_RECENT: Partial<Record<EngagementEventPayload["name"], RecentInteractionKind>> = {
  story_share: "share",
  story_save: "save",
  outbound_original_click: "outbound",
  story_open: "open",
};

export function explicitCohortFromStoredQuery(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const profile = parseForYouTestProfile(new URLSearchParams(raw));
  return profile.make || profile.interests[0] || undefined;
}

export function readExplicitCohort(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return explicitCohortFromStoredQuery(window.localStorage.getItem(FOR_YOU_TEST_STORAGE_KEY));
}

function articleIdFromEvent(event: EngagementEventPayload): number | null {
  if (event.name === "experience_feedback") return null;
  return "articleId" in event.data ? event.data.articleId : null;
}

async function postEngagementWrite(event: EngagementWriteEvent, articleId: number | null): Promise<void> {
  try {
    await fetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        ...(articleId != null ? { articleId } : {}),
        ...(readExplicitCohort() ? { cohort: readExplicitCohort() } : {}),
      }),
      keepalive: true,
    });
  } catch {
    // Turso ingest must never block share, save, or marks.
  }
}

/** Vercel Analytics + Turso write + local recency. Failures never throw. */
export async function recordMagazineEngagement(event: EngagementEventPayload): Promise<void> {
  const articleId = articleIdFromEvent(event);
  const recentKind = ANALYTICS_TO_RECENT[event.name];
  if (recentKind && articleId) {
    try {
      recordRecentInteractionInStorage({ articleId, kind: recentKind, at: Date.now() });
    } catch {
      // localStorage can be blocked.
    }
  }
  void trackEngagement(event);
  const writeEvent = writeEventFromAnalyticsName(event.name);
  if (writeEvent) {
    void postEngagementWrite(writeEvent, articleId);
  }
}
