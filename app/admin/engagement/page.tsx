import Link from "next/link";
import { loadEngagementReport } from "@/lib/engagement/aggregates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EngagementAdminPage() {
  let report: Awaited<ReturnType<typeof loadEngagementReport>> | null = null;
  let error: string | null = null;
  try {
    report = await loadEngagementReport();
  } catch {
    error = "Couldn’t read engagement_events from Turso.";
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
          Real Turso writes only. Empty counts mean no events yet — not a KPI. Public trending
          stays off until the floors below pass.
        </p>
        <p className="mt-4">
          <Link href="/admin/engine" rel="nofollow" className="font-display text-sm font-bold uppercase underline">
            Back to engine
          </Link>
        </p>

        {error ? (
          <p className="mt-8 rounded-md border border-[#1b1d1f] px-3 py-2 text-sm">{error}</p>
        ) : null}

        {report ? (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="font-display text-2xl font-black uppercase">Totals</h2>
              <p className="mt-2 text-sm">
                {report.totalEvents === 0
                  ? "No engagement events yet."
                  : `${report.totalEvents} event${report.totalEvents === 1 ? "" : "s"} stored.`}
              </p>
              {report.byEvent.length > 0 ? (
                <table className="mt-4 w-full max-w-md text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-2 font-display uppercase">Event</th>
                      <th className="pb-2 font-display uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byEvent.map((row) => (
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
                Score: {report.trending.formula}. Window: {report.trending.windowDays} days.
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

            <section>
              <h2 className="font-display text-2xl font-black uppercase">Top article ids</h2>
              {report.topArticles.length === 0 ? (
                <p className="mt-2 text-sm">No article-scoped events yet.</p>
              ) : (
                <table className="mt-4 w-full max-w-md text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-2 font-display uppercase">Article</th>
                      <th className="pb-2 font-display uppercase">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topArticles.map((row) => (
                      <tr key={row.articleId}>
                        <td className="py-1">{row.articleId}</td>
                        <td className="py-1">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
