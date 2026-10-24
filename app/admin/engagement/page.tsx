import Link from "next/link";
import { isPhase3bEnabled } from "@/lib/engagement/phase-3b";
import {
  DESK_TABS,
  DESK_WINDOWS,
  getCachedIntelligenceDesk,
  parseDeskTab,
  type DeskTab,
} from "@/lib/engagement/intelligence";
import { parseDeskWindow, type DeskWindowDays } from "@/lib/engagement/impressions";
import {
  INSUFFICIENT_DATA_COPY,
  formatRate,
  formatWeighted,
  type ExposureRates,
} from "@/lib/engagement/rates";
import type { ArticleRateRow, DimRateRow, EmergingInterest } from "@/lib/engagement/emerging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAB_LABELS: Record<DeskTab, string> = {
  overview: "Overview",
  content: "Content",
  interests: "Interests",
  publishers: "Publishers",
  feedback: "Feedback",
};

function href(days: DeskWindowDays, tab: DeskTab) {
  return `/admin/engagement?days=${days}&tab=${tab}`;
}

function RateCells({ row }: { row: ExposureRates }) {
  return (
    <>
      <td className="py-1">{row.impressionUniques}</td>
      <td className="py-1">{formatRate(row.openRate)}</td>
      <td className="py-1">{formatRate(row.outboundRate)}</td>
      <td className="py-1">{formatRate(row.saveRate)}</td>
      <td className="py-1">{formatRate(row.shareRate)}</td>
      <td className="py-1">{formatWeighted(row.weightedScore)}</td>
    </>
  );
}

function RateHead() {
  return (
    <>
      <th className="pb-2 font-display uppercase">Impression uniques</th>
      <th className="pb-2 font-display uppercase">Open</th>
      <th className="pb-2 font-display uppercase">Outbound</th>
      <th className="pb-2 font-display uppercase">Save</th>
      <th className="pb-2 font-display uppercase">Share</th>
      <th className="pb-2 font-display uppercase">Weighted</th>
    </>
  );
}

