import type { ReactNode } from "react";
import { ViewTransition } from "react";
import { storyMediaTransitionName } from "@/lib/engine/story-transition";

export function StoryMediaTransition({
  storyId,
  children,
}: {
  storyId: number;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={storyMediaTransitionName(storyId)} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
