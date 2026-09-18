# DRV247 Editorial

UK/EU automotive culture desk. Seventy-four live culture titles: the original CSV minus the dark list, plus 28 underground Priority titles. Flat 6, AUTOMOBILSPORT, 9WERKS, and EuroStance stay dark — EuroStance is a shop; 9WERKS is paywalled. Autoitaliana has no DNS. Car & Classic and Just Auto stay enabled but Cloudflare 403s. Teasers and outbound links only — never full article bodies. Ingest keeps English teasers, skips non-English items, and skips shop URLs. User-facing nav is For You, Cars, Culture, Driving, Motorsport, and Events.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:43131](http://localhost:43131).

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

- **Home / For You** — vehicle-first centre: for your car (3–6), **From the DRV247 Desk** (1–3 human picks), your interests, discover, then Cars / Culture / Driving / Events. Header reads “For your Ferrari F355” when a car is set. A–D demo cars look different.
- **Category** — Cars, Culture, Driving, Motorsport, Events, with the same test picker (old Racing/Classic/Modified/Concourse URLs redirect). Category pages still AND-filter.
- **Story** — hero, source tag, title, feed teaser, short extract from the original, **Read on [outlet]**. Desk-curated stories also show their label and optional human note.
- **Admin** (`/admin/engine`) — ingest now, source health, classification, **Desk curation** (select a teaser, label, optional note, active/featured), For You ranking debug (article / score / why)
- **JSON** — `GET /api/editorial` (includes `ranking` why/score when a test profile is set), `GET /api/editorial/status`
- **Weekly ingest** — Vercel cron `0 6 * * 1` (Monday 06:00 UTC) → `/api/cron/ingest`

## Ingest

Desk **Ingest now** runs the enabled culture pipeline (74 titles). Non-English items are skipped; shop/product/collection/cart/merch URLs are skipped; auction and subscribe paths, empty or `/undefined` URLs, and off-site magazine-shop canonicals are skipped; mixed-language titles such as ramp stay enabled. The leftover v1 RSS job is only if you POST `{ "pipeline": "v1" }`.

Weekly cron updates the same Turso database. Cold homepage loads **read** that database; they do not scrape feeds. Magazine pages cache for 60 seconds (`s-maxage=60`, stale-while-revalidate 300).

On **For You**, the page is organised around the car: **For your Ferrari F355** (or the test car you pick), then **From the DRV247 Desk** (human picks, honest labels, no invented notes), then **Your interests**, then **Discover**, then the existing Cars / Culture / Driving / Events carousels. Without a car it still runs — “Tell us what you drive to make DRV247 yours.” Tap **Set test** or A–D (F355 GTB, 964 C2, Skyline, M3). Saved in the URL and in `localStorage` (`drv247-for-you-test`). Weights live in `config/ranking.json` (`deskPick` / `deskPickRelevant` are modest boosts only). Preview: `/?profile=A`.

Add a marque in `lib/engine/catalog.ts` to grow the list. This is a placeholder until the real DRV247 personalization string exists. No real garage.

Story pages show a short **extract** from the original, taken at ingest: fetch the URL, persist standfirst / meta description / first substantial paragraph only, then discard the HTML. If the fetch 403s/fails, or that extract is empty or just repeats the RSS teaser, the block is hidden. No LLM key. Desk ingest-now and weekly cron backfill every story still missing an extract.

Article images pick the best available source (RSS media, enclosure, Open Graph, Twitter card, then a suitable page image), skip theme chrome and tracking pixels, and validate the chosen URL without storing the file. If that URL later 404s, the card tries the next stored source and then the existing DRV247 placeholder. Broken-image icons should not appear.
