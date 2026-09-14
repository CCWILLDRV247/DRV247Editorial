# DRV247 Editorial

Drive 24/7 public desk: browse automotive stories by category, open a teaser detail page, and run a password-gated ingest from RSS (plus YouTube / NewsAPI with local mocks).

We store a headline, a short feed excerpt, a remote image URL, and the outbound link. We do not republish full articles.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

Default desk password (when `ADMIN_PASSWORD` is unset): `desk247`.

Optional keys in `.env`:

- `YOUTUBE_API_KEY` — live YouTube channel ingest
- `NEWSAPI_KEY` — live NewsAPI ingest

Without those keys the YouTube and NewsAPI sources still ingest via built-in mock items so the app runs cold.

## What you get

- **Home** — latest stories across Racing, Classic, Modified, Concourse, Culture
- **Category** — Figma-matched magazine list (hero, stacked cards, our picks)
- **Story** — hero, summary, **Read on [outlet]** outbound link
- **Admin** (`/admin`) — add/edit/disable sources, ingest now, hide/recategorize, last-fetch errors
- **JSON** — `GET /api/stories`, `GET /api/stories/:id`, `GET /api/categories` for a later iOS/Android client
- Scheduled pull every 15 minutes (`INGEST_INTERVAL_MS`) plus `GET|POST /api/cron/ingest`

SQLite lives in `data/drv247.sqlite` (gitignored). Schema is Drizzle so Postgres can swap in later.

## Preview on Vercel

The GitHub default branch `cursor/editorial-v1-c83d` is what production should track.

**SQLite does not persist on Vercel.** Each serverless instance uses an ephemeral file in `/tmp`. On a cold start the app seeds sources and ingests RSS (YouTube/NewsAPI stay mocked without keys) so the magazine is not blank. Edits in `/admin` (hide, recategorize, extra sources) can vanish when the instance recycles. A later swap to Turso or Postgres is the durable fix.

Desk password for this preview: `desk247` (`ADMIN_PASSWORD`).
