import { cn } from "cn";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";
import {
  interludeCompositionVariant,
  type InterludeCompositionVariant,
} from "@/lib/engine/editorial-composition";
import type { HomepageInterludeSlotId } from "@/lib/engine/interlude-selection";

const TYPE_LABEL: Partial<Record<EditorialInterlude["type"], string>> = {
  STATEMENT: "Statement",
  OBSERVATION: "Observation",
  PROVOCATION: "Question",
  TRANSITION: "Transition",
  EDITORIAL_THOUGHT: "Editorial",
  SHORT_PUNCH: "Moment",
};

const VARIANT_STYLE: Record<
  InterludeCompositionVariant,
  {
    section: string;
    label: string;
    type: string;
    rule?: string;
  }
> = {
  statement: {
    section: "border-y border-[#1b1d1f]/10 py-14 md:py-[4.5rem]",
    label: "mb-5 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#1b1d1f]/50 md:mb-6",
    type: "max-w-[13ch] text-[clamp(2.75rem,16vw,7.5rem)] leading-[0.66] md:max-w-[16ch] md:text-[clamp(4rem,11vw,8.5rem)] md:leading-[0.64]",
    rule: "before:absolute before:inset-y-8 before:left-0 before:w-[3px] before:bg-[#b91c1c]/35 md:before:inset-y-10",
  },
  pause: {
    section: "border-t border-[#1b1d1f]/8 py-12 md:py-16",
    label: "mb-4 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#1b1d1f]/40",
    type: "max-w-[15ch] text-[clamp(2.5rem,14vw,6.5rem)] leading-[0.68] md:max-w-[18ch]",
  },
  whisper: {
    section: "py-10 md:py-14",
    label: "mb-3 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[#1b1d1f]/35 md:text-right",
    type: "max-w-[14ch] text-[clamp(2.25rem,11vw,5.5rem)] leading-[0.7] md:ml-auto md:max-w-[16ch] md:text-right",
  },
  accent: {
    section: "border-l-2 border-[#b91c1c]/40 py-10 pl-5 md:py-12 md:pl-7",
    label: "mb-3 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#b91c1c]/70",
    type: "max-w-[16ch] text-[clamp(2.5rem,13vw,6rem)] leading-[0.67]",
  },
};

export function EditorialInterludeBlock({
  interlude,
  slot,
  variant,
  size = "default",
  showType = size === "home",
}: {
  interlude: EditorialInterlude;
  slot?: HomepageInterludeSlotId;
  variant?: InterludeCompositionVariant;
  size?: "default" | "home";
  /** @deprecated composition uses explicit rhythm — tuck removed */
  tuck?: boolean;
  showType?: boolean;
}) {
  const resolvedVariant =
    variant ??
    (slot && size === "home"
      ? interludeCompositionVariant(slot, interlude.type)
      : "pause");
  const styles = VARIANT_STYLE[resolvedVariant];
  const typeLabel = showType ? TYPE_LABEL[interlude.type] : undefined;

  return (
    <section
      aria-label={interlude.text}
      className={cn(
        "relative min-w-0 text-[#1b1d1f]",
        size === "home"
          ? cn("px-[calc(10px+env(safe-area-inset-left,0px))] md:px-0", styles.section, styles.rule)
          : "px-7 py-10 md:px-0 md:py-12",
      )}
    >
      {typeLabel ? <p className={styles.label}>{typeLabel}</p> : null}
      <p
        className={cn(
          "font-display font-black uppercase tracking-[-0.02em]",
          size === "home"
            ? styles.type
            : "max-w-[14ch] text-[clamp(2.75rem,12vw,8.4rem)] leading-[0.62] md:max-w-none",
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
