"use client";

import type { ReactNode } from "react";
import { ENGAGEMENT_EVENTS } from "@/lib/engagement/events";
import { recordMagazineEngagement } from "@/lib/engagement/record";
import { signalMeaningfulEngage } from "@/lib/engagement/feedback";

export function OutboundStoryLink({
  href,
  articleId,
  children,
}: {
  href: string;
  articleId: number;
  children: ReactNode;
}) {
  function onClick() {
    signalMeaningfulEngage();
    void recordMagazineEngagement({ name: ENGAGEMENT_EVENTS.outbound, data: { articleId } });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="mt-3 flex h-11 w-full items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
    >
      {children}
    </a>
  );
}
