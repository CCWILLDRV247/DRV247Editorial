import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditorialInterludeBlock } from "@/components/editorial-interlude";
import { Drv247Wordmark } from "@/components/drv247-wordmark";
import { MagazineBack, MagazineLink } from "@/components/magazine-link";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { MoreNav } from "@/components/more-nav";
import { MOBILE_NAV_SLUGS, PRIMARY_NAV } from "@/config/magazine-nav";
import {
  interludeFromText,
  type EditorialInterlude,
} from "@/lib/engine/editorial-interlude";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  SITE_FOOTER,
} from "@/lib/engine/editorial-composition";

const mobileNav = PRIMARY_NAV.filter((item) =>
  (MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
);
const moreNav = PRIMARY_NAV.filter(
  (item) => !(MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
);

export function SiteHeader({
  title,
  backHref,
  testQuery,
}: {
  title: string;
  backHref?: string;
  testQuery?: string;
}) {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-[#1b1d1f]/5 bg-white">
      <div className={`${MAGAZINE_LAYOUT.header} flex h-14 items-center gap-2 md:h-16 md:gap-3`}>
        <MobileNavMenu testQuery={testQuery} className="md:hidden" />
        {backHref ? (
          <MagazineBack
            href={backHref}
            query={testQuery}
            className="flex size-8 items-center justify-center text-[#1b1d1f]"
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </MagazineBack>
        ) : (
          <MagazineLink
            href="/"
            query={testQuery}
            aria-label="DRV247 home"
            className="inline-flex shrink-0 items-center"
          >
            <Drv247Wordmark className="h-6 w-auto md:h-7" />
          </MagazineLink>
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
      <nav className={`${MAGAZINE_LAYOUT.header} hidden items-center gap-4 pb-3 md:flex`}>
        <div className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto">
          {mobileNav.map((item) => (
            <MagazineLink
              key={item.slug}
              href={item.href}
              query={testQuery}
              className="shrink-0 font-display text-lg font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/70 hover:text-[#1b1d1f]"
            >
              {item.name}
            </MagazineLink>
          ))}
        </div>
        {moreNav.length > 0 ? (
          <MoreNav
            items={moreNav.map((item) => ({
              slug: item.slug,
              name: item.name,
              href: item.href,
              query: testQuery,
            }))}
          />
        ) : null}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={HOMEPAGE_COMPOSITION.footerBand}>
      <div className={`${MAGAZINE_LAYOUT.page} ${MAGAZINE_LAYOUT.gutter}`}>
        <p className={HOMEPAGE_COMPOSITION.footerCopy}>{SITE_FOOTER.legal}</p>
        <p className={`mt-2 ${HOMEPAGE_COMPOSITION.footerCopy}`}>
          <a
            href={SITE_FOOTER.privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            className={HOMEPAGE_COMPOSITION.footerLink}
          >
            {SITE_FOOTER.privacyLabel}
          </a>
          {" | "}
          <a href={SITE_FOOTER.contactHref} className={HOMEPAGE_COMPOSITION.footerLink}>
            {SITE_FOOTER.contactLabel}
          </a>
        </p>
      </div>
    </footer>
  );
}

export function EmptyStories({ category }: { category: string }) {
  return (
    <div className="px-7 py-16 text-[#1b1d1f] lg:px-0">
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
    <div className="pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))] text-[#1b1d1f] md:px-0 lg:px-0">
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
        className={`${homeSpacing ? "mt-[52px]" : "mt-8"} ${HOMEPAGE_COMPOSITION.sectionTitle}`}
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
  interlude,
  size = "default",
  tuck = true,
}: {
  text?: string;
  interlude?: EditorialInterlude;
  size?: "default" | "home";
  /** When false, skip negative margins so a block above (e.g. Desk) is not pulled into the type. */
  tuck?: boolean;
}) {
  const item = interlude ?? interludeFromText(text ?? "");
  return (
    <EditorialInterludeBlock
      interlude={item}
      size={size}
      tuck={tuck}
      showType={false}
    />
  );
}
