import type { ReactNode } from "react";
import { ViewTransition } from "react";

export function StoryCopyTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="story-copy" exit="story-copy" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
