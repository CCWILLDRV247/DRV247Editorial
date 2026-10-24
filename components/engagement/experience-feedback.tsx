"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { XIcon } from "lucide-react";
import {
  ENGAGEMENT_EVENTS,
  experienceFeedbackEventData,
  type ExperienceFeedbackRating,
  type ExperienceFeedbackReason,
  trackEngagement,
} from "@/lib/engagement/events";
import {
  EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
  EXPERIENCE_FEEDBACK_PROMPT,
  EXPERIENCE_FEEDBACK_RATING_LABELS,
  EXPERIENCE_FEEDBACK_REASON_LABELS,
  EXPERIENCE_FEEDBACK_REASONS,
  EXPERIENCE_FEEDBACK_RATINGS,
  EXPERIENCE_FEEDBACK_SCROLL_ARM_MS,
  EXPERIENCE_FEEDBACK_SCROLL_RATIO,
  MEANINGFUL_ENGAGE_EVENT,
  alreadyRespondedToExperienceFeedback,
  experienceFeedbackSurface,
  experienceFollowUpPrompt,
  readExperienceFeedbackStored,
  shouldShowExperienceFeedback,
  writeExperienceFeedbackStored,
} from "@/lib/engagement/feedback";

const chipClass =
  "flex h-11 items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-base font-extrabold uppercase text-[#1b1d1f]";

export function ExperienceFeedback() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<ExperienceFeedbackRating | null>(null);
  const started = useRef(Date.now());
  const firstPaint = useRef(true);
  const explicitEngage = useRef(false);
  const scrolledPast = useRef(false);
  const scrollArmed = useRef(false);

  useEffect(() => {
    firstPaint.current = false;

    const evaluate = () => {
      setVisible(
        shouldShowExperienceFeedback({
          firstPaint: firstPaint.current,
          dwellMs: Date.now() - started.current,
          scrolledPast: scrolledPast.current,
          explicitEngage: explicitEngage.current,
          alreadyResponded: alreadyRespondedToExperienceFeedback(readExperienceFeedbackStored()),
          scrollArmed: scrollArmed.current,
        }),
      );
    };

    const armScroll = window.setTimeout(() => {
      scrollArmed.current = true;
      if (scrolledPast.current) evaluate();
    }, EXPERIENCE_FEEDBACK_SCROLL_ARM_MS);

    const onEngage = () => {
      explicitEngage.current = true;
      evaluate();
    };
    const onScroll = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      if (max > 0 && window.scrollY / max >= EXPERIENCE_FEEDBACK_SCROLL_RATIO) {
        scrolledPast.current = true;
        evaluate();
      }
    };
    const timer = window.setInterval(() => {
      if (Date.now() - started.current >= EXPERIENCE_FEEDBACK_MIN_DWELL_MS) {
        evaluate();
        window.clearInterval(timer);
      }
    }, 1000);

    window.addEventListener(MEANINGFUL_ENGAGE_EVENT, onEngage);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(armScroll);
      window.clearInterval(timer);
      window.removeEventListener(MEANINGFUL_ENGAGE_EVENT, onEngage);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function dismiss() {
    writeExperienceFeedbackStored({
      status: "dismissed",
      at: Date.now(),
      ...(rating ? { rating } : {}),
    });
    setVisible(false);
    setRating(null);
  }

  function submit(reason: ExperienceFeedbackReason) {
    if (!rating) return;
    writeExperienceFeedbackStored({ status: "submitted", rating, reason, at: Date.now() });
    void trackEngagement({
      name: ENGAGEMENT_EVENTS.feedback,
      data: experienceFeedbackEventData({
        rating,
        reason,
        surface: experienceFeedbackSurface(pathname),
      }),
    });
    setVisible(false);
    setRating(null);
  }

  if (!visible) return null;

  const prompt = rating ? experienceFollowUpPrompt(rating) : EXPERIENCE_FEEDBACK_PROMPT;

  return (
    <aside
      role="region"
      aria-label="DRV247 experience"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 md:inset-x-auto md:right-6 md:bottom-6 md:justify-end md:p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto w-full max-w-sm border border-[#1b1d1f]/15 bg-white p-4 shadow-[0_12px_40px_rgba(27,29,31,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg font-bold uppercase leading-none tracking-[-0.02em] text-[#1b1d1f]">
            {prompt}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="flex size-9 shrink-0 items-center justify-center text-[#1b1d1f]"
            aria-label="Dismiss experience feedback"
          >
            <XIcon className="size-5" strokeWidth={2.25} />
          </button>
        </div>
        {rating ? (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {EXPERIENCE_FEEDBACK_REASONS.map((value) => (
              <button
                key={value}
                type="button"
                className={chipClass}
                onClick={() => submit(value)}
              >
                {EXPERIENCE_FEEDBACK_REASON_LABELS[value]}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {EXPERIENCE_FEEDBACK_RATINGS.map((value) => (
              <button
                key={value}
                type="button"
                className={chipClass}
                onClick={() => setRating(value)}
              >
                {EXPERIENCE_FEEDBACK_RATING_LABELS[value]}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
