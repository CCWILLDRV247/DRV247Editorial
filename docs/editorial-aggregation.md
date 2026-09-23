# DRV247 editorial aggregation

CSV is the source of truth: [`config/drv247_uk_eu_automotive_media_sources.csv`](../config/drv247_uk_eu_automotive_media_sources.csv) (JSON sibling beside it).

## Catalogue counts (79 titles)

| | Count |
| --- | ---: |
| Publications | 79 |
| Wave 1 still live | **10** |
| Wave 2 live | **7** (11 listed; Flat 6, AUTOMOBILSPORT, EuroStance, 9WERKS stay dark) |
| Wave 3 live | **10** (Car & Classic enabled, Cloudflare 403) |
| Wave 4 live | **10** (Just Auto enabled, Cloudflare 403) |
| Remaining original catalogue | **9** |
| Underground Priority | **28** |
| Dark list | 5 (Autoitaliana, Flat 6, AUTOMOBILSPORT, EuroStance, 9WERKS) |

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

## Wave 2 (still live, four dark)

The four dark wave-2 rows stay in the wave list so merch, language, and paywall policy remain explicit.

| ID | Title | Config method |
| --- | --- | --- |
| auto_004 | The Intercooler | rss (`/feed`) |
| auto_009 | Waft | rss (`/feed`) |
| auto_010 | Curves | scrape / sitemap |
| auto_012 | AUTOMOBILSPORT | scrape |
| auto_013 | EuroStance | **dark** — Shopify shop, no editorial RSS |
| auto_017 | Dyler | scrape / sitemap (listed blog RSS is stale) |
| auto_020 | Classic & Sports Car | scrape |
| auto_047 | The Automobile | rss (`/feed`) |
| auto_048 | Flat 6 Magazine | rss (`/feed`) |
| auto_049 | 9WERKS | **dark** — paywall, teasers are not usable |
| auto_051 | Turnpike | rss (`https://turnpike.global/feed`) |

## Wave 3 (still live)

Autoitaliana (`auto_011`) still has no DNS, so it stays dark. EuroStance, Flat 6, AUTOMOBILSPORT, and 9WERKS stay dark. Car & Classic is enabled but Cloudflare 403s; it is not one of the wave-4 ten.

| ID | Title | Config method |
| --- | --- | --- |
| auto_018 | Car & Classic | scrape |
| auto_019 | Classics World | rss (`/feed`) |
| auto_021 | Practical Classics | rss (Bauer aggregator) |
| auto_022 | Fast Car | rss (`/feed`) |
| auto_023 | PistonHeads | rss (`/news/rss`) |
| auto_024 | evo | rss then fallback (`/rss`) |
| auto_025 | CAR Magazine | rss (`/rss/`) |
| auto_026 | Autocar | rss (`/rss`) |
| auto_027 | Auto Express | rss (`/rss`) |
| auto_028 | Top Gear | scrape |

## Wave 4 (still live)

Sequential remaining CSV titles after wave 3. Car & Classic (wave 3) and Just Auto stay enabled despite Cloudflare 403.

| ID | Title | Config method |
| --- | --- | --- |
| auto_029 | Motor Sport Magazine | scrape |
| auto_030 | Autosport | scrape |
| auto_031 | RaceFans | rss (`/feed/`) |
| auto_032 | The Checkered Flag | rss (`/feed`) |
| auto_033 | Race Tech Magazine | rss (`/feed`) |
| auto_034 | Automotive World | rss (`/feed/`) |
| auto_035 | Just Auto | rss (`/feed/`) |
| auto_036 | Car Design News | scrape |
| auto_037 | Car Body Design | rss (`/feed/`) |
| auto_038 | CE Auto Classic | rss (`/feed/`) |

## Remaining catalogue (enabled now)

The last CSV rows that were not already live. Dark list stays off. Rampstyle shares the ramp.space host with `auto_008`. 911 & Porsche World is a Kelsey shop URL; merch path skip still applies.

