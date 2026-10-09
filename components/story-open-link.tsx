"use client";

import {
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

export function markStoryMedia(storyId: number, root: HTMLElement | null) {
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

/**
 * Native <a> (same as MagazineLink) so the browser pushes a real history
 * entry and `@view-transition { navigation: auto }` can run. Next.js <Link>
 * soft-nav skipped that MPA transition, so the card→story move was instant.
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
  const href = magazineHref(`/story/${storyId}`, query ?? ctx);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    markStoryMedia(storyId, ref.current);
    onClick?.(event);
  }

  return (
    <a {...props} ref={ref} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
