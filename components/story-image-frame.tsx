"use client";

import type { SyntheticEvent } from "react";
import { cn } from "cn";
import { StoryImageFallback } from "./story-image-fallback";

export function StoryImageFrame({
  urls,
  alt,
  className,
  category,
  priority = false,
  eager = false,
}: {
  urls: string[];
  alt: string;
  className?: string;
  category?: string;
  priority?: boolean;
  eager?: boolean;
}) {
  const loadEager = priority || eager;

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    const next = Number(img.dataset.next ?? "1");
    if (next < urls.length) {
      img.dataset.next = String(next + 1);
      img.src = urls[next]!;
      return;
    }
    img.hidden = true;
    const fallback = img.nextElementSibling;
    if (fallback instanceof HTMLElement) fallback.hidden = false;
  }

  return (
    <span className="relative block size-full">
      {/* Remote hosts vary per feed; skip next/image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[0]}
        alt={alt}
        data-next="1"
        referrerPolicy="no-referrer"
        loading={loadEager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        onError={handleError}
        className={cn("size-full object-cover", className)}
      />
      <span hidden className="absolute inset-0">
        <StoryImageFallback className={className} category={category} />
      </span>
    </span>
  );
}
