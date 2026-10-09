"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useMagazineQuery } from "@/components/magazine-link";
import { magazineHref } from "@/lib/engine/magazine-history";
import { STORY_OPEN_TRANSITION } from "@/lib/engine/story-transition";

type StoryOpenLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  storyId: number;
  query?: string;
  children: ReactNode;
};

/**
 * Client navigation into `/story/[id]` so React `<ViewTransition>` can morph
 * the card image. Query is stamped the same way as `MagazineLink`.
 */
export function StoryOpenLink({
  storyId,
  query,
  children,
  ...props
}: StoryOpenLinkProps) {
  const ctx = useMagazineQuery();
  return (
    <Link
      {...props}
      href={magazineHref(`/story/${storyId}`, query ?? ctx)}
      transitionTypes={[STORY_OPEN_TRANSITION]}
    >
      {children}
    </Link>
  );
}
