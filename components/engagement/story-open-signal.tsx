"use client";

import { useEffect } from "react";
import { ENGAGEMENT_EVENTS } from "@/lib/engagement/events";
import { recordMagazineEngagement } from "@/lib/engagement/record";

/** Records a teaser open once per mount. Opens never create a garage inference. */
export function StoryOpenSignal({ articleId }: { articleId: number }) {
  useEffect(() => {
    if (!Number.isInteger(articleId) || articleId <= 0) return;
    void recordMagazineEngagement({
      name: ENGAGEMENT_EVENTS.open,
      data: { articleId },
    });
  }, [articleId]);
  return null;
}
