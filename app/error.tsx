"use client";

import { SiteHeader } from "@/components/site-chrome";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Stories" />
      <div className="mx-auto max-w-xl px-7 py-16">
        <p className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
          Desk
          <br />
          jammed
        </p>
        <p className="mt-8 text-[18px] leading-[22px]">
          {error.message || "A feed pull failed. Retry from here, or open the desk to inspect the source."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 h-11 w-full rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
