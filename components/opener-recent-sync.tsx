"use client";

import { useEffect } from "react";
import {
  OPENER_RECENT_COOKIE,
  OPENER_RECENT_STORAGE_KEY,
  mergeOpenerRecent,
  parseOpenerRecent,
  serializeOpenerRecent,
} from "@/lib/engine/opener-recent";

/** Persist this week's opening-card ids so they cannot open next week. */
export function OpenerRecentSync({ openerIds }: { openerIds: number[] }) {
  useEffect(() => {
    if (!openerIds.length || typeof window === "undefined") return;
    const existing = parseOpenerRecent(window.localStorage.getItem(OPENER_RECENT_STORAGE_KEY));
    const merged = mergeOpenerRecent(existing, openerIds);
    const payload = serializeOpenerRecent(merged);
    window.localStorage.setItem(OPENER_RECENT_STORAGE_KEY, payload);
    document.cookie = `${OPENER_RECENT_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=1209600; SameSite=Lax`;
  }, [openerIds.join("|")]);
  return null;
}
