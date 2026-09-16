import Link from "next/link";
import { SiteHeader } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Missing" backHref="/" />
      <div className="mx-auto max-w-xl px-7 py-16">
        <p className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
          Off
          <br />
          the
          <br />
          grid
        </p>
        <p className="mt-8 text-[18px] leading-[22px]">
          That story or category isn&apos;t on the desk.
        </p>
        <Link
          href="/"
          className="mt-8 flex h-11 items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
        >
          Back to stories
        </Link>
      </div>
    </div>
  );
}
