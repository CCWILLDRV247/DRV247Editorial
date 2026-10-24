"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import {
  ENGAGEMENT_EVENTS,
  type ExperienceFeedbackRating,
  trackEngagement,
} from "@/lib/engagement/events";
import {
  EXPERIENCE_FEEDBACK_MIN_DWELL_MS,
  EXPERIENCE_FEEDBACK_SCROLL_ARM_MS,
  EXPERIENCE_FEEDBACK_SCROLL_RATIO,
  MEANINGFUL_ENGAGE_EVENT,
  alreadyRespondedToExperienceFeedback,
  readExperienceFeedbackStored,
  shouldShowExperienceFeedback,
  writeExperienceFeedbackStored,
} from "@/lib/engagement/feedback";

const ratings: { value: ExperienceFeedbackRating; label: string }[] = [
  { value: "useful", label: "Useful" },
  { value: "not_for_me", label: "Not for me" },
  { value: "browsing", label: "Just browsing" },
];

const chipClass =
  "flex h-11 flex-1 items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-base font-extrabold uppercase text-[#1b1d1f]";

export function ExperienceFeedback({ articleId }: { articleId: number }) {
  const [visible, setVisible] = useState(false);
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

  function close(status: "submitted" | "dismissed", rating?: ExperienceFeedbackRating) {
    writeExperienceFeedbackStored({ status, at: Date.now(), ...(rating ? { rating } : {}) });
    setVisible(false);
    if (status === "submitted" && rating) {
      void trackEngagement({
        name: ENGAGEMENT_EVENTS.feedback,
        data: { articleId, rating },
      });
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className="h-32" aria-hidden />
      <aside
        role="region"
        aria-label="Teaser feedback"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1b1d1f]/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      >
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
          <p className="font-display text-lg font-bold uppercase leading-none tracking-[-0.02em] text-[#1b1d1f]">
            How’s this teaser?
          </p>
          <button
            type="button"
            onClick={() => close("dismissed")}
            className="flex size-9 shrink-0 items-center justify-center text-[#1b1d1f]"
            aria-label="Dismiss feedback"
          >
            <XIcon className="size-5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="mx-auto mt-3 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
          {ratings.map((rating) => (
            <button
              key={rating.value}
              type="button"
              className={chipClass}
              onClick={() => close("submitted", rating.value)}
            >
              {rating.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
