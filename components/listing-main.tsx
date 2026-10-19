"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { nameListingForStoryBack } from "@/lib/engine/start-story-view-transition";

/**
 * Listing `<main>`. `view-transition-class` is rendered with the node so the
 * server HTML and the client render match. Naming the last-opened card stays
 * in a layout effect on this element, which only runs after `<main>` hydrates.
 * Magazine history sync sits outside the page Suspense boundary and must not
 * touch this node first — that was the hydration mismatch.
 */
export function ListingMain({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    nameListingForStoryBack();
  }, []);

  return (
    <main className={className} style={{ viewTransitionClass: "story-feed" }}>
      {children}
    </main>
  );
}
