"use client";

import { DeskLink } from "@/components/admin/desk-tooltip";

const DESK_TAB_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    tooltip:
      "Summary rates, deterministic recommendations, event totals, and trending gate floors for the selected date window.",
  },
  {
    id: "content",
    label: "Content",
    tooltip:
      "Article open-rate leaders and laggards, plus marque and category performance with exposure adjustment.",
  },
  {
    id: "interests",
    label: "Interests",
    tooltip:
      "Performance of the 23 product interest tags and emerging open-rate deltas versus the prior window.",
  },
  {
    id: "publishers",
    label: "Publishers",
    tooltip:
      "Publisher-level impression, open, outbound, save, share, and weighted rates for the window.",
  },
  {
    id: "feedback",
    label: "Feedback",
    tooltip:
      "Themes from stored experience feedback (rating reasons)—not a teaser quality score.",
  },
] as const;

function href(days: number, tab: string) {
  return `/admin/engagement?days=${days}&tab=${tab}`;
}

export function EngagementDeskNav({
  windows,
  days,
  tab,
}: {
  windows: readonly number[];
  days: number;
  tab: string;
}) {
  return (
    <>
      <nav className="mt-6 flex flex-wrap gap-3 text-sm" aria-label="Date range">
        {windows.map((windowDays) => (
          <DeskLink
            key={windowDays}
            href={href(windowDays, tab)}
            rel="nofollow"
            tooltip={`Show engagement metrics aggregated over the last ${windowDays} days; all tables use this window.`}
            className={`font-display font-bold uppercase ${
              windowDays === days ? "underline" : "text-[#1b1d1f]/60"
            }`}
          >
            {windowDays} days
          </DeskLink>
        ))}
      </nav>
      <nav className="mt-3 flex flex-wrap gap-3 text-sm" aria-label="Desk sections">
        {DESK_TAB_ITEMS.map((item) => (
          <DeskLink
            key={item.id}
            href={href(days, item.id)}
            rel="nofollow"
            tooltip={item.tooltip}
            className={`font-display font-bold uppercase ${
              item.id === tab ? "underline" : "text-[#1b1d1f]/60"
            }`}
          >
            {item.label}
          </DeskLink>
        ))}
      </nav>
    </>
  );
}
