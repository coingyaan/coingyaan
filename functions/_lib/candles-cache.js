// CoinGyaan · BTC candle series (price action layer) for the Outlook chart.
// Additive and read-only for intelligence: exposes genuine dated OHLC for
// 15m / 1h / 4h / 1d from the SAME primary chain the intelligence uses
// (Binance futures -> Bybit -> OKX). Never touches any signal calculation.
// Source-independent: candles nest under tf[interval] with a `source`, so a
// verified Hyperliquid BTC perpetual series can be added later as a secondary
// reference without redesign. HIP-4 outcome probabilities are never a price series.
// Scaling: one combined KV key (one write per refresh), refreshed by cron; the
// read endpoint sets an edge Cache-Control so upstream is hit on refresh, not per user.

const INTERVALS = {
  "15m": { binance: "15m", bybit: "15", okx: "15m", limit: 96 },
  "1h": { binance: "1h", bybit: "60", okx: "1H", limit: 120 },
  "4h": { binance: "4h", bybit: "240", okx: "4H", limit: 120 },
  "1d": { binance: "1d", bybit: "D", okx: "1D", limit: 120 },
};
const SYM_BINANCE = "BTCUSDT", SYM_BYBIT = "BTCUSDT", INST_OKX = "BTC-USDT-SWAP";
const KV_KEY = "candles:btc:v1", LOCK_KEY = "candles:btc:lock";
const TTL = 120, STALE = 900, LOCK = 60, REFETCH = 120;
const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, timeout) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout || 6000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// row = [openMs, open, high, low, close, volume] ascending; null if all venues fail
async function fetchOHLC(tf) {
  const iv = INTERVALS[tf];
  const b = await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYM_BINANCE}&interval=${iv.binance}&limit=${iv.limit}`);
  if (Array.isArray(b) && b.length) return { src: "binance", rows: b.map((r) => [+r[0], +r[1], +r[2], +r[3], +r[4], +r[5]]) };
  const by = await getJson(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${SYM_BYBIT}&interval=${iv.bybit}&limit=${iv.limit}`);
  const bl = by && by.result && by.result.list;
  if (Array.isArray(bl) && bl.length) return { src: "bybit", rows: bl.map((r) => [+r[0], +r[1], +r[2], +r[3], +r[4], +r[5]]).sort((a, z) => a[0] - z[0]) };
  const ok = await getJson(`https://www.okx.com/api/v5/market/candles?instId=${INST_OKX}&bar=${iv.okx}&limit=${iv.limit}`);
  const okl = ok && ok.data;
  if (Array.isArray(okl) && okl.length) return { src: "okx", rows: okl.map((r) => [+r[0], +r[1], +r[2], +r[3], +r[4], +r[5]]).sort((a, z) => a[0] - z[0]) };
  return null;
}

async function readCached(env) {
  try { const s = await env.OUTLOOK_KV.get(KV_KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return null;
}

export async function refreshCandles(env) {
  const cached = await readCached(env);
  if (cached && cached.asOf && (Date.now() - Date.parse(cached.asOf)) / 1000 < REFETCH) return { ok: true, skipped: true, candles: cached };
  const tfs = Object.keys(INTERVALS);
  const results = await Promise.all(tfs.map(fetchOHLC));
  const tf = {};
  let venue = null;
  tfs.forEach((k, i) => { const r = results[i]; if (r && r.rows.length) { tf[k] = { interval: k, source: "coingyaan-primary", venue: r.src, candles: r.rows }; venue = venue || r.src; } });
  if (!Object.keys(tf).length) return { ok: false, reason: "no candle data" };
  const payload = { asOf: new Date().toISOString(), source: "coingyaan-primary", venue, symbol: "BTCUSD", tf };
  try { await env.OUTLOOK_KV.put(KV_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  return { ok: true, candles: payload };
}

export async function readCandles(env, ctx) {
  const cached = await readCached(env);
  const age = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && age <= TTL) return meta(cached, "ok", age);
  if (cached && age <= STALE) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", age); }
  const r = await guarded(env);
  if (r.ok) return meta(r.candles, "ok", r.skipped ? age : 0);
  if (cached) return meta(cached, "stale", age);
  return { asOf: new Date().toISOString(), status: "error", available: false, error: "no data available" };
}

async function guarded(env) {
  try { if (await env.OUTLOOK_KV.get(LOCK_KEY)) return { ok: false, reason: "locked" }; await env.OUTLOOK_KV.put(LOCK_KEY, "1", { expirationTtl: LOCK }); } catch { /* proceed */ }
  try { return await refreshCandles(env); }
  finally { try { await env.OUTLOOK_KV.delete(LOCK_KEY); } catch { /* ignore */ } }
}

function meta(o, status, age) { return { ...o, status, ageSeconds: Math.max(0, Math.round(age)) }; }