| ID | Title | Config method |
| --- | --- | --- |
| auto_039 | Motor1 Germany | rss (`/rss/articles/all`) |
| auto_040 | AUTO ZEITUNG | scrape |
| auto_041 | AUTO BILD | scrape |
| auto_042 | Automobilwoche | scrape |
| auto_043 | Rampstyle / ramp Auto.Kultur | scrape (same host as ramp) |
| auto_044 | The Car Expert | rss (`/feed/`) |
| auto_045 | Carwow | scrape |
| auto_046 | Sunday Times Driving | scrape |
| auto_050 | 911 & Porsche World | scrape |

## Underground Priority (enabled now)

Twenty-eight English titles with verified public feeds from the underground research. Research further / Manual only / Reference only stay out. Fast Car is already live (`auto_022`); Performance VW is a different title. Auto Italia (`auto_095`) is not Autoitaliana. Classic Cars (`auto_103`) is not Classic & Sports Car. Dark list stays off.

| ID | Title | Config method |
| --- | --- | --- |
| auto_054 | Petrolicious | rss (`/blogs/articles.atom`) |
| auto_057 | Japanese Nostalgic Car | rss (`/feed`) |
| auto_059 | Performance VW | rss (`/feed`) |
| auto_061 | Fuel Curve | rss (`/feed`) |
| auto_063 | The Rodder's Journal | rss (`/feed`) |
| auto_064 | Hop Up Magazine | rss (`/blog?format=rss`) |
| auto_066 | Street Machine | rss (`/feed`) |
| auto_070 | Silodrome | rss (`/feed`) |
| auto_071 | SpeedHolics | rss (`/blog-feed.xml`) |
| auto_076 | NIWWRD | rss (`/blog-feed.xml`) |
| auto_078 | Gridline Press | rss (`/rss/`) |
| auto_079 | Kaido Racer | rss (`/feed`) |
| auto_081 | MotoIQ | rss (`/feed`) |
| auto_082 | DSPORT | rss (`/feed`) |
| auto_084 | Hagerty Media | rss (`/media/feed/`) |
| auto_085 | Hot Rod | rss (`/rss/all.xml`) |
| auto_086 | EngineLabs | rss (`/feed`) |
| auto_089 | DirtFish | rss (`/feed`) |
| auto_090 | DailySportsCar | rss (`/feed`) |
| auto_095 | Auto Italia | rss (`/feed`) |
| auto_103 | Classic Cars | rss (Bauer aggregator) |
| auto_111 | Engine Swap Depot | rss (`?feed=rss2`) |
| auto_118 | Retro Ford | rss (`/feed`) |
| auto_120 | RallySport Magazine | rss (`/feed`) |
| auto_127 | In the Garage Media | rss (`/feed`) |
| auto_128 | Time Attack UK | rss (`/feed`) |
| auto_130 | Motorsport Retro | rss (`/feed`) |
| auto_131 | Racecar Engineering | rss (`/feed`) |

## Pipeline

Per source, isolated:

1. RSS/Atom URL if present — must parse as RSS 2.0 / 1.0 / Atom.
2. Else sitemap.xml / sitemap_index / news sitemaps, then article-page metadata.
3. Else homepage scrape: `robots.txt`, polite delay, article URLs only, Open Graph / canonical / excerpt. **No full body stored.**

Shop feeds can be disabled (or pointed at editorial RSS) in `config/merch.ts`. Ingest also skips URLs whose path has a shop segment (`/shop`, `/product`, `/collection`, `/cart`, `/merch`, and close variants). Non-editorial URL skip lives in `config/non-editorial.ts`: auction/subscribe/buy/sell/gassing path segments, empty or `/undefined` URLs, the `/news` index (not `/news/slug`), and off-site magazine-shop hosts such as `themagazineshop.com`. Not a title denylist. PistonHeads and Classic & Sports Car stay enabled. Weekly cron and desk ingest-now both use this.

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
