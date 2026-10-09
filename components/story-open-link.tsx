"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useMagazineQuery } from "@/components/magazine-link";
import { magazineHref } from "@/lib/engine/magazine-history";
import {
  LAST_STORY_MEDIA_KEY,
  STORY_MEDIA_NAME,
  STORY_OPEN_TRANSITION,
} from "@/lib/engine/story-transition";

type StoryOpenLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  storyId: number;
  query?: string;
  children: ReactNode;
};

function clearStoryMediaNames() {
  document.querySelectorAll("[data-story-media]").forEach((node) => {
    if (node instanceof HTMLElement) node.style.viewTransitionName = "";
  });
}

function markStoryMedia(storyId: number, root: HTMLElement | null) {
  try {
    sessionStorage.setItem(LAST_STORY_MEDIA_KEY, String(storyId));
  } catch {
    // Private mode can throw; morph then skips.
  }
  clearStoryMediaNames();
  const media = root?.querySelector("[data-story-media]");
  if (media instanceof HTMLElement) {
    media.style.viewTransitionName = STORY_MEDIA_NAME;
  }
}

function restoreStoryMedia(storyId: number) {
  let last = "";
  try {
    last = sessionStorage.getItem(LAST_STORY_MEDIA_KEY) ?? "";
  } catch {
    return;
  }
  if (last !== String(storyId)) return;
  const nodes = document.querySelectorAll(`[data-story-media="${storyId}"]`);
  nodes.forEach((node, index) => {
    if (node instanceof HTMLElement) {
      node.style.viewTransitionName = index === 0 ? STORY_MEDIA_NAME : "";
    }
  });
}

/**
 * Client navigation into `/story/[id]` so React `<ViewTransition>` can morph
 * the card image. Query is stamped the same way as `MagazineLink`.
 */
export function StoryOpenLink({
  storyId,
  query,
  children,
  onClick,
  ...props
}: StoryOpenLinkProps) {
  const ctx = useMagazineQuery();
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    restoreStoryMedia(storyId);
  }, [storyId]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    markStoryMedia(storyId, ref.current);
    onClick?.(event);
  }

  return (
    <Link
      {...props}
      ref={ref}
      href={magazineHref(`/story/${storyId}`, query ?? ctx)}
      transitionTypes={[STORY_OPEN_TRANSITION]}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
