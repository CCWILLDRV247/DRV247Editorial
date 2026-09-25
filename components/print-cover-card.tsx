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
  const image = publication.coverImageUrl;
  const kicker = publication.status === "ceased" ? "Archive" : "Print";

  return (
    <MagazineLink href={href} className="group block min-w-0">
      <article
        className={`relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl bg-[#1b1d1f] text-white ${
          compact ? "px-4 py-4" : "px-5 py-6"
        }`}
      >
        {image ? (
          <img
            src={image}
            alt=""
            className={
              publication.imageKind === "logo"
                ? "absolute inset-0 h-full w-full object-contain p-6 md:p-8"
                : "absolute inset-0 h-full w-full object-cover"
            }
          />
        ) : null}
        <p
          className={`relative font-display text-sm font-bold uppercase leading-none md:text-lg ${
            image ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" : "text-white/55"
          }`}
        >
          {kicker}
        </p>
        {!image ? (
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
        ) : (
          <span className="sr-only">{publication.title}</span>
        )}
      </article>
    </MagazineLink>
  );
}
