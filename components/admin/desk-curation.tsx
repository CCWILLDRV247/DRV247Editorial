"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DESK_LABELS, type DeskLabelSlug } from "@/lib/engine/desk-labels";

type DeskRow = {
  id: number;
  articleId: number;
  label: DeskLabelSlug;
  labelName: string;
  note: string | null;
  featured: boolean;
  active: boolean;
  live: boolean;
  article: { id: number; title: string; publication: string } | null;
};

type SearchHit = { id: number; title: string; publication: string };

export function DeskCuration() {
  const [picks, setPicks] = useState<DeskRow[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | DeskRow["article"]>(null);
  const [note, setNote] = useState("");
  const [label, setLabel] = useState<DeskLabelSlug>("from-the-desk");
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh(search = query) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const response = await fetch(`/api/admin/desk?${params.toString()}`);
    const data = (await response.json()) as { picks?: DeskRow[]; search?: SearchHit[]; error?: string };
    setPicks(data.picks ?? []);
    setHits(data.search ?? []);
    if (data.error) setMessage(data.error);
  }

  useEffect(() => {
    void fetch("/api/admin/desk")
      .then((response) => response.json())
      .then((data: { picks?: DeskRow[]; error?: string }) => {
        setPicks(data.picks ?? []);
        if (data.error) setMessage(data.error);
      })
      .catch(() => setPicks([]));
  }, []);

  async function save(articleId: number) {
    setBusy(`save-${articleId}`);
    setMessage(null);
    const response = await fetch("/api/admin/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId,
        note: note.trim() || null,
        label,
        featured,
        active,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Could not save that pick.");
      return;
    }
    setMessage("Desk pick saved.");
    setNote("");
    setFeatured(false);
    setActive(true);
    setSelected(null);
    await refresh();
  }

  async function patch(pick: DeskRow, next: Partial<DeskRow> & { note?: string | null }) {
    setBusy(`pick-${pick.id}`);
    await fetch("/api/admin/desk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: pick.id,
        articleId: pick.articleId,
        note: next.note === undefined ? pick.note : next.note,
        label: next.label ?? pick.label,
        featured: next.featured ?? pick.featured,
        active: next.active ?? pick.active,
      }),
    });
    setBusy(null);
    await refresh();
  }

  async function remove(id: number) {
    setBusy(`del-${id}`);
    await fetch(`/api/admin/desk?id=${id}`, { method: "DELETE" });
    setBusy(null);
    await refresh();
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold uppercase">The DRV247 Desk</h2>
      <p className="mb-3 max-w-3xl text-sm text-[#1b1d1f]/70">
        Human picks only. Search a stored teaser, mark it Desk-curated, optionally add a short note,
        and assign a label. Notes are never generated. Inactive or expired picks leave the homepage
        module. Password is still desk247.
      </p>
      {message ? <p className="mb-3 text-sm text-[#1b1d1f]/80">{message}</p> : null}

      <form
        className="mb-6 grid gap-3 rounded-lg border border-[#1b1d1f]/10 p-3 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh(query);
        }}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="desk-search">Select an article</Label>
            <Input
              id="desk-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title…"
            />
          </div>
          {hits.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={`w-full rounded px-2 py-1 text-left ${
                      selected?.id === hit.id ? "bg-[#1b1d1f] text-white" : "hover:bg-[#f6f6f6]"
                    }`}
                    onClick={() => setSelected(hit)}
                  >
                    <span className="font-medium">{hit.title}</span>
                    <span className="ml-2 text-xs opacity-70">
                      #{hit.id} · {hit.publication}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div>
            <Label htmlFor="desk-note">Short note (optional)</Label>
            <Textarea
              id="desk-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Leave blank if the story should just carry a label."
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Label</Label>
              <Select value={label} onValueChange={(value) => setLabel(value as DeskLabelSlug)}>
                <SelectTrigger className="min-w-52">
                  <SelectValue>
                    {DESK_LABELS.find((item) => item.slug === label)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DESK_LABELS.map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={featured} onCheckedChange={(checked) => setFeatured(checked === true)} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
              Active
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2 self-end">
          <Button type="submit" variant="outline" disabled={Boolean(busy)}>
            Search
          </Button>
          <Button
            type="button"
            disabled={!selected || Boolean(busy)}
            onClick={() => selected && void save(selected.id)}
          >
            {busy?.startsWith("save") ? "Saving…" : "Mark Desk-curated"}
          </Button>
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Story</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {picks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-[#1b1d1f]/60">
                Nothing on the Desk yet. Search a teaser above.
              </TableCell>
            </TableRow>
          ) : (
            picks.map((pick) => (
              <TableRow key={pick.id}>
                <TableCell>
                  <p className="font-medium">{pick.article?.title ?? `Article #${pick.articleId}`}</p>
                  <p className="text-xs text-[#1b1d1f]/60">
                    #{pick.articleId} · {pick.article?.publication ?? "missing"}
                    {pick.featured ? " · featured" : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{pick.labelName}</Badge>
                </TableCell>
                <TableCell className="max-w-xs text-sm text-[#1b1d1f]/80">
                  {pick.note ?? "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {pick.live ? "live" : pick.active ? "expired" : "inactive"}
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() => void patch(pick, { active: !pick.active })}
                  >
                    {pick.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() => void patch(pick, { featured: !pick.featured })}
                  >
                    {pick.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(busy)}
                    onClick={() => void remove(pick.id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
