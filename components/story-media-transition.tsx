import type { ReactNode } from "react";

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

/** Teaser hero. CSS `view-transition-name: story-media` pairs with the clicked card. */
export function StoryHeroMedia({ children }: { children: ReactNode }) {
  return <div className="story-hero-media">{children}</div>;
}
