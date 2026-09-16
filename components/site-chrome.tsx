import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";
import { MOBILE_NAV_SLUGS, PRIMARY_NAV } from "@/config/magazine-nav";

const mobileNav = PRIMARY_NAV.filter((item) =>
  (MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
);
const moreNav = PRIMARY_NAV.filter(
  (item) => !(MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
);

export function SiteHeader({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#1b1d1f]/5 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-16 md:px-6">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-8 items-center justify-center text-[#1b1d1f]"
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </Link>
        ) : (
          <Link
            href="/"
            className="font-display text-xl font-black uppercase tracking-[-0.04em] text-[#1b1d1f]"
          >
            DRV247
          </Link>
        )}
        <p className="min-w-0 flex-1 truncate text-center font-display text-2xl font-semibold text-[#1b1d1f]">
          {title}
        </p>
        <Link
          href="/admin/engine"
          className="rounded-lg bg-[#1b1d1f] px-3 py-1.5 font-display text-[12px] font-bold uppercase leading-6 text-white"
        >
          Desk
        </Link>
      </div>
      <nav className="mx-auto hidden max-w-6xl items-center gap-6 overflow-x-auto px-6 pb-3 md:flex">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className="font-display text-lg font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/70 hover:text-[#1b1d1f]"
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <nav className="flex items-center gap-4 overflow-x-auto px-4 pb-3 md:hidden">
        {mobileNav.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className="shrink-0 font-display text-base font-bold uppercase text-[#1b1d1f]/70"
          >
            {item.name}
          </Link>
        ))}
        {moreNav.length > 0 ? (
          <details className="relative shrink-0">
            <summary className="cursor-pointer list-none font-display text-base font-bold uppercase text-[#1b1d1f]/70 marker:content-none [&::-webkit-details-marker]:hidden">
              More
            </summary>
            <div className="absolute right-0 z-50 mt-2 min-w-[10rem] border border-[#1b1d1f]/10 bg-white p-3 shadow-sm">
              {moreNav.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="block py-1 font-display text-base font-bold uppercase text-[#1b1d1f]"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </details>
        ) : null}
      </nav>
    </header>
  );
}

export function EmptyStories({ category }: { category: string }) {
  return (
    <div className="px-7 py-16 text-[#1b1d1f]">
      <p className="font-display text-5xl font-black uppercase leading-[0.62] tracking-[-0.02em]">
        Nothing
        <br />
        on the
        <br />
        desk
      </p>
      <p className="mt-8 max-w-sm text-[18px] leading-[22px] tracking-[-0.36px]">
        No stories in {category} yet — check back after the next pull.
      </p>
    </div>
  );
}

export function SectionIntro({
  kicker,
  dek,
  blurb,
  stackKickerOnMobile = false,
  homeSpacing = false,
}: {
  kicker: string;
  dek: string;
  blurb: string;
  stackKickerOnMobile?: boolean;
  homeSpacing?: boolean;
}) {
  const kickerClass =
    "font-display font-black uppercase leading-[0.62] tracking-[-0.02em]";
  const kickerWords = kicker.split(/\s+/).filter(Boolean);

  return (
    <div className="px-7 text-[#1b1d1f] md:px-0">
      {stackKickerOnMobile ? (
        <>
          <p className={`${kickerClass} text-[80px] md:hidden`}>
            {kickerWords.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                {index > 0 ? <br /> : null}
                {word}
              </Fragment>
            ))}
          </p>
          <p
            className={`${kickerClass} hidden text-[clamp(3.5rem,10vw,5rem)] md:block`}
          >
            {kicker}
          </p>
        </>
      ) : (
        <p className={`${kickerClass} text-[clamp(3.5rem,10vw,5rem)]`}>
          {kicker}
        </p>
      )}
      <p
        className={`${homeSpacing ? "mt-[52px]" : "mt-8"} font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]`}
      >
        {dek}
      </p>
      <p
        className={`${homeSpacing ? "mt-[26px]" : "mt-4"} max-w-xl text-[18px] leading-[22px] tracking-[-0.36px]`}
      >
        {blurb}
      </p>
    </div>
  );
}

export function Interstitial({
  text,
  size = "default",
}: {
  text: string;
  size?: "default" | "home";
}) {
  return (
    <p
      className={cn(
        "px-7 font-display font-black uppercase tracking-[-0.02em] text-[#1b1d1f] md:px-0",
        size === "home"
          ? "-mt-8 -mb-8 pt-[52px] pb-[52px] text-[135px] leading-[0.64]"
          : "text-[clamp(4.5rem,14vw,8.4rem)] leading-[0.62]",
      )}
    >
      {text}
    </p>
  );
}