function RateTable<T extends ExposureRates>({
  rows,
  label,
  nameOf,
}: {
  rows: readonly T[];
  label: string;
  nameOf: (row: T) => string;
}) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm">No {label} in this window.</p>;
  }
  return (
    <table className="mt-4 w-full text-left text-sm">
      <thead>
        <tr>
          <th className="pb-2 font-display uppercase">{label}</th>
          <RateHead />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={nameOf(row)}>
            <td className="py-1">{nameOf(row)}</td>
            <RateCells row={row} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function EngagementAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const days = parseDeskWindow(params.days);
  const tab = parseDeskTab(params.tab);
  let report: Awaited<ReturnType<typeof getCachedIntelligenceDesk>> | null = null;
  let error: string | null = null;
  try {
    report = await getCachedIntelligenceDesk(days);
  } catch {
    error = "Couldn’t read engagement rollups from Turso.";
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1b1d1f]/60">
          Desk
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.04em]">
          Engagement
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#1b1d1f]/70">
          Exposure-adjusted rates vs impression uniques. Same window labelled on every table.
          Public trending stays Phase 2 gated. Phase 3B is {isPhase3bEnabled() ? "on" : "off"}.
          Weighted uses the trending weights and only appears with the component rates.
        </p>
        <p className="mt-4">
          <Link href="/admin/engine" rel="nofollow" className="font-display text-sm font-bold uppercase underline">
            Back to engine
          </Link>
        </p>

        <nav className="mt-6 flex flex-wrap gap-3 text-sm" aria-label="Date range">
          {DESK_WINDOWS.map((windowDays) => (
            <Link
              key={windowDays}
              href={href(windowDays, tab)}
              rel="nofollow"
              className={`font-display font-bold uppercase ${
                windowDays === days ? "underline" : "text-[#1b1d1f]/60"
              }`}
            >
              {windowDays} days
            </Link>
          ))}
        </nav>
        <nav className="mt-3 flex flex-wrap gap-3 text-sm" aria-label="Desk sections">
          {DESK_TABS.map((item) => (
            <Link
              key={item}
              href={href(days, item)}
              rel="nofollow"
              className={`font-display font-bold uppercase ${
                item === tab ? "underline" : "text-[#1b1d1f]/60"
              }`}
            >
              {TAB_LABELS[item]}
            </Link>
          ))}
        </nav>

        {error ? (
          <p className="mt-8 rounded-md border border-[#1b1d1f] px-3 py-2 text-sm">{error}</p>
        ) : null}

        {report ? (
          <div className="mt-8 space-y-10">
            <p className="text-sm text-[#1b1d1f]/70">
              {report.window.label}: {report.window.startDay} → {report.window.endDay}. Source:{" "}
              {report.source === "rollup" ? "nightly rollup" : "provisional raw events (rollup pending)"}.
            </p>

            {tab === "overview" ? <Overview report={report} /> : null}
            {tab === "content" ? <Content report={report} /> : null}
            {tab === "interests" ? <Interests report={report} /> : null}
            {tab === "publishers" ? (
              <section>
                <h2 className="font-display text-2xl font-black uppercase">Publishers</h2>
                <RankedRates
                  ranked={report.publishers.filter((row) => row.sufficient)}
                  insufficient={report.publishers.filter((row) => !row.sufficient)}
                  label="Publisher"
                  nameOf={(row: DimRateRow) => row.dimValue}
                />
              </section>
            ) : null}
            {tab === "feedback" ? <Feedback report={report} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Overview({
  report,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getCachedIntelligenceDesk>>>;
}) {
  return (
    <>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Overview</h2>
        <p className="mt-2 text-sm">
          {report.overview.sufficient
            ? `${report.overview.uniqueVisitors} impression uniques in ${report.window.label.toLowerCase()}.`
            : INSUFFICIENT_DATA_COPY}
        </p>
        <table className="mt-4 w-full max-w-xl text-left text-sm">
          <thead>
            <tr>
              <th className="pb-2 font-display uppercase">Rate</th>
              <th className="pb-2 font-display uppercase">Uniques</th>
              <th className="pb-2 font-display uppercase">Vs impressions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">Open</td>
              <td className="py-1">{report.overview.openUniques}</td>
              <td className="py-1">{formatRate(report.overview.openRate)}</td>
            </tr>
            <tr>
              <td className="py-1">Outbound</td>
              <td className="py-1">{report.overview.outboundUniques}</td>
              <td className="py-1">{formatRate(report.overview.outboundRate)}</td>
            </tr>
            <tr>
              <td className="py-1">Save</td>
              <td className="py-1">{report.overview.saveUniques}</td>
              <td className="py-1">{formatRate(report.overview.saveRate)}</td>
            </tr>
            <tr>
              <td className="py-1">Share</td>
              <td className="py-1">{report.overview.shareUniques}</td>
              <td className="py-1">{formatRate(report.overview.shareRate)}</td>
            </tr>
            <tr>
              <td className="py-1">Returning visitors</td>
              <td className="py-1">{report.overview.returningUniques ?? 0}</td>
              <td className="py-1">{formatRate(report.overview.returningRate)}</td>
            </tr>
          </tbody>
        </table>
        {report.overview.weightedScore != null ? (
          <p className="mt-2 text-sm text-[#1b1d1f]/70">
            Weighted (interested×3 + save×2 + share×2 + outbound×1 − less_like_this×2):{" "}
            {formatWeighted(report.overview.weightedScore)}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-2xl font-black uppercase">Recommendations</h2>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          Deterministic, internal only. No generative model. Floors must pass.
        </p>
        {report.recommendations.length === 0 ? (
          <p className="mt-2 text-sm">{INSUFFICIENT_DATA_COPY}</p>
        ) : (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {report.recommendations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-black uppercase">Totals</h2>
        <p className="mt-2 text-sm">
          {report.totals.totalEvents === 0
            ? "No engagement events yet."
            : `${report.totals.totalEvents} event${report.totals.totalEvents === 1 ? "" : "s"} stored.`}
        </p>
        {report.totals.byEvent.length > 0 ? (
          <table className="mt-4 w-full max-w-md text-left text-sm">
            <thead>
              <tr>
                <th className="pb-2 font-display uppercase">Event</th>
                <th className="pb-2 font-display uppercase">Count</th>
              </tr>
            </thead>
            <tbody>
              {report.totals.byEvent.map((row) => (
                <tr key={row.event}>
                  <td className="py-1">{row.event}</td>
                  <td className="py-1">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-2xl font-black uppercase">Trending gate</h2>
        <p className="mt-2 text-sm">
          Mode: <strong>{report.trending.mode}</strong>. {report.trending.reason}.
        </p>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          Score: {report.trending.formula}. Window: {report.trending.windowDays} days. Public
          heading stays Discover until every floor passes.
        </p>
        <table className="mt-4 w-full max-w-xl text-left text-sm">
          <thead>
            <tr>
              <th className="pb-2 font-display uppercase">Floor</th>
              <th className="pb-2 font-display uppercase">Need</th>
              <th className="pb-2 font-display uppercase">Have</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">Unique visitors</td>
              <td className="py-1">{report.trending.floors.uniqueVisitors}</td>
              <td className="py-1">{report.trending.observed.uniqueVisitors}</td>
            </tr>
            <tr>
              <td className="py-1">Positive events</td>
              <td className="py-1">{report.trending.floors.positiveEvents}</td>
              <td className="py-1">{report.trending.observed.positiveEvents}</td>
            </tr>
            <tr>
              <td className="py-1">Scored articles</td>
              <td className="py-1">{report.trending.floors.distinctScoredArticles}</td>
              <td className="py-1">{report.trending.observed.distinctScoredArticles}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

function RankedRates<T extends ExposureRates>({
  ranked,
  insufficient,
  label,
  nameOf,
}: {
  ranked: readonly T[];
  insufficient: readonly T[];
  label: string;
  nameOf: (row: T) => string;
}) {
  return (
    <>
      <h3 className="mt-6 font-display text-lg font-black uppercase">Ranked</h3>
      {ranked.length === 0 ? (
        <p className="mt-2 text-sm">{INSUFFICIENT_DATA_COPY}</p>
      ) : (
        <RateTable rows={ranked} label={label} nameOf={nameOf} />
      )}
      {insufficient.length > 0 ? (
        <>
          <h3 className="mt-8 font-display text-lg font-black uppercase">Insufficient data</h3>
          <p className="mt-2 text-sm text-[#1b1d1f]/70">{INSUFFICIENT_DATA_COPY}</p>
          <RateTable rows={insufficient} label={label} nameOf={nameOf} />
        </>
      ) : null}
    </>
  );
}

function Content({
  report,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getCachedIntelligenceDesk>>>;
}) {
  return (
    <>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Content</h2>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          Highest / underperforming open rate among titles with at least 8 impression uniques.
        </p>
        <RankedRates
          ranked={report.contentRanked.ranked}
          insufficient={report.contentRanked.insufficient}
          label="Article"
          nameOf={(row: ArticleRateRow) => row.title || `Article ${row.articleId}`}
        />
      </section>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Marques</h2>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          Extracted make entities only. Empty extract is omitted — not invented.
        </p>
        <RankedRates
          ranked={report.marques.filter((row) => row.sufficient)}
          insufficient={report.marques.filter((row) => !row.sufficient)}
          label="Marque"
          nameOf={(row: DimRateRow) => row.dimValue}
        />
      </section>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Categories</h2>
        <RankedRates
          ranked={report.categories.filter((row) => row.sufficient)}
          insufficient={report.categories.filter((row) => !row.sufficient)}
          label="Category"
          nameOf={(row: DimRateRow) => row.dimValue}
        />
      </section>
    </>
  );
}

function Interests({
  report,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getCachedIntelligenceDesk>>>;
}) {
  return (
    <>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Interests</h2>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          The 23 product tags only. Unknown extract tokens are dropped.
        </p>
        <RankedRates
          ranked={report.interests.filter((row) => row.sufficient)}
          insufficient={report.interests.filter((row) => !row.sufficient)}
          label="Interest"
          nameOf={(row: DimRateRow) => row.dimValue}
        />
      </section>
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Emerging</h2>
        <p className="mt-2 text-sm text-[#1b1d1f]/70">
          Open-rate delta vs {report.window.previousLabel.toLowerCase()}. Internal only — no
          public emerging labels.
        </p>
        {report.emerging.filter((row) => row.sufficientBoth).length === 0 ? (
          <p className="mt-2 text-sm">{INSUFFICIENT_DATA_COPY}</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr>
                <th className="pb-2 font-display uppercase">Interest</th>
                <th className="pb-2 font-display uppercase">Open now</th>
                <th className="pb-2 font-display uppercase">Open prior</th>
                <th className="pb-2 font-display uppercase">Delta</th>
                <th className="pb-2 font-display uppercase">n</th>
              </tr>
            </thead>
            <tbody>
              {report.emerging
                .filter((row: EmergingInterest) => row.sufficientBoth)
                .map((row) => (
                  <tr key={row.dimValue}>
                    <td className="py-1">{row.dimValue}</td>
                    <td className="py-1">{formatRate(row.openRate)}</td>
                    <td className="py-1">{formatRate(row.previous.openRate)}</td>
                    <td className="py-1">{formatRate(row.openRateDelta)}</td>
                    <td className="py-1">{row.impressionUniques}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Feedback({
  report,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getCachedIntelligenceDesk>>>;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-black uppercase">Feedback</h2>
      <p className="mt-2 text-sm text-[#1b1d1f]/70">
        Experience feedback themes from stored rating:reason. Not a teaser quality score.
      </p>
      {report.feedback.length === 0 ? (
        <p className="mt-2 text-sm">No experience feedback in this window.</p>
      ) : (
        <table className="mt-4 w-full max-w-xl text-left text-sm">
          <thead>
            <tr>
              <th className="pb-2 font-display uppercase">Theme</th>
              <th className="pb-2 font-display uppercase">Uniques</th>
            </tr>
          </thead>
          <tbody>
            {report.feedback.map((row) => (
              <tr key={row.dimValue}>
                <td className="py-1">{row.dimValue}</td>
                <td className="py-1">{row.impressionUniques}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
