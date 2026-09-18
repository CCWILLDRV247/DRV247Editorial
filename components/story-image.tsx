import { isUsableArticleImage } from "@/lib/text";
import { StoryImageFallback } from "./story-image-fallback";
import { StoryImageFrame } from "./story-image-frame";

export function StoryImage({
  src,
  sources = [],
  alt,
  className,
  category,
  priority = false,
  eager = false,
}: {
  src: string | null;
  sources?: string[];
  alt: string;
  className?: string;
  category?: string;
  priority?: boolean;
  eager?: boolean;
}) {
  const urls = uniqueImageUrls([src, ...sources]);
  if (!urls.length) {
    return <StoryImageFallback className={className} category={category} />;
  }

  return (
    <StoryImageFrame
      urls={urls}
      alt={alt}
      className={className}
      category={category}
      priority={priority}
      eager={eager}
    />
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
