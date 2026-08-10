// CoinGyaan · provider integrations (all free / public, no API keys)
// Each fetcher is defensive: on any failure it resolves to null so the engine
// can degrade gracefully. assembleMarket() runs them in parallel with fallbacks.

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, { method = "GET", body = null, timeout = 4500 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      headers: { ...UA, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Binance ----------
const FAPI = "https://fapi.binance.com";
const SAPI = "https://api.binance.com";

// Candles are the one hard dependency. Binance blocks many cloud IPs (451 at the
// edge), so we fall back to Bybit then OKX, which are not geo-blocked. Each
// source returns OHLCV; Bybit and OKX come newest-first and are reversed.
const BYBIT_IV = { "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
const OKX_IV = { "15m": "15m", "1h": "1H", "4h": "4H", "1d": "1D" };

async function getKlines(symbol, interval, limit) {
  // 1) Binance USD-M futures, then spot
  let rows = await getJson(`${FAPI}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if (!Array.isArray(rows)) rows = await getJson(`${SAPI}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if (Array.isArray(rows) && rows.length) {
    return { closes: rows.map((r) => parseFloat(r[4])), volumes: rows.map((r) => parseFloat(r[5])), src: "binance" };
  }
  // 2) Bybit linear perp (newest-first -> reverse)
  const bIv = BYBIT_IV[interval] || "60";
  const bb = await getJson(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bIv}&limit=${Math.min(limit, 1000)}`);
  const bl = bb?.result?.list;
  if (Array.isArray(bl) && bl.length) {
    const asc = bl.slice().reverse();
    return { closes: asc.map((r) => parseFloat(r[4])), volumes: asc.map((r) => parseFloat(r[5])), src: "bybit" };
  }
  // 3) OKX spot (newest-first -> reverse)
  const oIv = OKX_IV[interval] || "1H";
  const inst = symbol.replace("USDT", "-USDT");
  const ok = await getJson(`https://www.okx.com/api/v5/market/candles?instId=${inst}&bar=${oIv}&limit=${Math.min(limit, 300)}`);
  const ol = ok?.data;
  if (Array.isArray(ol) && ol.length) {
    const asc = ol.slice().reverse();
    return { closes: asc.map((r) => parseFloat(r[4])), volumes: asc.map((r) => parseFloat(r[5])), src: "okx" };
  }
  return null;
}

// Fetch just the close series for an arbitrary interval. Reuses the same
// Binance -> Bybit -> OKX fallback chain as the 24h engine. Returns null on
// total failure so callers can mark a timeframe unavailable rather than fake it.
export async function getIntervalCloses(symbol, interval, limit) {
  const k = await getKlines(symbol, interval, limit);
  return k && Array.isArray(k.closes) && k.closes.length ? k.closes : null;
}

async function okxTicker(symbol) {
  const inst = symbol.replace("USDT", "-USDT");
  const d = await getJson(`https://www.okx.com/api/v5/market/ticker?instId=${inst}`);
  const row = d?.data?.[0];
  if (!row || !row.last) return null;
  const last = parseFloat(row.last), open = parseFloat(row.open24h);
  return { price: last, changePct: open ? ((last - open) / open) * 100 : 0 };
}

async function binance24h(symbol) {
  let d = await getJson(`${FAPI}/fapi/v1/ticker/24hr?symbol=${symbol}`);
  if (!d || !d.lastPrice) d = await getJson(`${SAPI}/api/v3/ticker/24hr?symbol=${symbol}`);
  if (!d || !d.lastPrice) return null;
  return { price: parseFloat(d.lastPrice), changePct: parseFloat(d.priceChangePercent) };
}

async function binanceFunding(symbol) {
  const d = await getJson(`${FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`);
  if (!d || d.lastFundingRate == null) return null;
  return parseFloat(d.lastFundingRate); // 8h
}

async function binanceOI(symbol) {
  // openInterestHist gives USD value + a series for 24h change
  const hist = await getJson(`${FAPI}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=25`);
  if (Array.isArray(hist) && hist.length >= 2) {
    const first = parseFloat(hist[0].sumOpenInterestValue);
    const last = parseFloat(hist[hist.length - 1].sumOpenInterestValue);
    if (first > 0) return { oiUsd: last, changePct: ((last - first) / first) * 100 };
  }
  const cur = await getJson(`${FAPI}/fapi/v1/openInterest?symbol=${symbol}`);
  if (cur && cur.openInterest) return { oiUsd: null, changePct: null, oiCoins: parseFloat(cur.openInterest) };
  return null;
}

// ---------- Bybit v5 ----------
async function bybitTicker(symbol) {
  const d = await getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
  const row = d?.result?.list?.[0];
  if (!row) return null;
  return {
    funding: row.fundingRate != null ? parseFloat(row.fundingRate) : null, // 8h
    oiUsd: row.openInterestValue != null ? parseFloat(row.openInterestValue) : null,
    price: row.lastPrice != null ? parseFloat(row.lastPrice) : null,
  };
}

// ---------- Hyperliquid ----------
async function hyperliquid(coin) {
  const d = await getJson("https://api.hyperliquid.xyz/info", { method: "POST", body: { type: "metaAndAssetCtxs" } });
  if (!Array.isArray(d) || d.length < 2) return null;
  const universe = d[0]?.universe || [];
  const ctxs = d[1] || [];
  const i = universe.findIndex((u) => u.name === coin);
  if (i < 0 || !ctxs[i]) return null;
  const c = ctxs[i];
  const mark = parseFloat(c.markPx);
  const oiCoins = parseFloat(c.openInterest);
  return {
    fundingHourly: c.funding != null ? parseFloat(c.funding) : null, // 1h
    oiUsd: isFinite(mark) && isFinite(oiCoins) ? mark * oiCoins : null,
    price: isFinite(mark) ? mark : null,
  };
}

// ---------- CoinGecko ----------
async function coingeckoDominance() {
  const d = await getJson("https://api.coingecko.com/api/v3/global");
  const btc = d?.data?.market_cap_percentage?.btc;
  return btc != null ? btc : null;
}

async function coingeckoPrice(coinId = "bitcoin") {
  const d = await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
  const row = d?.[coinId];
  if (!row?.usd) return null;
  return { price: row.usd, changePct: row.usd_24h_change ?? 0 };
}

// ---------- Alternative.me ----------
async function fearGreed() {
  const d = await getJson("https://api.alternative.me/fng/?limit=1");
  const v = d?.data?.[0]?.value;
  return v != null ? parseInt(v, 10) : null;
}

// ---------- orchestration ----------
export async function assembleMarket(cfg) {
  const { symbol, hlCoin, klineInterval, klineLimit, coinId } = cfg;

  const [klines, tick, bnFund, bnOI, bybit, hl, dom, fg, cgPrice, okx] = await Promise.all([
    getKlines(symbol, klineInterval, klineLimit),
    binance24h(symbol),
    binanceFunding(symbol),
    binanceOI(symbol),
    bybitTicker(symbol),
    hyperliquid(hlCoin),
    coingeckoDominance(),
    fearGreed(),
    coingeckoPrice(coinId),
    okxTicker(symbol),
  ]);

  const status = {
    klines: !!klines, klineSource: klines?.src || null,
    ticker: !!(tick || cgPrice || okx || bybit),
    binanceFunding: bnFund != null, bybit: !!bybit, hyperliquid: !!hl, okx: !!okx,
    openInterest: !!(bnOI && bnOI.changePct != null),
    dominance: dom != null, fearGreed: fg != null,
  };

  // price + 24h change: Binance ticker, else Bybit, OKX, CoinGecko, else last kline
  let price = tick?.price ?? bybit?.price ?? okx?.price ?? cgPrice?.price ?? (klines ? klines.closes[klines.closes.length - 1] : null);
  let changePct = tick?.changePct ?? okx?.changePct ?? cgPrice?.changePct ?? 0;

  // funding: average available 8h-equivalent rates (HL hourly -> *8)
  const fundings = [];
  if (bnFund != null) fundings.push(bnFund);
  if (bybit?.funding != null) fundings.push(bybit.funding);
  if (hl?.fundingHourly != null) fundings.push(hl.fundingHourly * 8);
  const funding = fundings.length ? fundings.reduce((a, b) => a + b, 0) / fundings.length : null;

  // open interest 24h change: Binance hist preferred; oiUsd fallback across venues
  const oiChangePct = bnOI?.changePct ?? null;
  const oiUsd = bnOI?.oiUsd ?? bybit?.oiUsd ?? hl?.oiUsd ?? null;

  const market = {
    price,
    priceChangePct24h: changePct,
    closes1h: klines?.closes ?? [],
    volumes1h: klines?.volumes ?? [],
    funding,
    oiChangePct,
    oiUsd,
    dominance: dom,
    fearGreed: fg,
    etfNet: null, // v1: no free daily ETF feed wired yet
  };

  return { market, status };
}
