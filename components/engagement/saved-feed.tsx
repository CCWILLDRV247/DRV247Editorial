"use client";

import { useCallback, useEffect, useState } from "react";
import { StoryCard } from "@/components/story-card";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import { readSavedArticleIds } from "@/lib/engagement/saved";
import type { StoryDto } from "@/lib/stories";

type FeedState = "loading" | "empty" | "error" | "ready";

export function SavedFeed() {
  const [state, setState] = useState<FeedState>("loading");
  const [stories, setStories] = useState<StoryDto[]>([]);

  const load = useCallback(async () => {
    const ids = readSavedArticleIds();
    if (ids.length === 0) {
      setStories([]);
      setState("empty");
      return;
    }
    setState("loading");
    try {
      const response = await fetch(`/api/editorial/saved?ids=${ids.join(",")}`);
      if (!response.ok) throw new Error("saved-feed");
      const data = (await response.json()) as { stories?: StoryDto[] };
      const list = Array.isArray(data.stories) ? data.stories : [];
      setStories(list);
      setState(list.length > 0 ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className={`${MAGAZINE_LAYOUT.gutter} grid w-full min-w-0 gap-2 py-10 md:grid-cols-2`}>
        <div className="h-[500px] animate-pulse rounded-xl bg-[#eee] lg:h-[380px]" />
        <div className="h-[500px] animate-pulse rounded-xl bg-[#eee] lg:h-[380px]" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="px-7 py-16 text-[#1b1d1f] lg:px-0">
        <p className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
          Couldn’t
          <br />
          load
          <br />
          the clip
        </p>
        <p className="mt-8 max-w-sm text-[18px] leading-[22px] tracking-[-0.36px]">
          The saved ids are still on this phone. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-8 flex h-11 w-full max-w-sm items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="px-7 py-16 text-[#1b1d1f] lg:px-0">
        <p className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
          Nothing
          <br />
          on the
          <br />
          clip
        </p>
        <p className="mt-8 max-w-sm text-[18px] leading-[22px] tracking-[-0.36px]">
          Bookmark a teaser and it stays on this phone. No account.
        </p>
      </div>
    );
  }

  return (
    <div className={`${MAGAZINE_LAYOUT.gutter} grid w-full min-w-0 gap-2 pb-16 md:grid-cols-2`}>
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}
