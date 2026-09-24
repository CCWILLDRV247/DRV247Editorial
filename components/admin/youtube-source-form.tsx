"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function YoutubeSourceForm() {
  const [channel, setChannel] = useState("");
  const [publication, setPublication] = useState("");
  const [maxArticles, setMaxArticles] = useState("8");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/youtube-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        publication: publication.trim() || undefined,
        maxArticles: Number(maxArticles) || 8,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      created?: boolean;
      usedMock?: boolean;
      source?: { publication?: string; channelId?: string | null };
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not add that channel");
      return;
    }
    const mock = data.usedMock ? " Mock videos will ingest until YOUTUBE_API_KEY is set." : "";
    setMessage(
      `${data.created ? "Added" : "Updated"} ${data.source?.publication ?? "channel"}${
        data.source?.channelId ? ` · ${data.source.channelId}` : ""
      }.${mock}`,
    );
    setChannel("");
    window.location.reload();
  }

  return (
    <section className="rounded-lg border border-[#1b1d1f]/15 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Add YouTube channel</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#1b1d1f]/70">
        Paste a channel URL, @handle, or UC… ID. We store the canonical channel ID and ingest
        recent uploads through the same teaser pipeline as RSS. Videos always link out to
        youtube.com/watch — we do not embed or rehost.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_auto] md:items-end">
        <div className="space-y-1">
          <Label htmlFor="yt-channel">Channel</Label>
          <Input
            id="yt-channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            placeholder="https://www.youtube.com/@Petrolicious"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="yt-name">Name (optional)</Label>
          <Input
            id="yt-name"
            value={publication}
            onChange={(event) => setPublication(event.target.value)}
            placeholder="Petrolicious"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="yt-max">Recent</Label>
          <Input
            id="yt-max"
            type="number"
            min={1}
            max={50}
            value={maxArticles}
            onChange={(event) => setMaxArticles(event.target.value)}
          />
        </div>
        <Button disabled={busy || !channel.trim()} onClick={() => void save()}>
          {busy ? "Adding…" : "Add channel"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-[#1b1d1f]/80">{message}</p> : null}
    </section>
  );
}
