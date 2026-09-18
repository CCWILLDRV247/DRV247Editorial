# DRV247 Editorial

UK/EU automotive culture desk. Seventy-four live culture titles: the original CSV minus the dark list, plus 28 underground Priority titles. Flat 6, AUTOMOBILSPORT, 9WERKS, and EuroStance stay dark — EuroStance is a shop; 9WERKS is paywalled. Autoitaliana has no DNS. Car & Classic and Just Auto stay enabled but Cloudflare 403s. Teasers and outbound links only — never full article bodies. Ingest keeps English teasers, skips non-English items, and skips shop URLs. User-facing nav is For You, Cars, Culture, Driving, Motorsport, and Events.

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
- **Category** — Cars, Culture, Driving, Motorsport, Events, with the same test filter (old Racing/Classic/Modified/Concourse URLs redirect)
- **Story** — hero, source tag, title, feed teaser, short extract from the original, **Read on [outlet]**
- **Admin** (`/admin/engine`) — ingest now, source health
- **JSON** — `GET /api/editorial`, `GET /api/editorial/status`
- **Weekly ingest** — Vercel cron `0 6 * * 1` (Monday 06:00 UTC) → `/api/cron/ingest`

## Ingest

Desk **Ingest now** runs the enabled culture pipeline (74 titles). Non-English items are skipped; shop/product/collection/cart/merch URLs are skipped; auction and subscribe paths, empty or `/undefined` URLs, and off-site magazine-shop canonicals are skipped; mixed-language titles such as ramp stay enabled. The leftover v1 RSS job is only if you POST `{ "pipeline": "v1" }`.

Weekly cron updates the same Turso database. Cold homepage loads **read** that database; they do not scrape feeds. Magazine pages cache for 60 seconds (`s-maxage=60`, stale-while-revalidate 300).

On **For You** and every primary (Cars, Culture, Driving, Motorsport, Events), tap **Set test** to pick make, model, generation, variant, interests, and location. The picker lists every gazetteer marque (98 UK/EU performance and classic makes, including Honda) plus any extra values on live stories. Makes with no matching stories still appear; the filter is empty, which is correct. Off-catalog query values still parse. That selection is stored in the URL and in `localStorage` (`drv247-for-you-test`) and rides along in the nav. Those pages **hide** stories that miss any set dimension (AND across make, model, generation, variant, location; OR among selected interests). Unset fields do not constrain. Empty sections hide. **Clear test** returns the unfiltered mix for that page. Extraction is rule-based from title, teaser, and the stored first-paragraph extract: 964/993/996/GT3 count as 911, 355 GTB as Ferrari F355. Add a marque in `lib/engine/catalog.ts` to grow the list. This is a placeholder until the real DRV247 personalization string exists. No real garage.

Story pages show a short **extract** from the original, taken at ingest: fetch the URL, persist standfirst / meta description / first substantial paragraph only, then discard the HTML. If the fetch 403s/fails, or that extract is empty or just repeats the RSS teaser, the block is hidden. No LLM key. Desk ingest-now and weekly cron backfill every story still missing an extract.

Article images pick the best available source (RSS media, enclosure, Open Graph, Twitter card, then a suitable page image), skip theme chrome and tracking pixels, and validate the chosen URL without storing the file. If that URL later 404s, the card tries the next stored source and then the existing DRV247 placeholder. Broken-image icons should not appear.
