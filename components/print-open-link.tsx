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
import { freezeOpenView, thawOpenView } from "@/lib/engine/story-open-freeze";
import { joinRestores, rasterizeOpenImages } from "@/lib/engine/story-open-raster";
import {
  startTypedViewTransition,
  storyHeroIsPainted,
  waitForMagazinePaint,
} from "@/lib/engine/start-story-view-transition";
import {
  LAST_STORY_MEDIA_KEY,
  STORY_MEDIA_NAME,
  STORY_OPEN_TRANSITION,
} from "@/lib/engine/story-transition";

type PrintOpenLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  slug: string;
  query?: string;
  children: ReactNode;
};

function clearStoryMediaNames() {
  document.querySelectorAll("[data-story-media]").forEach((node) => {
    if (node instanceof HTMLElement) node.style.viewTransitionName = "";
  });
}

function markPrintMedia(slug: string, root: HTMLElement | null) {
  try {
    sessionStorage.setItem(LAST_STORY_MEDIA_KEY, slug);
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
 * Same inbound as StoryOpenLink, for suggested magazine covers → /print/[slug].
 * Rasterize, freeze, then startTransition + addTransitionType + router.push.
 * Chevron back still pops history with no view transition.
 */
export function PrintOpenLink({
  slug,
  query,
  children,
  onClick,
  onMouseEnter,
  onTouchStart,
  ...props
}: PrintOpenLinkProps) {
  const ctx = useMagazineQuery();
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const href = magazineHref(`/print/${slug}`, query ?? ctx);
  const printPath = `/print/${slug}`;

  function prefetch() {
    router.prefetch(href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    markPrintMedia(slug, ref.current);
    captureMagazineRails();
    recordMagazineHref(magazineLocation(window.location.pathname, window.location.search));
    recordMagazineHref(href);
    onClick?.(event);
    let restoreRaster = rasterizeOpenImages();
    freezeOpenView();
    void startTypedViewTransition(STORY_OPEN_TRANSITION, async () => {
      startTransition(() => {
        addTransitionType(STORY_OPEN_TRANSITION);
        router.push(href, { transitionTypes: [STORY_OPEN_TRANSITION] });
      });
      await waitForMagazinePaint(
        () => window.location.pathname === printPath && storyHeroIsPainted(),
      );
      restoreRaster = joinRestores(restoreRaster, rasterizeOpenImages());
      thawOpenView();
    }).finally(() => {
      thawOpenView();
      restoreRaster();
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
