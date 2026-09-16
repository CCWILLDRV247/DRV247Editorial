# DRV247 editorial aggregation

CSV is the source of truth: [`config/drv247_uk_eu_automotive_media_sources.csv`](../config/drv247_uk_eu_automotive_media_sources.csv) (JSON sibling beside it).

## Catalogue counts (51 titles)

| | Count |
| --- | ---: |
| Publications | 51 |
| Wave 1 still live | **10** |
| Wave 2 enabled this branch | **11** (10 from the sheet + Turnpike) |
| Remaining dark | 30 |

Do not assume an unverified RSS URL is valid. The pipeline always validates a genuine RSS/Atom document before accepting it.

Autoitaliana (`auto_011`) is on the sheet but its hostname does not resolve, so it stayed dark. The Automobile took that high-priority slot.

## Wave 1 (still live)

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

## Wave 2 (enabled now)

| ID | Title | Config method |
| --- | --- | --- |
| auto_004 | The Intercooler | rss (`/feed`) |
| auto_009 | Waft | rss (`/feed`) |
| auto_010 | Curves | scrape / sitemap |
| auto_012 | AUTOMOBILSPORT | scrape |
| auto_013 | EuroStance | scrape / sitemap |
| auto_017 | Dyler | scrape / sitemap (listed blog RSS is stale) |
| auto_020 | Classic & Sports Car | scrape |
| auto_047 | The Automobile | rss (`/feed`) |
| auto_048 | Flat 6 Magazine | rss (`/feed`) |
| auto_049 | 9WERKS | rss (`/feed`) |
| auto_051 | Turnpike | rss (`https://turnpike.global/feed`) |

## Pipeline

Per source, isolated:

1. RSS/Atom URL if present — must parse as RSS 2.0 / 1.0 / Atom.
2. Else sitemap.xml / sitemap_index / news sitemaps, then article-page metadata.
3. Else homepage scrape: `robots.txt`, polite delay, article URLs only, Open Graph / canonical / excerpt. **No full body stored.**

At ingest, fetch the original URL and persist a short extract (standfirst / meta description / first substantial paragraph). Discard the HTML.

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

Public magazine: `/` uses the existing category layout (hero, cards, Our picks, interstitial). `/story/[id]` is the article teaser (hero image, title, publication, excerpt, extract, outbound Read on). `/category/racing|classic|modified|concourse|culture` filters the same ingest. `/editorial` redirects home.

`/admin/engine` ingest runs the enabled culture pipeline. The leftover v1 RSS job is only if you POST `{ "pipeline": "v1" }`.

Always attribute the publisher and link out. DRV247 does not claim authorship.
