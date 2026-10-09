import {
  LAST_STORY_MEDIA_KEY,
  STORY_BACK_LISTING_MS,
  STORY_BACK_MORPH_EASING,
  STORY_BACK_MORPH_MS,
} from "./story-transition";
import { waitForMagazinePaint } from "./start-story-view-transition";

type Box = { top: number; left: number; width: number; height: number; radius: string };

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function boxOf(node: Element): Box {
  const rect = node.getBoundingClientRect();
  const radius = node instanceof HTMLElement ? getComputedStyle(node).borderRadius : "0px";
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    radius,
  };
}

function isOnScreen(box: Box) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return (
    box.width > 2 &&
    box.height > 2 &&
    box.left < vw - 8 &&
    box.left + box.width > 8 &&
    box.top < vh - 8 &&
    box.top + box.height > 8
  );
}

function lastStoryId() {
  const fromPath = window.location.pathname.match(/^\/story\/(\d+)/)?.[1];
  if (fromPath) return fromPath;
  try {
    return sessionStorage.getItem(LAST_STORY_MEDIA_KEY) ?? "";
  } catch {
    return "";
  }
}

function heroSource(hero: HTMLElement) {
  const img = hero.querySelector("img");
  if (img instanceof HTMLImageElement) return img.currentSrc || img.src;
  return "";
}

function place(node: HTMLElement, box: Box, opacity = "1") {
  node.style.transform = `translate(${box.left}px, ${box.top}px)`;
  node.style.width = `${box.width}px`;
  node.style.height = `${box.height}px`;
  node.style.borderRadius = box.radius;
  node.style.opacity = opacity;
}

function finishOverlay(overlay: HTMLElement) {
  overlay.remove();
}

function fadeOverlay(overlay: HTMLElement) {
  const anim = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 240,
    easing: "ease-out",
    fill: "forwards",
  });
  void anim.finished.then(() => finishOverlay(overlay)).catch(() => finishOverlay(overlay));
}

function fadeListing() {
  const listing = document.querySelector("main");
  if (!(listing instanceof HTMLElement)) {
    document.documentElement.removeAttribute("data-story-back");
    return;
  }
  const anim = listing.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: STORY_BACK_LISTING_MS,
    easing: "ease-out",
    fill: "forwards",
  });
  document.documentElement.removeAttribute("data-story-back");
  void anim.finished.then(() => {
    listing.style.opacity = "";
    anim.cancel();
  }).catch(() => {
    listing.style.opacity = "";
  });
}

function morphToCard(overlay: HTMLElement, from: Box, card: HTMLElement) {
  const to = boxOf(card);
  if (!isOnScreen(to)) {
    fadeOverlay(overlay);
    return;
  }
  const prior = card.style.opacity;
  card.style.opacity = "0";
  const anim = overlay.animate(
    [
      {
        transform: `translate(${from.left}px, ${from.top}px)`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        borderRadius: from.radius,
      },
      {
        transform: `translate(${to.left}px, ${to.top}px)`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        borderRadius: to.radius,
      },
    ],
    {
      duration: STORY_BACK_MORPH_MS,
      easing: STORY_BACK_MORPH_EASING,
      fill: "forwards",
    },
  );
  void anim.finished
    .then(() => {
      card.style.opacity = prior;
      finishOverlay(overlay);
    })
    .catch(() => {
      card.style.opacity = prior;
      finishOverlay(overlay);
    });
}

function captureHero() {
  const hero = document.querySelector(".story-hero-media");
  if (!(hero instanceof HTMLElement)) return null;
  const from = boxOf(hero);
  if (from.width < 2 || from.height < 2) return null;
  const overlay = document.createElement("div");
  overlay.setAttribute("data-story-back-morph", "");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.zIndex = "80";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "hidden";
  overlay.style.transformOrigin = "top left";
  overlay.style.background = "#1b1d1f";
  overlay.style.willChange = "transform, width, height, opacity";
  const src = heroSource(hero);
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    overlay.appendChild(img);
  }
  place(overlay, from);
  document.body.appendChild(overlay);
  return { overlay, from, id: lastStoryId() };
}

/**
 * Measure the story hero, then after history.back() paints the listing,
 * ease the image onto the matching card. Never starts a view transition.
 * Missing or off-screen cards fade only. Never throws.
 */
export function playStoryBackMorph() {
  try {
    if (typeof document === "undefined" || prefersReducedMotion()) return;
    document.querySelectorAll("[data-story-back-morph]").forEach((node) => node.remove());
    const captured = captureHero();
    document.documentElement.setAttribute("data-story-back", "1");
    void waitForMagazinePaint(
      () =>
        !window.location.pathname.startsWith("/story/") &&
        Boolean(document.querySelector("[data-story-media]")),
    )
      .then(() => {
        fadeListing();
        if (!captured) return;
        const card = captured.id
          ? document.querySelector(`[data-story-media="${captured.id}"]`)
          : null;
        if (card instanceof HTMLElement) {
          morphToCard(captured.overlay, captured.from, card);
          return;
        }
        fadeOverlay(captured.overlay);
      })
      .catch(() => {
        document.documentElement.removeAttribute("data-story-back");
        captured?.overlay.remove();
      });
  } catch {
    document.documentElement.removeAttribute("data-story-back");
  }
}
