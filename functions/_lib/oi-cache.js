// CoinGyaan · Open Interest cache + refresh. Aggregates current OI (USD) across
// Bybit, OKX and Hyperliquid. The 24h change comes from Bybit OI history first,
// then OKX as a fallback. Reuses the OUTLOOK_KV binding.

import { computeOpenInterest } from "./oi-engine.js";
import { REFRESH } from "./oi-config.js";
import { putIfChanged, staleEnough } from "./kv-write.js";

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 4500);
  try {
    const res = await fetch(url, { method: opts.method || "GET", headers: { ...UA, ...(opts.body ? { "Content-Type": "application/json" } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ---- current OI in USD, per venue ----
async function bybitOI(symbol) {
  const d = await getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
  const row = d?.result?.list?.[0];
  if (row?.openInterestValue) return { name: "Bybit", oiUsd: parseFloat(row.openInterestValue) };
  if (row?.openInterest && row?.lastPrice) return { name: "Bybit", oiUsd: parseFloat(row.openInterest) * parseFloat(row.lastPrice) };
  return null;
}
async function okxOI(inst) {
  const oi = await getJson(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${inst}`);
  const row = oi?.data?.[0];
  if (!row) return null;
  let usd = row.oiUsd != null ? parseFloat(row.oiUsd) : null;
  if (usd == null && row.oiCcy != null) {
    const t = await getJson(`https://www.okx.com/api/v5/market/ticker?instId=${inst}`);
    const last = t?.data?.[0]?.last;
    if (last) usd = parseFloat(row.oiCcy) * parseFloat(last);
  }
  return usd != null && usd > 0 ? { name: "OKX", oiUsd: usd } : null;
}
async function hyperliquidOI(coin) {
  const d = await getJson("https://api.hyperliquid.xyz/info", { method: "POST", body: { type: "metaAndAssetCtxs" } });
  if (!Array.isArray(d) || d.length < 2) return null;
  const uni = d[0]?.universe || [], ctx = d[1] || [];
  const i = uni.findIndex((u) => u.name === coin);
  if (i < 0 || !ctx[i]) return null;
  const mark = parseFloat(ctx[i].markPx), oi = parseFloat(ctx[i].openInterest);
  return isFinite(mark) && isFinite(oi) ? { name: "Hyperliquid", oiUsd: mark * oi } : null;
}

// ---- 24h change + bars from Bybit OI history, OKX fallback ----
async function bybitHistory(symbol, interval, limit) {
  const d = await getJson(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=${interval}&limit=${limit}`);
  const list = d?.result?.list;
  if (!Array.isArray(list) || list.length < 2) return null;
  const asc = list.slice().sort((a, b) => parseInt(a.timestamp, 10) - parseInt(b.timestamp, 10));
  const series = asc.map((r) => parseFloat(r.openInterest)).filter(Number.isFinite);
  if (series.length < 2) return null;
  const first = series[0], last = series[series.length - 1];
  return { changePct: first > 0 ? ((last - first) / first) * 100 : null, series };
}
async function okxChange(ccy) {
  const d = await getJson(`https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume?ccy=${ccy}&period=1H`);
  const rows = d?.data;
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const asc = rows.slice().sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
  const series = asc.map((r) => parseFloat(r[1])).filter(Number.isFinite);
  const win = series.slice(-25);
  if (win.length < 2) return null;
  const first = win[0], last = win[win.length - 1];
  return { changePct: first > 0 ? ((last - first) / first) * 100 : null, series: win };
}

export async function refreshOpenInterest(env) {
  if (!(await staleEnough(env, REFRESH.kvKey, REFRESH.refetchSeconds))) return { ok: true, skipped: true };
  const [bb, ok, hl, hist] = await Promise.all([
    bybitOI(REFRESH.symbol), okxOI(REFRESH.okxInst), hyperliquidOI(REFRESH.hlCoin),
    bybitHistory(REFRESH.symbol, REFRESH.historyInterval, REFRESH.historyLimit),
  ]);
  const venues = [bb, ok, hl].filter(Boolean);
  if (!venues.length) return { ok: false, reason: "no open interest data" };

  let change = hist?.changePct ?? null;
  let series = hist?.series ?? null;
  if (change == null) {
    const okc = await okxChange("BTC");
    if (okc) { change = okc.changePct; series = series || okc.series; }
  }

  const out = computeOpenInterest({ venues, change24hPct: change, history: series });
  if (out.status !== "ok") return { ok: false, reason: out.error || "compute failed" };
  await putIfChanged(env, REFRESH.kvKey, out);
  return { ok: true, oi: out };
}

export async function readOpenInterest(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.oi, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-oi-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshOpenInterest(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
