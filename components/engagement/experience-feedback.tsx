"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  experienceFeedbackHeadingLines,
  experienceFeedbackSurface,
  experienceFollowUpPrompt,
  readExperienceFeedbackStored,
  shouldShowExperienceFeedback,
  writeExperienceFeedbackStored,
} from "@/lib/engagement/feedback";

/**
 * Same surface language as PersonalizationInterestsModal / Figma 1:254.
 * Do not invent a second radius, border, or heading scale.
 */
const PANEL_CARD_CLASS =
  "pointer-events-auto relative w-[calc(100%-20px)] max-w-[468px] overflow-hidden rounded-[15px] border-[1.5px] border-[#c4c4c4] bg-white p-0 text-[#1b1d1f] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.16)] sm:max-w-[468px]";

const PANEL_BODY_CLASS = "flex min-h-0 flex-col gap-5 px-[17px] pt-[44px] pb-5";

const PANEL_HEADING_CLASS =
  "font-display text-[clamp(3.75rem,17.1vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f]";

const PANEL_CLOSE_CLASS =
  "absolute top-[16.5px] right-[20px] z-10 flex border-0 bg-transparent p-0";

function panelChipClass(on: boolean) {
  return on
    ? "flex h-[52px] w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-[#1b1d1f] px-1 text-center font-display text-[18px] font-extrabold uppercase leading-6 text-white"
    : "flex h-[52px] w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-1 text-center font-display text-[18px] font-extrabold uppercase leading-6 text-[#1b1d1f]";
}

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
  const headingLines = experienceFeedbackHeadingLines(prompt);

  return (
    <aside
      role="region"
      aria-label="DRV247 experience"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(10px,env(safe-area-inset-bottom))] md:justify-end md:pr-[10px] md:pb-[10px]"
    >
      <div className={PANEL_CARD_CLASS}>
        <button
          type="button"
          onClick={dismiss}
          className={PANEL_CLOSE_CLASS}
          aria-label="Dismiss experience feedback"
        >
          <img
            src="/personalization-close.svg"
            alt=""
            width={14.7333}
            height={14.7333}
            aria-hidden
          />
          <span className="sr-only">Close</span>
        </button>
        <div className={PANEL_BODY_CLASS}>
          <h2 className={PANEL_HEADING_CLASS}>
            {headingLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          {rating ? (
            <div className="grid grid-cols-2 gap-[10px]" role="group" aria-label={prompt}>
              {EXPERIENCE_FEEDBACK_REASONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${panelChipClass(false)}${value === "sources" ? " col-span-2" : ""}`}
                  onClick={() => submit(value)}
                >
                  {EXPERIENCE_FEEDBACK_REASON_LABELS[value]}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-[10px]" role="group" aria-label={prompt}>
              {EXPERIENCE_FEEDBACK_RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={panelChipClass(false)}
                  onClick={() => setRating(value)}
                >
                  {EXPERIENCE_FEEDBACK_RATING_LABELS[value]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
