import { cn } from "cn";

export function StoryImageFallback({
  className,
  category,
}: {
  className?: string;
  category?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-1.5 bg-[#cfcfcf] text-[#1b1d1f]",
        className,
      )}
    >
      <span className="font-display text-3xl font-black uppercase tracking-[-0.04em]">DRV247</span>
      {category ? (
        <span className="font-display text-xs font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/70">
          {category}
        </span>
      ) : null}
    </div>
  );
}
