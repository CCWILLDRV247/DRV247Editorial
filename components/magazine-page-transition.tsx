import type { ReactNode } from "react";
import { ViewTransition } from "react";
import { STORY_OPEN_TRANSITION } from "@/lib/engine/story-transition";

/** Fade the For You / category feed out on story-open and back in on chevron pop. */
export function MagazinePageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter="story-feed"
      exit={{ [STORY_OPEN_TRANSITION]: "story-feed", default: "none" }}
      default="none"
    >
      <div className="min-w-0">{children}</div>
    </ViewTransition>
  );
}
