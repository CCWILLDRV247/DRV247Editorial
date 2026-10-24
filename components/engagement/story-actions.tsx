"use client";

import { useEffect, useState } from "react";
import { ENGAGEMENT_EVENTS } from "@/lib/engagement/events";
import { recordMagazineEngagement } from "@/lib/engagement/record";
import { signalMeaningfulEngage } from "@/lib/engagement/feedback";
import { isArticleSaved, readSavedArticleIds, toggleSavedArticleInStorage } from "@/lib/engagement/saved";
import { shareEditorialStory } from "@/lib/engagement/share";

const actionClass =
  "flex h-11 w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white font-display text-lg font-extrabold uppercase text-[#1b1d1f]";

export function StoryActions({
  articleId,
  title,
  text,
}: {
  articleId: number;
  title: string;
  text?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSaved(isArticleSaved(readSavedArticleIds(), articleId));
  }, [articleId]);

  async function onShare() {
    const result = await shareEditorialStory({ articleId, title, text });
    if (result.method === "failed") {
      setStatus("Couldn’t share that teaser.");
      return;
    }
    signalMeaningfulEngage();
    void recordMagazineEngagement({
      name: ENGAGEMENT_EVENTS.share,
      data: { articleId, method: result.method },
    });
    setStatus(result.method === "copy" ? "Editorial link copied." : "Shared.");
  }

  function onSave() {
    const result = toggleSavedArticleInStorage(articleId);
    setSaved(result.saved);
    signalMeaningfulEngage();
    void recordMagazineEngagement({
      name: result.saved ? ENGAGEMENT_EVENTS.save : ENGAGEMENT_EVENTS.unsave,
      data: { articleId },
    });
    setStatus(result.saved ? "Saved on this phone." : "Removed from Saved.");
  }

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void onShare()} className={actionClass}>
          Share
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-pressed={saved}
          className={actionClass}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <p className="mt-2 min-h-5 text-[14px] leading-5 text-[#1b1d1f]/70" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
