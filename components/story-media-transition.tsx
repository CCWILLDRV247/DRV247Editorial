import type { ReactNode } from "react";
import { ViewTransition } from "react";
import { STORY_MEDIA_NAME } from "@/lib/engine/story-transition";

/** Listing card image. Named only when this card is the active story open/back pair. */
export function StoryMediaTarget({
  storyId,
  className,
  children,
}: {
  storyId: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-story-media={String(storyId)} className={className}>
      {children}
    </div>
  );
}

/** Teaser hero. Pairs with the card that set `STORY_MEDIA_NAME` on click. */
export function StoryHeroMedia({ children }: { children: ReactNode }) {
  return (
    <ViewTransition name={STORY_MEDIA_NAME} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
