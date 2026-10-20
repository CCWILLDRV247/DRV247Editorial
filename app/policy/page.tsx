import type { Metadata } from "next";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import { buildWebPageJsonLd } from "@/lib/seo/json-ld";
import { POLICY_META, buildPolicyMetadata, editorialCanonicalPath } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return buildPolicyMetadata();
}

const bodyClass = "text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]";
const stackClass = `mt-5 space-y-5 ${bodyClass}`;
const listClass = `mt-5 list-outside space-y-2 pl-5 ${bodyClass}`;
const linkClass = "underline underline-offset-2 hover:text-[#1b1d1f]";

function PolicyHeading({ children }: { children: string }) {
  return <h2 className={`mt-12 ${HOMEPAGE_COMPOSITION.sectionTitle}`}>{children}</h2>;
}

export default function PolicyPage() {
  const jsonLd = buildWebPageJsonLd({
    name: POLICY_META.title,
    description: POLICY_META.description,
    pageUrl: editorialCanonicalPath(POLICY_META.path),
  });

  return (
    <MagazineQueryProvider>
      <JsonLdScript data={jsonLd} />
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title="Policy" />
        <article className={`${MAGAZINE_LAYOUT.reading} pb-20`}>
          <div className="px-7 pt-10 md:px-8 lg:max-w-3xl lg:px-0">
            <h1 className="font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f] lg:text-[clamp(2.75rem,5vw,4rem)]">
              {POLICY_META.title}
            </h1>

            <div className={`mt-8 space-y-5 ${bodyClass}`}>
              <p>
                DRV247 Editorial is a vehicle-aware magazine desk. We follow automotive
                publications, show a short teaser on editorial.drv247.com, and send readers to the
                original.
              </p>
              <p>DRV247 is a trading name of DriveClub Limited.</p>
              <p>
                This page is for publishers and readers who want to know what we index and how to
                ask us to stop. It is not a privacy policy, a licence, or a substitute for a
                publication’s own robots.txt or terms.
              </p>
            </div>

            <PolicyHeading>What we index</PolicyHeading>
            <div className={stackClass}>
              <p>
                We surface <strong>editorial stories</strong> from publications we follow —
                features, news, columns, and video posts that belong on a car desk.
              </p>
              <p>Typical teaser fields:</p>
            </div>
            <ul className={`${listClass} list-disc`}>
              <li>headline</li>
              <li>publication name</li>
              <li>date and desk category (Cars, Culture, Driving, Events)</li>
              <li>a short excerpt from the feed or page metadata</li>
              <li>
                a short extract (standfirst, meta description, or first substantial paragraph)
              </li>
              <li>an image URL when the source provides one</li>
              <li>
                a link out: <strong>Read on {"{publication}"}</strong> or{" "}
                <strong>Watch on {"{publication}"}</strong>
              </li>
            </ul>
            <div className={stackClass}>
              <p>
                We aim to skip shop and merch URLs, about/contact/legal pages, subscribe and
                competition funnels, and bare section indexes. We may still miss one; tell us.
              </p>
              <p>
                We only list a teaser when the source is enabled and the URL looks like a story.
                Hidden items do not appear on the public desk or in our sitemap.
              </p>
              <p>
                We do not claim to cover every title, and we do not claim a missing title is an
                agreement.
              </p>
            </div>

            <PolicyHeading>Teasers only — we link out</PolicyHeading>
            <div className={stackClass}>
              <p>
                We are an aggregator. The original article or video stays on the publisher’s site.
              </p>
              <p>
                We store a headline, a short feed excerpt, a short extract, attribution, and the
                outbound URL. We do not store or render the full third-party article, and we do
                not host the video file.
              </p>
              <p>
                Our story URLs (<code className="font-[inherit]">/story/…</code>) are teasers on{" "}
                <strong>this</strong> host. A canonical tag here describes our page. It does not
                replace the publisher’s canonical, robots.txt, or meta robots on the original.
              </p>
            </div>

            <PolicyHeading>Source robots.txt</PolicyHeading>
            <div className={stackClass}>
              <p>
                A short policy page on our site does <strong>not</strong> replace a publisher’s
                robots.txt. Search engines still read <strong>your</strong> robots file, not ours,
                when they crawl <strong>your</strong> site.
              </p>
              <p>How we treat it on ingest, honestly:</p>
            </div>
            <ul className={`${listClass} list-disc`}>
              <li>
                <strong>Homepage scrape</strong> (fallback when there is no usable feed or
                sitemap): we fetch{" "}
                <code className="font-[inherit]">{"{your-origin}"}/robots.txt</code> and skip
                paths that file disallows.
              </li>
              <li>
                <strong>RSS, Atom, and sitemaps you publish:</strong> we treat those as feeds you
                chose to expose. We do not re-check robots.txt on those paths today.
              </li>
              <li>
                If robots.txt cannot be fetched, scrape may still run. Blocking our fetches at the
                edge, or disabling the public feed, is stronger than this page.
              </li>
            </ul>
            <div className={stackClass}>
              <p>
                Our own{" "}
                <a
                  href="https://editorial.drv247.com/robots.txt"
                  className={linkClass}
                >
                  https://editorial.drv247.com/robots.txt
                </a>{" "}
                only governs this host (public magazine allowed;{" "}
                <code className="font-[inherit]">/admin</code> disallowed). It says nothing about
                your site.
              </p>
              <p>
                Good canonicals and outbound links on our teasers reduce “we copied the article”
                signals. They do not grant us a right you did not give, and they do not switch off
                your robots.txt.
              </p>
            </div>

            <PolicyHeading>How to opt out</PolicyHeading>
            <div className={stackClass}>
              <p>
                There is no self-serve form yet. Email us and we will take the source off the live
                desk and remove matching teasers.
              </p>
              <p>
                Send{" "}
                <a href="mailto:support@drv247.com" className={linkClass}>
                  <strong>support@drv247.com</strong>
                </a>{" "}
                with:
              </p>
            </div>
            <ol className={`${listClass} list-decimal`}>
              <li>Publication name and site URL</li>
              <li>
                Whether this is <strong>the whole title</strong> or{" "}
                <strong>specific story URLs</strong>
              </li>
              <li>A contact name (and a page we can check, if useful)</li>
            </ol>
            <div className={stackClass}>
              <p>What we will do:</p>
            </div>
            <ul className={`${listClass} list-disc`}>
              <li>disable the source so new ingest stops</li>
              <li>hide or remove the teasers already on the desk</li>
              <li>drop those URLs from the next sitemap refresh</li>
            </ul>
            <div className={stackClass}>
              <p>
                Please allow a short working interval after we reply. This is a desk action, not an
                automatic robots.txt hook.
              </p>
              <p>
                A <code className="font-[inherit]">Disallow</code> in your robots.txt helps the
                scrape fallback. It does not, by itself, pull existing teasers or stop us reading a
                public RSS/Atom/sitemap you still publish. If you want to be off the desk, email is
                the reliable path.
              </p>
            </div>

            <PolicyHeading>Contact</PolicyHeading>
            <div className={stackClass}>
              <p>
                Publishers and readers:{" "}
                <a href="mailto:support@drv247.com" className={linkClass}>
                  <strong>support@drv247.com</strong>
                </a>
              </p>
              <p>
                Privacy (app / account TOS):{" "}
                <a
                  href="https://drv247.app/tos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  drv247.app/tos
                </a>
              </p>
            </div>
          </div>
        </article>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
