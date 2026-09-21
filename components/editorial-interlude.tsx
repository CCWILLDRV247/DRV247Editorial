import { cn } from "cn";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";
import {
  interludeCompositionVariant,
  type InterludeCompositionVariant,
} from "@/lib/engine/editorial-composition";
import {
  INTERLUDE_FEED_TYPOGRAPHY,
  INTERLUDE_VARIANT_TYPOGRAPHY,
} from "@/lib/engine/interlude-typography";
import type { HomepageInterludeSlotId } from "@/lib/engine/interlude-selection";

const TYPE_LABEL: Partial<Record<EditorialInterlude["type"], string>> = {
  STATEMENT: "Statement",
  OBSERVATION: "Observation",
  PROVOCATION: "Question",
  TRANSITION: "Transition",
  EDITORIAL_THOUGHT: "Editorial",
  SHORT_PUNCH: "Moment",
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
  const styles = INTERLUDE_VARIANT_TYPOGRAPHY[resolvedVariant];
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
          size === "home" ? styles.type : INTERLUDE_FEED_TYPOGRAPHY.type,
          interlude.type === "EDITORIAL_THOUGHT" && size !== "home"
            ? INTERLUDE_FEED_TYPOGRAPHY.editorialThoughtMax
            : null,
        )}
      >
        {interlude.text}
      </p>
    </section>
  );
}
