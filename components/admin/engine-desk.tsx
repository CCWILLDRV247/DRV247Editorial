"use client";

import { useState } from "react";
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
import type { Article, IngestionRun, MediaSource } from "@/lib/db/schema";

type Props = {
  sources: MediaSource[];
  runs: IngestionRun[];
  articles: Article[];
};

export function EngineDesk({ sources, runs, articles }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const enabled = sources.filter((source) => source.enabled);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1b1d1f]/60">
            Automotive Culture Engine
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-[-0.04em]">
            Wave 1 — 10 titles
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#1b1d1f]/70">
            CSV is the source of truth. Only these ten are enabled. Remaining ~40 stay dark until the pipeline is proven.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin">v1 desk</Link>
          </Button>
          <Button variant="outline" disabled={Boolean(busy)} onClick={() => void reprocess()}>
            Reprocess
          </Button>
          <Button disabled={Boolean(busy)} onClick={() => void ingest()}>
            {busy === "all" ? "Ingesting…" : "Ingest 10"}
          </Button>
        </div>
      </div>
      {message ? <p className="text-sm text-[#1b1d1f]/80">{message}</p> : null}

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
