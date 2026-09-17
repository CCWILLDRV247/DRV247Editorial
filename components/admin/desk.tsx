"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatFetchTime } from "@/lib/format";
import type { Category, Source } from "@/lib/db/schema";
import type { StoryDto } from "@/lib/stories";
import { toggleStoryHidden } from "@/app/admin/actions";

type Props = {
  categories: Category[];
  sources: Source[];
  stories: StoryDto[];
};

const TYPES = [
  { value: "rss", label: "RSS" },
  { value: "youtube", label: "YouTube" },
  { value: "newsapi", label: "NewsAPI" },
];

export function AdminDesk({ categories, sources, stories }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storyRows, setStoryRows] = useState(stories);

  useEffect(() => {
    setStoryRows(stories);
  }, [stories]);

  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  async function ingest(sourceId?: number, pipeline: "culture" | "v1" = "culture") {
    setBusy(sourceId ? `ingest-${sourceId}` : pipeline === "v1" ? "ingest-v1" : "ingest-all");
    setMessage(null);
    const response = await fetch("/api/admin/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        sourceId ? { sourceId, pipeline: "v1" } : pipeline === "v1" ? { pipeline: "v1" } : {},
      ),
    });
    const data = (await response.json()) as {
      results?: { sourceName: string; inserted: number; fetched: number; error: string | null; usedMock: boolean }[];
    };
    const lines = (data.results ?? []).map((result) => {
      if (result.error && !result.fetched) {
        return `${result.sourceName}: ${result.error}`;
      }
      return `${result.sourceName}: ${result.inserted} new / ${result.fetched} fetched${result.usedMock ? " (mock)" : ""}`;
    });
    setMessage(lines.join(" · ") || "Ingest finished.");
    setBusy(null);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function patchSource(id: number, patch: Record<string, unknown>) {
    setBusy(`source-${id}`);
    await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setBusy(null);
    router.refresh();
  }

  async function patchStory(id: number, patch: Record<string, unknown>) {
    setBusy(`story-${id}`);
    const response = await fetch(`/api/admin/stories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(null);
    if (!response.ok) {
      setMessage("Could not update that story.");
      return;
    }
    setStoryRows((rows) =>
      rows.map((story) => {
        if (story.id !== id) return story;
        const next = { ...story };
        if (typeof patch.hidden === "boolean") next.hidden = patch.hidden;
        if (typeof patch.categoryId === "number") {
          const category = categories.find((entry) => entry.id === patch.categoryId);
          if (category) {
            next.category = { id: category.id, slug: category.slug, name: category.name };
          }
        }
        return next;
      }),
    );
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Password-gated desk · no public accounts</p>
          <h1 className="font-display text-4xl font-black uppercase tracking-[-0.04em]">
            Editorial desk
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#1b1d1f]/70">
            This branch&apos;s ingest is the culture engine (27 live titles through wave 3). The leftover v1 RSS
            sources below (Motorsport, RACER, Jalopnik…) are not that pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => ingest()} disabled={busy !== null}>
            {busy === "ingest-all" ? "Ingesting…" : "Ingest culture titles"}
          </Button>
          <Button variant="outline" onClick={() => ingest(undefined, "v1")} disabled={busy !== null}>
            {busy === "ingest-v1" ? "Pulling v1…" : "v1 RSS leftover"}
          </Button>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
      {message ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold uppercase">Sources</h2>
          <SourceDialog categories={categories} onSaved={() => router.refresh()} />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Last fetch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">
                    {source.name}
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {source.identifier}
                    </p>
                  </TableCell>
                  <TableCell className="uppercase">{source.type}</TableCell>
                  <TableCell>{categoryName.get(source.defaultCategoryId)}</TableCell>
                  <TableCell>{formatFetchTime(source.lastFetchAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        source.lastFetchStatus === "error" ? "destructive" : "secondary"
                      }
                    >
                      {source.lastFetchStatus}
                    </Badge>
                    {source.lastFetchError ? (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {source.lastFetchError}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={source.enabled}
                      onCheckedChange={(checked) =>
                        patchSource(source.id, { enabled: checked === true })
                      }
                    />
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null || !source.enabled}
                      onClick={() => ingest(source.id)}
                    >
                      Pull
                    </Button>
                    <SourceDialog
                      categories={categories}
                      source={source}
                      onSaved={() => router.refresh()}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-extrabold uppercase">Stories</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hidden</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storyRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No stories yet — run Ingest now.
                  </TableCell>
                </TableRow>
              ) : (
                storyRows.map((story) => (
                  <TableRow key={story.id} className={story.hidden ? "opacity-60" : ""}>
                    <TableCell className="max-w-sm">
                      <a
                        href={`/story/${story.id}`}
                        className="font-medium hover:underline"
                      >
                        {story.title}
                      </a>
                    </TableCell>
                    <TableCell>{story.source.name}</TableCell>
                    <TableCell>
                      <Select
                        value={String(story.category.id)}
                        onValueChange={(value) => {
                          if (value) patchStory(story.id, { categoryId: Number(value) });
                        }}
                      >
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue>{story.category.name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <form action={toggleStoryHidden}>
                        <input type="hidden" name="id" value={story.id} />
                        <input
                          type="hidden"
                          name="hidden"
                          value={story.hidden ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="h-7 rounded-md border border-border px-2.5 text-sm hover:bg-muted"
                        >
                          {story.hidden ? "Unhide" : "Hide"}
                        </button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function SourceDialog({
  categories,
  source,
  onSaved,
}: {
  categories: Category[];
  source?: Source;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState(source?.type ?? "rss");
  const [identifier, setIdentifier] = useState(source?.identifier ?? "");
  const [categoryId, setCategoryId] = useState(
    String(source?.defaultCategoryId ?? categories[0]?.id ?? ""),
  );
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const payload = {
      id: source?.id,
      name,
      type,
      identifier,
      defaultCategoryId: Number(categoryId),
      enabled,
    };
    const response = await fetch("/api/admin/sources", {
      method: source ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not save source");
      return;
    }
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={source ? "ghost" : "outline"} />}>
        {source ? "Edit" : "Add source"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? "Edit source" : "Add source"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (value) setType(value as typeof type);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              {type === "rss"
                ? "Feed URL"
                : type === "youtube"
                  ? "Channel ID"
                  : "NewsAPI query"}
            </Label>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Default category</Label>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                if (value) setCategoryId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            Enabled
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={save} className="w-full">
            Save source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
