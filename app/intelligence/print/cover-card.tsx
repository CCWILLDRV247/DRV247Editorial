import Link from "next/link";
import type { PrintPublication } from "@/lib/intelligence/print";

export function PrintCoverCard({
  publication,
  href,
}: {
  publication: PrintPublication;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <article className="flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl bg-[#1b1d1f] px-5 py-6 text-white">
        <p className="font-display text-lg font-bold uppercase leading-none text-white/55">
          {publication.status === "ceased" ? "Archive" : "Print"}
        </p>
        <div>
          <h3 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-black uppercase leading-[0.70] tracking-[-0.02em]">
            {publication.title}
          </h3>
          {publication.tagline ? (
            <p className="mt-4 text-[18px] leading-[22px] tracking-[-0.36px] text-white/80">
              {publication.tagline}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
