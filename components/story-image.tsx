import { isUsableArticleImage } from "@/lib/text";
import { StoryImageFallback } from "./story-image-fallback";
import { StoryImageFrame } from "./story-image-frame";

function VideoPlayOverlay() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/90 ring-1 ring-[#1b1d1f]/10 md:size-11">
        <svg viewBox="0 0 24 24" className="ml-0.5 size-7 fill-[#1b1d1f]/70 md:size-8">
          <path d="M8.5 6.4v11.2L18.4 12 8.5 6.4z" />
        </svg>
      </span>
    </span>
  );
}

export function StoryImage({
  src,
  sources = [],
  alt,
  className,
  category,
  priority = false,
  eager = false,
  video = false,
}: {
  src: string | null;
  sources?: string[];
  alt: string;
  className?: string;
  category?: string;
  priority?: boolean;
  eager?: boolean;
  video?: boolean;
}) {
  const urls = uniqueImageUrls([src, ...sources]);
  const image = !urls.length ? (
    <StoryImageFallback className={className} category={category} />
  ) : (
    <StoryImageFrame
      urls={urls}
      alt={alt}
      className={className}
      category={category}
      priority={priority}
      eager={eager}
    />
  );
  if (!video) return image;
  return (
    <span className="relative block size-full">
      {image}
      <VideoPlayOverlay />
    </span>
  );
}

function uniqueImageUrls(values: Array<string | null | undefined>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!isUsableArticleImage(value) || seen.has(value)) continue;
    seen.add(value);
    urls.push(value);
  }
  return urls;
}
