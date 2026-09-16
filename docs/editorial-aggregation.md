# DRV247 editorial aggregation

Work lives on GitHub branch [`explore/ingest-personalization`](https://github.com/CCWILLDRV247/DRV247Editorial/tree/explore/ingest-personalization). The v1 default branch and production Vercel deploy are untouched.

CSV is the source of truth: [`config/drv247_uk_eu_automotive_media_sources.csv`](../config/drv247_uk_eu_automotive_media_sources.csv) (JSON sibling beside it).

## Catalogue counts (all 50 titles)

| | Count |
| --- | ---: |
| Publications | 50 |
| Country fields (distinct) | 10 |
| UK | 32 |
| Germany (incl. combined labels) | 9 |
| Italy | 3 |
| Netherlands | 2 |
| Belgium, France, Central Europe, International | 1 each |
| RSS available = yes (CSV verified) | 20 |
| RSS unverified | 2 |
| Scrape-only / no public RSS found | 28 |
| `source_type=rss` | 20 |
| `source_type=rss_then_fallback` | 2 |
| `source_type=scrape` | 28 |
| CSV `enabled=True` | 50 (we override this) |
| Wave 1 enabled in this branch | **10** |
| Remaining dark | 40 |

`rss_confidence`: verified 20, unverified 2, not_found 28.

Do not assume an unverified RSS URL is valid. The pipeline always validates a genuine RSS/Atom document before accepting it.

## Wave 1 (enabled now)

Matched from the spec’s high-priority list:

| ID | Title | Config method |
| --- | --- | --- |
| auto_001 | Bonnet | scrape |
| auto_002 | The Road Rat | scrape |
| auto_003 | Magneto | scrape |
| auto_005 | Classic Driver | scrape |
| auto_006 | Auto & Design | rss (verified) |
| auto_007 | Octane | scrape |
| auto_008 | ramp | scrape |
| auto_014 | Driven to Write | rss then fallback (unverified) |
| auto_015 | Take to the Road | rss (verified) |
| auto_016 | GTspirit | rss (verified) |

Held for a later wave (still in the CSV, `enabled=false` here): The Intercooler, EuroStance, Flat 6 Magazine, 9WERKS, AutomobilSport, and the rest of the 50.

## Pipeline

Per source, isolated:

1. RSS/Atom URL if present — must parse as RSS 2.0 / 1.0 / Atom.
2. Else sitemap.xml / sitemap_index / news sitemaps, then article-page metadata.
3. Else homepage scrape: `robots.txt`, polite delay, article URLs only, Open Graph / canonical / excerpt. **No full body stored.**

Each row records the method actually used, HTTP status, and last error. Ranking weights live in `config/ranking.json` (not hardcoded).

Demo garage users (`demo-chris` Porsche 911 964, `demo-355` Ferrari F355, `demo-m3` BMW M3 E46) stand in until the mobile app user/vehicle models exist.

## API

- `GET /api/editorial` — ranked feed (`user`, `section`, `q`, make/model/generation/category/interest)
- `GET /api/editorial/:id`
- `GET /api/editorial/vehicle/:vehicleId`
- `GET /api/editorial/user/:userId`
- `GET /api/editorial/source/:sourceId`
- `POST /api/editorial/ingest` — admin; body `{ sourceId }` or `{ sourceIds }`
- `POST /api/editorial/reprocess` — admin

Public magazine: `/` uses the v1 Figma category layout (hero, cards, Our picks, interstitial) with wave-1 articles. `/story/[id]` is the Figma article teaser (hero image, title, publication, excerpt, outbound Read on). `/category/racing|classic|modified|concourse|culture` filters the same ingest. `/editorial` redirects home.

`/admin` still exists as the v1 leftover desk. Its primary button is **Ingest 10 culture titles** (`POST /api/admin/ingest` with an empty body → culture pipeline). The old Motorsport/RACER/Jalopnik pull is a separate **v1 RSS leftover** control (`{ pipeline: "v1" }`).

Always attribute the publisher and link out. DRV247 does not claim authorship.
