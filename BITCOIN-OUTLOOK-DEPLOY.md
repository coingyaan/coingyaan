# Bitcoin Outlook v1 — deploy and Cloudflare setup

This is the complete, self contained Bitcoin Outlook slice. Free data only, zero
recurring cost. It works the moment you deploy (the endpoint self heals on
traffic) and gets better once the 5 minute cron is added.

## What is in this delivery

```
functions/
  _lib/
    engine-config.js     all tunable weights and thresholds (edit this to tune)
    indicators.js        RSI, MACD, EMA, volatility, volume trend
    engine.js            the CoinGyaan interpretation layer (scores -> outlook)
    providers.js         Binance, Bybit, Hyperliquid, CoinGecko, Alternative.me
    cache.js             KV read (stale-while-revalidate) + refresh + lock
  api/
    bitcoin-outlook.js   GET /api/bitcoin-outlook   (public, cached)
    refresh.js           /api/refresh?key=...       (protected, cron calls this)
cron-worker/
  wrangler.toml          the 5 minute Cron Trigger
  src/index.js           tiny worker that pings /api/refresh
assets/js/
  outlook-home.js        hydrates the homepage hero + mini card
  outlook-page.js        hydrates the full /bitcoin-outlook/ page
index.html               homepage cards wired to the API
bitcoin-outlook/index.html   full page, now indexable, wired to the API
assets/css/coingyaan.css     appended styles (st-red, full page)
```

Nothing else in the repo is touched. `sitemap.xml`, other pages, tools and
guides are unchanged.

## Architecture in one line

Browser -> `coingyaan.com/api/bitcoin-outlook` (Pages Function) -> reads KV.
A cron worker pings `/api/refresh` every 5 min -> the engine fetches all
providers once, computes the outlook, writes it to KV. The browser never touches
a third party and no API keys live in the frontend.

## Step 1 — create the KV namespace

Cloudflare dashboard -> Workers & Pages -> KV -> Create namespace.
Name it `coingyaan_outlook`. Copy its ID.

## Step 2 — bind KV and the secret to the Pages project

Pages project (coingyaan) -> Settings -> Functions:

- KV namespace bindings -> Add binding
  - Variable name: `OUTLOOK_KV`
  - KV namespace: `coingyaan_outlook`

Pages project -> Settings -> Environment variables -> Production:

- Add variable `REFRESH_KEY`, value = a long random string. Mark it as a
  secret (encrypted). Keep a copy, the cron worker needs the same value.

## Step 3 — deploy the Pages Functions

The `functions/` folder deploys automatically with your normal git push, the
same flow you used for Version 2. Merge this delivery into your repo, commit,
push. Cloudflare Pages builds and the endpoints go live at:

- `https://coingyaan.com/api/bitcoin-outlook`
- `https://coingyaan.com/api/refresh`

At this point the site already works. The first visit to the homepage or
`/bitcoin-outlook/` triggers a synchronous refresh (a second or two once), then
everything serves from KV and refreshes in the background on traffic.

## Step 4 — deploy the cron worker (keeps data warm without traffic)

This is the only piece that uses wrangler. From the `cron-worker/` folder:

```
npm install -g wrangler        # if you do not have it
cd cron-worker
wrangler login
wrangler secret put REFRESH_KEY   # paste the SAME value from Step 2
wrangler deploy
```

`wrangler.toml` already sets the schedule to `*/5 * * * *` (every 5 minutes) and
`REFRESH_URL` to `https://coingyaan.com/api/refresh`. Done. The cache now
refreshes every 5 minutes even with zero visitors.

## Step 5 — verify

```
# force a refresh (use your real key)
curl -X POST "https://coingyaan.com/api/refresh?key=YOUR_KEY"
# -> {"ok":true, ...}

# read the outlook
curl "https://coingyaan.com/api/bitcoin-outlook"
# -> {"asOf":"...","status":"ok","data":{...},"signals":{...},"weights":{...}}
```

Then open:
- `https://coingyaan.com/` — hero card and the Bitcoin Outlook mini card show
  live numbers and "Live · updated Xm ago".
- `https://coingyaan.com/bitcoin-outlook/` — full verdict, signals table,
  drivers and live weights.

To test the cron worker by hand, open its `/run` route once deployed:
`https://coingyaan-outlook-cron.<your-subdomain>.workers.dev/run`.

## Tuning without touching engine logic

Everything you would experiment with is in `functions/_lib/engine-config.js`:
signal weights (Trend, Momentum, Funding, OI, ETF, Sentiment), the RSI and MACD
scales, the volatility reference, probability spread, confidence and risk
weights, and the market condition thresholds. Change a number, push, done. The
engine reads these and never hardcodes a weight.

## How it degrades gracefully

Every signal has a present or absent flag. If a provider is down or an endpoint
is empty, that signal is dropped and its weight is shared across the signals that
remain, so the weights always sum to 1 and the outlook stays honest. ETF is
absent in v1 by design (no free daily feed wired yet); its weight already
redistributes. When you wire ETF later, the frontend and the API contract do not
change.

## Notes

- All providers are free and keyless. Binance geo blocks some regions, but the
  Pages Function runs on Cloudflare's edge, and Bybit, Hyperliquid and CoinGecko
  are fallbacks for price and funding.
- The API contract is stable. You can replace any provider or swap the engine
  internals later and the homepage and the full page keep working unchanged.
- Optional, when you are happy with the live page: activate the legacy redirect
  by uncommenting the `bitcoin-sentiment-today.html -> /bitcoin-outlook/` line in
  `_redirects`, and add `/bitcoin-outlook/` to `sitemap.xml`.
