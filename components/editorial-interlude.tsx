import { cn } from "cn";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";

const TYPE_LABEL: Partial<Record<EditorialInterlude["type"], string>> = {
  PROVOCATION: "Question",
  TRANSITION: "Transition",
  EDITORIAL_THOUGHT: "Editorial",
};

export function EditorialInterludeBlock({
  interlude,
  size = "default",
  tuck = true,
  showType = size === "home",
}: {
  interlude: EditorialInterlude;
  size?: "default" | "home";
  /** When false, skip negative margins so a block above (e.g. Desk) is not pulled into the type. */
  tuck?: boolean;
  showType?: boolean;
}) {
  const typeLabel = showType ? TYPE_LABEL[interlude.type] : undefined;

  return (
    <section
      aria-label={interlude.text}
      className={cn(
        "relative min-w-0 px-7 text-[#1b1d1f] md:px-0",
        size === "home"
          ? cn(tuck ? "-mt-8 -mb-8" : "mt-0 mb-0", "py-[52px]")
          : "py-10 md:py-12",
      )}
    >
      {typeLabel ? (
        <p className="mb-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#1b1d1f]/45 md:mb-5">
          {typeLabel}
        </p>
      ) : null}
      <p
        className={cn(
          "max-w-[14ch] font-display font-black uppercase tracking-[-0.02em]",
          size === "home"
            ? "text-[clamp(3.5rem,18vw,135px)] leading-[0.64]"
            : "text-[clamp(2.75rem,12vw,8.4rem)] leading-[0.62] md:max-w-none",
          interlude.type === "EDITORIAL_THOUGHT" && size !== "home"
            ? "max-w-[18ch] md:max-w-[22ch]"
            : null,
        )}
      >
        {interlude.text}
      </p>
    </section>
  );
}
