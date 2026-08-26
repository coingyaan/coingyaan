// CoinGyaan · Funding cache + refresh. Pulls 8h funding from Bybit, Hyperliquid
// and OKX (all edge-friendly), with Binance as a best-effort extra. Reuses the
// OUTLOOK_KV binding. Same stale-while-revalidate pattern.

import { computeFunding } from "./funding-engine.js";
import { REFRESH } from "./funding-config.js";
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

async function bybit(symbol) {
  const d = await getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
  const r = d?.result?.list?.[0]?.fundingRate;
  return r != null ? { name: "Bybit", rate8h: parseFloat(r) } : null;
}
async function hyperliquid(coin) {
  const d = await getJson("https://api.hyperliquid.xyz/info", { method: "POST", body: { type: "metaAndAssetCtxs" } });
  if (!Array.isArray(d) || d.length < 2) return null;
  const uni = d[0]?.universe || [], ctx = d[1] || [];
  const i = uni.findIndex((u) => u.name === coin);
  if (i < 0 || !ctx[i] || ctx[i].funding == null) return null;
  return { name: "Hyperliquid", rate8h: parseFloat(ctx[i].funding) * 8 }; // hourly -> 8h
}
async function okx(inst) {
  const d = await getJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${inst}`);
  const r = d?.data?.[0]?.fundingRate;
  return r != null ? { name: "OKX", rate8h: parseFloat(r) } : null;
}
async function binance(symbol) {
  const d = await getJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
  return d?.lastFundingRate != null ? { name: "Binance", rate8h: parseFloat(d.lastFundingRate) } : null;
}

export async function refreshFunding(env) {
  if (!(await staleEnough(env, REFRESH.kvKey, REFRESH.refetchSeconds))) return { ok: true, skipped: true };
  const [bb, hl, ok, bn] = await Promise.all([
    bybit(REFRESH.symbol), hyperliquid(REFRESH.hlCoin), okx(REFRESH.okxInst), binance(REFRESH.symbol),
  ]);
  const venues = [bb, hl, ok, bn].filter(Boolean);
  if (!venues.length) return { ok: false, reason: "no funding data" };
  const out = computeFunding(venues);
  if (out.status !== "ok") return { ok: false, reason: out.error || "compute failed" };
  await putIfChanged(env, REFRESH.kvKey, out);
  return { ok: true, funding: out };
}

export async function readFunding(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.funding, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-funding-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshFunding(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
