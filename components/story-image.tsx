import { cn } from "cn";

function Fallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-[#cfcfcf] text-[#1b1d1f]",
        className,
      )}
    >
      <span className="font-display text-3xl font-black uppercase tracking-[-0.04em]">
        DRV247
      </span>
    </div>
  );
}

export function StoryImage({
  src,
  alt,
  className,
  priority = false,
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  eager?: boolean;
}) {
  if (!src) {
    return <Fallback className={className} />;
  }

  const loadEager = priority || eager;

  return (
    // Remote hosts vary per feed; skip next/image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={loadEager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
      className={cn("size-full object-cover", className)}
    />
  );
}
