"use client";

import { useState, type SyntheticEvent } from "react";
import Image from "next/image";
import { cn } from "cn";
import { StoryImageFallback } from "./story-image-fallback";

const HERO_SIZES = "(max-width: 1080px) 100vw, 1080px";
const HERO_QUALITY = 75;

export function StoryImageFrame({
  urls,
  alt,
  className,
  category,
  priority = false,
  eager = false,
  optimize = false,
}: {
  urls: string[];
  alt: string;
  className?: string;
  category?: string;
  priority?: boolean;
  eager?: boolean;
  optimize?: boolean;
}) {
  if (optimize) {
    return (
      <OptimizedStoryImageFrame
        urls={urls}
        alt={alt}
        className={className}
        category={category}
        priority={priority}
      />
    );
  }
  return (
    <NativeStoryImageFrame
      urls={urls}
      alt={alt}
      className={className}
      category={category}
      priority={priority}
      eager={eager}
    />
  );
}

function NativeStoryImageFrame({
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
      {/* Rail / fallback path: remote hosts vary; keep a lazy native img. */}
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

function OptimizedStoryImageFrame({
  urls,
  alt,
  className,
  category,
  priority = false,
}: {
  urls: string[];
  alt: string;
  className?: string;
  category?: string;
  priority?: boolean;
}) {
  const [useNative, setUseNative] = useState(false);
  const src = urls[0];

  if (useNative || !src) {
    if (!urls.length) {
      return <StoryImageFallback className={className} category={category} />;
    }
    return (
      <NativeStoryImageFrame
        urls={urls}
        alt={alt}
        className={className}
        category={category}
        priority={priority}
        eager
      />
    );
  }

  return (
    <span className="relative block size-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={HERO_SIZES}
        quality={HERO_QUALITY}
        preload={priority}
        loading={priority ? undefined : "eager"}
        decoding="async"
        onError={() => setUseNative(true)}
        className={cn("object-cover", className)}
      />
    </span>
  );
}
