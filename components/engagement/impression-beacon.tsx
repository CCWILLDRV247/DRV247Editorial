"use client";

import { useEffect } from "react";
import { IMPRESSION_EVENT, uniquePositiveIds, type ImpressionSurface } from "@/lib/engagement/impressions";

/**
 * Batched served-id beacon. Fires after paint. Not in-view tracking.
 * Magazine HTML stays cacheable; this must not block first paint.
 */
export function ImpressionBeacon({
  articleIds,
  surface,
}: {
  articleIds: readonly (number | null | undefined)[];
  surface: Exclude<ImpressionSurface, "editorial_api">;
}) {
  const ids = uniquePositiveIds(articleIds);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    const fire = () => {
      if (cancelled) return;
      void fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          event: IMPRESSION_EVENT,
          articleIds: idsKey.split(",").map(Number),
          surface,
        }),
      }).catch(() => {
        // Beacon failures must not affect the magazine.
      });
    };
    const timeoutId = window.setTimeout(fire, 1);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [idsKey, surface]);

  return null;
}
