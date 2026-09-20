"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENGINE_BRANCH, engineCommit } from "@/lib/engine/version";
import type { Article, IngestionRun, MediaSource } from "@/lib/db/schema";
import type { ClassificationDebugRow } from "@/lib/engine/queries";
import { FOR_YOU_DEMO_PROFILES, type ForYouDemoId } from "@/lib/engine/for-you-test";
import { DeskCuration } from "@/components/admin/desk-curation";

type Props = {
  sources: MediaSource[];
  runs: IngestionRun[];
  articles: Article[];
  classified: ClassificationDebugRow[];
};

export function EngineDesk({ sources, runs, articles, classified }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rankProfile, setRankProfile] = useState<ForYouDemoId>("A");
  const [ranking, setRanking] = useState<
    {
      id: number;
      title: string;
      score: number;
      why: string[];
      vehicleTier: string;
      signals: { kind: string; points: number; detail?: string }[];
      matches?: string[];
      user?: string;
      explanation?: string | null;
      confidence?: string;
      debug?: string;
    }[] | null
  >(null);

  async function ingest(sourceId?: string) {
    setBusy(sourceId ?? "all");
    setMessage(null);
    const response = await fetch("/api/editorial/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sourceId ? { sourceId } : {}),
    });
    const data = (await response.json()) as {
      results?: { publication: string; fetched: number; inserted: number; method: string | null; error: string | null }[];
    };
    setMessage(
      (data.results ?? [])
        .map((result) =>
          result.error
            ? `${result.publication}: ${result.error}`
            : `${result.publication}: ${result.inserted} new / ${result.fetched} via ${result.method}`,
        )
        .join(" · "),
    );
    setBusy(null);
    window.location.reload();
  }

  async function reprocess() {
    setBusy("reprocess");
    await fetch("/api/editorial/reprocess", { method: "POST" });
    setBusy(null);
    window.location.reload();
  }

  async function backfillMetadata() {
    setBusy("metadata");
    setMessage(null);
    const response = await fetch("/api/editorial/metadata", { method: "POST" });
    const data = (await response.json()) as { classified?: number; related?: number; error?: string };
    setMessage(
      data.error
        ? data.error
        : `Metadata backfill: ${data.classified ?? 0} classified · ${data.related ?? 0} related links`,
    );
    setBusy(null);
    window.location.reload();
  }

  const enabled = sources.filter((source) => source.enabled);

  useEffect(() => {
    const demo = FOR_YOU_DEMO_PROFILES[rankProfile];
    const query = new URLSearchParams({ profile: demo.id, limit: "16" });
    void fetch(`/api/editorial?${query.toString()}`)
      .then((response) => response.json())
      .then((data: { ranking?: typeof ranking }) => {
        setRanking(data.ranking ?? []);
      })
      .catch(() => setRanking([]));
  }, [rankProfile]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1b1d1f]/60">
            Automotive Culture Engine
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-[-0.04em]">
            Underground — 74 titles
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#1b1d1f]/70">
            Twenty-eight Priority underground titles are on (Petrolicious through Racecar Engineering).
            Research further, Manual only, and Reference only stay out. Fast Car stays the live Fast Car
            row. Flat 6 (French), AUTOMOBILSPORT (German), 9WERKS (paywall), and EuroStance (Shopify shop)
            stay dark. Autoitaliana has no DNS. Car & Classic and Just Auto stay enabled (Cloudflare
            403). Ingest skips non-English items, shop/product/collection/cart/merch URLs, auction
            and subscribe paths, empty or /undefined URLs, and off-site magazine-shop canonicals.
            Desk can backfill structured metadata on stored teasers. Mark human Desk picks in
            the section below — labels and optional notes, never generated copy. For You ranking
            debug is further down (article / score / card copy / debug). {ENGINE_BRANCH} @ {engineCommit().slice(0, 7)}.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 md:w-auto md:justify-end">
          <Link
            href="/admin"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm"
          >
            v1 desk
          </Link>
          <Button variant="outline" disabled={Boolean(busy)} onClick={() => void backfillMetadata()}>
            {busy === "metadata" ? "Classifying…" : "Backfill metadata"}
          </Button>
          <Button variant="outline" disabled={Boolean(busy)} onClick={() => void reprocess()}>
            Reprocess
          </Button>
          <Button disabled={Boolean(busy)} onClick={() => void ingest()}>
            {busy === "all" ? "Ingesting…" : "Ingest enabled"}
          </Button>
        </div>
      </div>
      {message ? <p className="text-sm text-[#1b1d1f]/80">{message}</p> : null}

      <DeskCuration />

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase">For You ranking</h2>
        <p className="mb-3 max-w-3xl text-sm text-[#1b1d1f]/70">
          Desk-only. Same 460 teasers, ranked around the test car. Reasons come from stored
          metadata — never invented copy. Switch A–D and the order must change.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(FOR_YOU_DEMO_PROFILES) as ForYouDemoId[]).map((id) => (
            <Button
              key={id}
              size="sm"
              variant={rankProfile === id ? "default" : "outline"}
              onClick={() => setRankProfile(id)}
            >
              {id} · {FOR_YOU_DEMO_PROFILES[id].label}
            </Button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Story</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Card copy</TableHead>
              <TableHead>Debug</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ranking ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-[#1b1d1f]/60">
                    #{row.id} · {row.vehicleTier}
                    {row.confidence ? ` · ${row.confidence}` : ""}
                  </p>
                </TableCell>
                <TableCell className="align-top font-mono text-sm">{row.score}</TableCell>
                <TableCell className="align-top text-xs">
                  {row.explanation ?? "—"}
                </TableCell>
                <TableCell className="align-top text-xs text-[#1b1d1f]/70">
                  {row.debug ? (
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5">{row.debug}</pre>
                  ) : (
                    <>
                      {row.why.length ? row.why.join(" · ") : "—"}
                      {row.signals?.length ? (
                        <p className="mt-1 text-[#1b1d1f]/55">
                          {row.signals
                            .map((signal) => `${signal.kind} ${signal.points}${signal.detail ? ` (${signal.detail})` : ""}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Config</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enabled.map((source) => (
            <TableRow key={source.id}>
              <TableCell>
                <p className="font-medium">{source.publication}</p>
                <p className="text-xs text-[#1b1d1f]/60">
                  {source.id} · {source.country}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{source.sourceType}</Badge>
                  <Badge variant="outline">{source.rssConfidence}</Badge>
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <p>{source.lastMethod ?? "—"}</p>
                <p className={source.lastError ? "text-red-700" : "text-[#1b1d1f]/60"}>
                  {source.lastError ?? (source.lastSuccessAt ? "ok" : "not run")}
                </p>
              </TableCell>
              <TableCell>
                {articles.filter((article) => article.sourceId === source.id).length}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => void ingest(source.id)}
                >
                  Run
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Recent runs</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fetched</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.slice(0, 12).map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.sourceId}</TableCell>
                <TableCell>{run.method ?? "—"}</TableCell>
                <TableCell>{run.status}</TableCell>
                <TableCell>
                  {run.inserted}/{run.fetched}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs">{run.errorMessage}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Classification</h2>
        <p className="mb-3 max-w-3xl text-sm text-[#1b1d1f]/70">
          Desk-only. Primary lens, vehicles (about / relevant / mentioned), interests, content type,
          geography, and rule confidence. Not shown in the magazine nav.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Story</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead>Type / scene</TableHead>
              <TableHead>Where</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classified.map((row) => {
              const snap = row.classification;
              const vehicles = (snap?.vehicles ?? [])
                .filter((vehicle) => vehicle.kind === "model" || vehicle.kind === "generation")
                .map(
                  (vehicle) =>
                    `${vehicle.make ? `${vehicle.make} ` : ""}${vehicle.name}${
                      vehicle.chassis && vehicle.kind !== "generation" ? ` ${vehicle.chassis}` : ""
                    } · ${vehicle.relevance} ${vehicle.confidence}`,
                );
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-[#1b1d1f]/60">
                      {row.publication} · #{row.id}
                    </p>
                  </TableCell>
                  <TableCell>
                    {snap ? (
                      <>
                        <Badge>{snap.primary}</Badge>
                        <p className="mt-1 text-xs text-[#1b1d1f]/60">
                          {snap.primaryConfidence} · {snap.source}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-[#1b1d1f]/50">unclassified</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {vehicles.length ? vehicles.join(" · ") : "—"}
                    {snap?.interests.length ? (
                      <p className="mt-1 text-[#1b1d1f]/60">{snap.interests.join(" · ")}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs">
                    {[...(snap?.contentTypes ?? []), ...(snap?.scenes ?? [])].join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(snap?.geography ?? []).map((place) => place.name).join(" · ") || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Latest teasers</h2>
        <ul className="space-y-3">
          {articles.slice(0, 12).map((article) => (
            <li key={article.id} className="border-b border-[#1b1d1f]/10 pb-3">
              <p className="text-xs uppercase tracking-wide text-[#1b1d1f]/50">
                {article.publication} · {article.ingestionMethod}
              </p>
              <a href={article.canonicalUrl} className="font-medium underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                {article.title}
              </a>
              <p className="text-sm text-[#1b1d1f]/70">{article.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
