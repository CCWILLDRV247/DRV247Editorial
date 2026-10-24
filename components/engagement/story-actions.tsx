"use client";

import { useEffect, useState } from "react";
import { Bookmark, CheckIcon, Heart, MoreHorizontal, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ENGAGEMENT_EVENTS } from "@/lib/engagement/events";
import { recordMagazineEngagement } from "@/lib/engagement/record";
import { signalMeaningfulEngage } from "@/lib/engagement/feedback";
import { isArticleSaved, readSavedArticleIds, toggleSavedArticleInStorage } from "@/lib/engagement/saved";
import { shareEditorialStory } from "@/lib/engagement/share";
import {
  articleRelevancePolarity,
  readArticleRelevance,
  toggleArticleRelevanceInStorage,
  type ArticleRelevancePolarity,
} from "@/lib/engagement/relevance";
import { STORY_TEASER, STORY_TEASER_RELEVANCE_HINT } from "@/lib/engine/story-teaser";

function pillClass(on: boolean) {
  return on ? STORY_TEASER.toolPillOn : STORY_TEASER.toolPill;
}

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
  const [polarity, setPolarity] = useState<ArticleRelevancePolarity | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSaved(isArticleSaved(readSavedArticleIds(), articleId));
    setPolarity(articleRelevancePolarity(readArticleRelevance(), articleId));
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

  const interested = polarity === "interested";

  return (
    <div className="mt-8">
      <p className="sr-only">{STORY_TEASER_RELEVANCE_HINT}</p>
      <div role="toolbar" aria-label="Story actions" className={STORY_TEASER.toolbar}>
        <div className={STORY_TEASER.pills}>
          <button
            type="button"
            onClick={() => onMark("interested")}
            aria-pressed={interested}
            className={pillClass(interested)}
          >
            <Heart
              className="size-4 shrink-0"
              strokeWidth={1.75}
              fill={interested ? "currentColor" : "none"}
              aria-hidden
            />
            Interested
          </button>
          <button type="button" onClick={onSave} aria-pressed={saved} className={pillClass(saved)}>
            <Bookmark
              className="size-4 shrink-0"
              strokeWidth={1.75}
              fill={saved ? "currentColor" : "none"}
              aria-hidden
            />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        <div className={STORY_TEASER.icons}>
          <button
            type="button"
            onClick={() => void onShare()}
            aria-label="Share"
            className={STORY_TEASER.toolIcon}
          >
            <Share2 className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className={STORY_TEASER.toolIcon} aria-label="More">
              <MoreHorizontal className="size-5" strokeWidth={1.75} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 w-auto">
              <DropdownMenuItem
                onClick={() => onMark("less")}
                aria-checked={polarity === "less"}
                className="min-h-11 cursor-pointer"
              >
                {polarity === "less" ? <CheckIcon className="size-4" aria-hidden /> : null}
                Less like this
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <p className="mt-2 min-h-5 text-[14px] leading-5 text-[#1b1d1f]/70" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
