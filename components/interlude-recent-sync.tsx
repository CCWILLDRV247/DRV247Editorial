"use client";

import { useEffect } from "react";
import {
  INTERLUDE_RECENT_COOKIE,
  INTERLUDE_RECENT_STORAGE_KEY,
  mergeInterludeRecent,
  parseInterludeRecentIds,
} from "@/lib/engine/interlude-recent";

/** Persist homepage interlude ids for cross-profile rotation on the next SSR request. */
export function InterludeRecentSync({ interludeIds }: { interludeIds: string[] }) {
  useEffect(() => {
    if (!interludeIds.length || typeof window === "undefined") return;
    const existing = parseInterludeRecentIds(window.localStorage.getItem(INTERLUDE_RECENT_STORAGE_KEY));
    const merged = mergeInterludeRecent(existing, interludeIds);
    const payload = JSON.stringify(merged);
    window.localStorage.setItem(INTERLUDE_RECENT_STORAGE_KEY, payload);
    document.cookie = `${INTERLUDE_RECENT_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=604800; SameSite=Lax`;
  }, [interludeIds.join("|")]);
  return null;
}
