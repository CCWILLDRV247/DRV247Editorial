"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CarouselStoryCard } from "@/components/category-carousel";
import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT, isSoloMagazineRail } from "@/lib/engine/editorial-composition";
import { HOMEPAGE_FOR_YOU_DISCOVER_MAX } from "@/lib/engine/homepage-hierarchy";
import { readRecentInteractions, recentInteractionArticleIds } from "@/lib/engagement/recent";
import { readArticleRelevance } from "@/lib/engagement/relevance";
import { readSavedArticleIds } from "@/lib/engagement/saved";
import type { StoryDto } from "@/lib/stories";

type RailState = "hidden" | "loading" | "empty" | "error" | "ready";

export function PersonalMarksRail({
  excludeIds,
  testQuery,
}: {
  excludeIds?: readonly number[];
  testQuery?: string;
}) {
  const [state, setState] = useState<RailState>("hidden");
  const [stories, setStories] = useState<StoryDto[]>([]);
  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  const load = useCallback(async () => {
    const relevance = readArticleRelevance();
    const saved = readSavedArticleIds();
    const recent = recentInteractionArticleIds(readRecentInteractions());
    if (!relevance.interested.length && !relevance.less.length && !saved.length) {
      setStories([]);
      setState("hidden");
      return;
    }
    setState("loading");
    try {
      const params = new URLSearchParams();
      params.set("section", "for-you");
      params.set("limit", "24");
      if (relevance.interested.length) params.set("interested", relevance.interested.join(","));
      if (relevance.less.length) params.set("less", relevance.less.join(","));
      if (saved.length) params.set("saved", saved.join(","));
      if (recent.length) params.set("recent", recent.join(","));
      if (testQuery) {
        const extra = new URLSearchParams(testQuery);
        extra.forEach((value, key) => {
          if (!params.has(key)) params.set(key, value);
        });
      }
      const response = await fetch(`/api/editorial?${params.toString()}`);
      if (!response.ok) throw new Error("personal-marks");
      const data = (await response.json()) as { articles?: { id: number }[] };
      const ids = (data.articles ?? [])
        .map((article) => article.id)
        .filter((id) => !excluded.has(id))
        .slice(0, HOMEPAGE_FOR_YOU_DISCOVER_MAX);
      if (ids.length === 0) {
        setStories([]);
        setState("empty");
        return;
      }
      const savedResponse = await fetch(`/api/editorial/saved?ids=${ids.join(",")}`);
      if (!savedResponse.ok) throw new Error("personal-marks-hydrate");
      const savedData = (await savedResponse.json()) as { stories?: StoryDto[] };
      const list = (savedData.stories ?? []).filter((story) => !excluded.has(story.id));
      setStories(list);
      setState(list.length > 0 ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }, [excluded, testQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "hidden") return null;

  return (
    <section className="min-w-0" aria-labelledby="personal-marks-heading">
      <div className={MAGAZINE_LAYOUT.gutter}>
        <p id="personal-marks-heading" className={HOMEPAGE_COMPOSITION.sectionTitle}>
          More like your marks
        </p>
        <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
          From Interested, Less like this, and saves on this phone
        </p>
      </div>
      {state === "loading" ? (
        <div className={`${MAGAZINE_LAYOUT.gutter} mt-4 h-[220px] animate-pulse rounded-[12px] bg-[#cfcfcf]`} />
      ) : null}
      {state === "error" ? (
        <div className={MAGAZINE_LAYOUT.gutter}>
          <p className="mt-4 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/75">
            Couldn’t load marks from this phone. The marks are still saved here.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 flex h-11 w-full max-w-sm items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white font-display text-lg font-extrabold uppercase text-[#1b1d1f]"
          >
            Retry
          </button>
        </div>
      ) : null}
      {state === "empty" ? (
        <p className={`${MAGAZINE_LAYOUT.gutter} mt-4 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/75`}>
          Nothing on the desk matches those marks yet.
        </p>
      ) : null}
      {state === "ready" ? (
        <div className={MAGAZINE_LAYOUT.railGutter}>
          <div
            data-magazine-rail="marks"
            data-magazine-rail-solo={isSoloMagazineRail(stories.length) ? "" : undefined}
            className={isSoloMagazineRail(stories.length) ? MAGAZINE_LAYOUT.railSolo : MAGAZINE_LAYOUT.rail}
          >
            {stories.map((story) => (
              <CarouselStoryCard
                key={story.id}
                story={story}
                solo={isSoloMagazineRail(stories.length)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
