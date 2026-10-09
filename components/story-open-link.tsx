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
 * Same path as MagazineBack: preventDefault, stamp story-media, then
 * startTransition + addTransitionType + router.push. A native <a> default
 * click is a push navigation; Safari's `@view-transition { navigation: auto }`
 * only runs on traverse (back), so the card→story open skipped the morph.
 * Cmd-click / new-tab still use the real href.
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

  function prefetch() {
    router.prefetch(href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    markStoryMedia(storyId, ref.current);
    onClick?.(event);
    startTransition(() => {
      addTransitionType(STORY_OPEN_TRANSITION);
      router.push(href, { transitionTypes: [STORY_OPEN_TRANSITION] });
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
