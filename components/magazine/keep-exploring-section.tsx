"use client";

import { useCallback, useEffect, useId, useRef, type KeyboardEvent } from "react";
import { CarouselStoryCard } from "@/components/category-carousel";
import { MagazineLink } from "@/components/magazine-link";
import {
  KEEP_EXPLORING_ANALYTICS,
  trackKeepExploring,
} from "@/lib/engagement/keep-exploring-analytics";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  isSoloMagazineRail,
} from "@/lib/engine/editorial-composition";
import type { KeepExploringReason } from "@/lib/engine/keep-exploring";
import { withTestQuery } from "@/lib/engine/for-you-test";
import type { StoryDto } from "@/lib/stories";

export type KeepExploringStory = StoryDto & { exploreReason: KeepExploringReason };

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sessionDedupKey(currentArticleId: number): string {
  if (typeof window === "undefined") return String(currentArticleId);
  try {
    const key = "drv247-keep-exploring-session";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `${currentArticleId}:${Date.now()}`;
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return String(currentArticleId);
  }
}

function KeepExploringCard({
  story,
  position,
  currentArticleId,
  categorySlug,
  sessionKey,
  onCardVisible,
}: {
  story: KeepExploringStory;
  position: number;
  currentArticleId: number;
  categorySlug: string;
  sessionKey: string;
  onCardVisible: (storyId: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (readReducedMotion()) {
      onCardVisible(story.id);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            onCardVisible(story.id);
          }
        }
      },
      { threshold: [0.35, 0.5] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onCardVisible, story.id]);

  return (
    <div ref={ref} className="contents">
      <CarouselStoryCard
        story={story}
        solo={false}
        onClick={() => {
          void trackKeepExploring(KEEP_EXPLORING_ANALYTICS.click, {
            currentArticleId,
            recommendedArticleId: story.id,
            position,
            reason: story.exploreReason,
            categorySlug,
            sessionKey,
          });
        }}
      />
    </div>
  );
}

export function KeepExploringSection({
  currentArticleId,
  categorySlug,
  categoryName,
  stories,
  testQuery,
}: {
  currentArticleId: number;
  categorySlug: string;
  categoryName: string;
  stories: KeepExploringStory[];
  testQuery?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionSeen = useRef(false);
  const cardSeen = useRef(new Set<number>());
  const sessionKey = useRef(sessionDedupKey(currentArticleId)).current;
  const sectionReactId = useId();
  const categoryHref = withTestQuery(`/category/${categorySlug}`, testQuery);

  const fireSection = useCallback(() => {
    if (sectionSeen.current) return;
    sectionSeen.current = true;
    void trackKeepExploring(KEEP_EXPLORING_ANALYTICS.section, {
      currentArticleId,
      categorySlug,
      sessionKey,
    });
  }, [categorySlug, currentArticleId, sessionKey]);

  const fireCard = useCallback(
    (storyId: number) => {
      if (cardSeen.current.has(storyId)) return;
      cardSeen.current.add(storyId);
      const story = stories.find((item) => item.id === storyId);
      if (!story) return;
      void trackKeepExploring(KEEP_EXPLORING_ANALYTICS.card, {
        currentArticleId,
        recommendedArticleId: story.id,
        position: stories.findIndex((item) => item.id === storyId),
        reason: story.exploreReason,
        categorySlug,
        sessionKey,
      });
    },
    [categorySlug, currentArticleId, sessionKey, stories],
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (readReducedMotion()) {
      fireSection();
      stories.forEach((story) => fireCard(story.id));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            fireSection();
          }
        }
      },
      { threshold: [0.2, 0.35] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fireCard, fireSection, stories]);

  const onRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 220 : -220;
    rail.scrollBy({ left: delta, behavior: readReducedMotion() ? "auto" : "smooth" });
  };

  if (stories.length === 0) return null;

  const solo = isSoloMagazineRail(stories.length);

  return (
    <section ref={sectionRef} className="mt-10 min-w-0 md:mt-12" aria-labelledby={sectionReactId}>
      <div className={MAGAZINE_LAYOUT.gutter}>
        <h2 id={sectionReactId} className={HOMEPAGE_COMPOSITION.sectionTitle}>
          Keep Exploring
        </h2>
      </div>
      <div className={`${MAGAZINE_LAYOUT.railGutter} mt-4 md:mt-5`}>
        <div
          ref={railRef}
          role="region"
          aria-label="Keep exploring stories"
          tabIndex={0}
          onKeyDown={onRailKeyDown}
          data-magazine-rail="keep-exploring"
          data-magazine-rail-solo={solo ? "" : undefined}
          className={
            solo
              ? `${MAGAZINE_LAYOUT.railSolo} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]`
              : `${MAGAZINE_LAYOUT.rail} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]`
          }
        >
          {stories.map((story, index) => (
            <KeepExploringCard
              key={story.id}
              story={story}
              position={index}
              currentArticleId={currentArticleId}
              categorySlug={categorySlug}
              sessionKey={sessionKey}
              onCardVisible={fireCard}
            />
          ))}
        </div>
      </div>
      <div className={`${MAGAZINE_LAYOUT.gutter} mt-6 md:mt-8`}>
        <MagazineLink
          href={categoryHref}
          className="font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]"
        >
          View all {categoryName}
        </MagazineLink>
      </div>
    </section>
  );
}
