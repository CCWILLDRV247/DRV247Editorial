import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";
import { MAGAZINE_NAV } from "@/config/magazine-nav";

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
        {MAGAZINE_NAV.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="font-display text-lg font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/70 hover:text-[#1b1d1f]"
          >
            {category.name}
          </Link>
        ))}
      </nav>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-3 md:hidden">
        {MAGAZINE_NAV.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="shrink-0 font-display text-base font-bold uppercase text-[#1b1d1f]/70"
          >
            {category.name}
          </Link>
        ))}
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
        "px-7 font-display font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f] md:px-0",
        size === "home"
          ? "text-[135px]"
          : "text-[clamp(4.5rem,14vw,8.4rem)]",
      )}
    >
      {text}
    </p>
  );
}
