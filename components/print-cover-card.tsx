import { MagazineLink } from "@/components/magazine-link";
import type { PrintPublication } from "@/lib/engine/print";

export function PrintCoverCard({
  publication,
  href,
  compact = false,
}: {
  publication: PrintPublication;
  href: string;
  compact?: boolean;
}) {
  return (
    <MagazineLink href={href} className="group block min-w-0">
      <article
        className={`flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl bg-[#1b1d1f] text-white ${
          compact ? "px-4 py-4" : "px-5 py-6"
        }`}
      >
        <p className="font-display text-sm font-bold uppercase leading-none text-white/55 md:text-lg">
          {publication.status === "ceased" ? "Archive" : "Print"}
        </p>
        <div>
          <h3
            className={`font-display font-black uppercase leading-[0.70] tracking-[-0.02em] ${
              compact
                ? "text-[1.65rem]"
                : "text-[clamp(2rem,6vw,3.25rem)]"
            }`}
          >
            {publication.title}
          </h3>
          {!compact && publication.tagline ? (
            <p className="mt-4 text-[18px] leading-[22px] tracking-[-0.36px] text-white/80">
              {publication.tagline}
            </p>
          ) : null}
        </div>
      </article>
    </MagazineLink>
  );
}
