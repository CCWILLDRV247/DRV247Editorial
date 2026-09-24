export function YoutubeSourceForm({
  notice,
}: {
  notice?: { ok: boolean; text: string } | null;
}) {
  return (
    <details
      open={Boolean(notice)}
      className="relative z-20 overflow-visible rounded-lg border border-[#1b1d1f]/15 p-4"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 touch-manipulation [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold uppercase">Add YouTube channel</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#1b1d1f]/70">
            Paste a channel URL, @handle, or UC… ID. We store the canonical channel ID and ingest
            recent uploads through the same teaser pipeline as RSS. Videos always link out to
            youtube.com/watch — we do not embed or rehost.
          </p>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center rounded-[5px] border border-[#1b1d1f] px-3 font-display text-sm font-extrabold uppercase">
          Add channel
        </span>
      </summary>
      <form
        method="post"
        action="/api/admin/youtube-sources"
        className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_auto] md:items-end"
      >
        <label className="block min-w-0 space-y-1">
          <span className="text-sm font-medium">Channel</span>
          <input
            name="channel"
            required
            autoComplete="off"
            placeholder="https://www.youtube.com/@Petrolicious"
            className="h-10 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 text-sm text-[#1b1d1f]"
          />
        </label>
        <label className="block min-w-0 space-y-1">
          <span className="text-sm font-medium">Name (optional)</span>
          <input
            name="publication"
            autoComplete="off"
            placeholder="Petrolicious"
            className="h-10 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 text-sm text-[#1b1d1f]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Recent</span>
          <input
            name="maxArticles"
            type="number"
            min={1}
            max={50}
            defaultValue={8}
            className="h-10 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-3 text-sm text-[#1b1d1f]"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-[5px] bg-[#1b1d1f] px-3 font-display text-sm font-extrabold uppercase text-white"
        >
          Add channel
        </button>
      </form>
      {notice ? (
        <p className={`mt-3 text-sm ${notice.ok ? "text-[#1b1d1f]/80" : "text-red-700"}`}>
          {notice.text}
        </p>
      ) : null}
    </details>
  );
}
