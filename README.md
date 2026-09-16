# DRV247 Editorial

UK/EU automotive culture desk. Nineteen culture titles (original ten plus wave 2, including Turnpike; Flat 6 and AUTOMOBILSPORT stay dark), teasers and outbound links only — never full article bodies. Ingest keeps English teasers and skips non-English items. User-facing nav is For You, Cars, Culture, Driving, Motorsport, and Events.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

Default desk password (when `ADMIN_PASSWORD` is unset): `desk247`.

Locally the app uses a file SQLite database at `data/drv247.sqlite` via libSQL. On Vercel it must use **Turso**.

## Vercel env vars

Set these on the `drv247-editorial` project (Preview and Production):

| Name | Why |
| --- | --- |
| `TURSO_DATABASE_URL` | libSQL URL, e.g. `libsql://drv247-editorial-….turso.io` |
| `TURSO_AUTH_TOKEN` | Turso database token |
| `CRON_SECRET` | Shared secret for weekly ingest (`Authorization: Bearer …`) |
| `ADMIN_PASSWORD` | Desk login (already set) |

Create the database in **Dublin (`dub1`)** so it sits with the Vercel functions (`regions: ["dub1"]` in `vercel.json`):

```bash
vercel integration add tursocloud/database --name drv247-editorial --plan starter -m region=dub1
```

That command needs a one-time marketplace terms accept:

https://vercel.com/drv-247/~/integrations/accept-terms/tursocloud?source=cli

Then desk **Ingest now** (or wait for Monday 06:00 UTC cron) to fill stories. Homepage no longer ingests on load.

## What you get

- **Home / For You** — curated mix by source quality and recency, plus a labeled test personalization filter
- **Category** — Cars, Culture, Driving, Motorsport, Events (old Racing/Classic/Modified/Concourse URLs redirect)
- **Story** — hero, source tag, title, feed teaser, short extract from the original, **Read on [outlet]**
- **Admin** (`/admin/engine`) — ingest now, source health
- **JSON** — `GET /api/editorial`, `GET /api/editorial/status`
- **Weekly ingest** — Vercel cron `0 6 * * 1` (Monday 06:00 UTC) → `/api/cron/ingest`

## Ingest

Desk **Ingest now** runs the enabled culture pipeline (19 titles). Non-English items are skipped; mixed-language titles such as ramp stay enabled. The leftover v1 RSS job is only if you POST `{ "pipeline": "v1" }`.

Weekly cron updates the same Turso database. Cold homepage loads **read** that database; they do not scrape feeds.

On **For You**, tap **Set test** to pick a catalog make/model, interests, and location. That selection is stored in the URL and in `localStorage` (`drv247-for-you-test`). For You then **hides** stories that miss any set dimension (make, 911-family model, interest, location). Unset fields do not constrain. **Clear test** returns the curated quality+recency mix. Extraction is rule-based from title, teaser, and the stored first-paragraph extract: 964/993/996/GT3 count as 911, 355 GTB as Ferrari F355. This is a placeholder until the real DRV247 personalization string exists.

Story pages show a short **extract** from the original, taken at ingest: fetch the URL, persist standfirst / meta description / first substantial paragraph only, then discard the HTML. If the fetch 403s/fails, or that extract is empty or just repeats the RSS teaser, the block is hidden. No LLM key. Desk ingest-now and weekly cron backfill every story still missing an extract.
