"use client";

import { useEffect, useState } from "react";
import { ENGAGEMENT_EVENTS } from "@/lib/engagement/events";
import { signalMeaningfulEngage } from "@/lib/engagement/feedback";
import { recordMagazineEngagement } from "@/lib/engagement/record";
import {
  articleRelevancePolarity,
  readArticleRelevance,
  toggleArticleRelevanceInStorage,
  type ArticleRelevancePolarity,
} from "@/lib/engagement/relevance";

const actionClass = (on: boolean) =>
  on
    ? "flex h-11 w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
    : "flex h-11 w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white font-display text-lg font-extrabold uppercase text-[#1b1d1f]";

export function StoryRelevance({ articleId }: { articleId: number }) {
  const [polarity, setPolarity] = useState<ArticleRelevancePolarity | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPolarity(articleRelevancePolarity(readArticleRelevance(), articleId));
  }, [articleId]);

  function onMark(next: ArticleRelevancePolarity) {
    const result = toggleArticleRelevanceInStorage(articleId, next);
    setPolarity(result.polarity);
    signalMeaningfulEngage();
    if (result.polarity === "interested") {
      void recordMagazineEngagement({
        name: ENGAGEMENT_EVENTS.interested,
        data: { articleId },
      });
      setStatus("We’ll show you more like this.");
      return;
    }
    if (result.polarity === "less") {
      void recordMagazineEngagement({
        name: ENGAGEMENT_EVENTS.lessLike,
        data: { articleId },
      });
      setStatus("We’ll show you fewer like this.");
      return;
    }
    setStatus("Mark cleared.");
  }

  return (
    <div className="mt-3">
      <p className="mb-2 font-display text-sm font-bold uppercase tracking-[0.06em] text-[#1b1d1f]/55">
        Relevance — not a quality rating
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMark("interested")}
          aria-pressed={polarity === "interested"}
          className={actionClass(polarity === "interested")}
        >
          Interested
        </button>
        <button
          type="button"
          onClick={() => onMark("less")}
          aria-pressed={polarity === "less"}
          className={actionClass(polarity === "less")}
        >
          Less like this
        </button>
      </div>
      <p className="mt-2 min-h-5 text-[14px] leading-5 text-[#1b1d1f]/70" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
