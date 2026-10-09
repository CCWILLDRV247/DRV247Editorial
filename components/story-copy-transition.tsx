import type { ReactNode } from "react";
import { ViewTransition } from "react";
import { STORY_OPEN_TRANSITION } from "@/lib/engine/story-transition";

export function StoryCopyTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ [STORY_OPEN_TRANSITION]: "story-copy", default: "none" }}
      exit={{ [STORY_OPEN_TRANSITION]: "story-copy", default: "none" }}
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
