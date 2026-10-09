"use client";

import {
  addTransitionType,
  startTransition,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { recordMagazineHref, useMagazineQuery } from "@/components/magazine-link";
import { magazineHref, magazineLocation } from "@/lib/engine/magazine-history";
import { captureMagazineRails } from "@/lib/engine/magazine-rail-scroll";
import {
  startTypedViewTransition,
  waitForMagazinePaint,
} from "@/lib/engine/start-story-view-transition";
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
 * Native <a> default click is a push navigation. Prevent default, stamp
 * story-media, then startViewTransition + router.push. Chevron back pops
 * with history.back() and must not start a view transition — Safari aborts
 * snapshot capture during that pop (InvalidStateError).
 */
export function StoryOpenLink({
  storyId,
  query,
  children,
  onClick,
  onMouseEnter,
  onTouchStart,
  ...props
}: StoryOpenLinkProps) {
  const ctx = useMagazineQuery();
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const href = magazineHref(`/story/${storyId}`, query ?? ctx);
  const storyPath = `/story/${storyId}`;

  function prefetch() {
    router.prefetch(href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    markStoryMedia(storyId, ref.current);
    captureMagazineRails();
    recordMagazineHref(magazineLocation(window.location.pathname, window.location.search));
    recordMagazineHref(href);
    onClick?.(event);
    void startTypedViewTransition(STORY_OPEN_TRANSITION, async () => {
      startTransition(() => {
        addTransitionType(STORY_OPEN_TRANSITION);
        router.push(href, { transitionTypes: [STORY_OPEN_TRANSITION] });
      });
      await waitForMagazinePaint(
        () =>
          window.location.pathname === storyPath &&
          Boolean(document.querySelector(".story-hero-media")),
      );
    });
  }

  return (
    <a
      {...props}
      ref={ref}
      href={href}
      onClick={handleClick}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
    >
      {children}
    </a>
  );
}
