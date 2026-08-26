// CoinGyaan · Stablecoins cache + refresh from DefiLlama (free, no key).
// Total supply history: stablecoincharts/all. Per-coin circulating: stablecoins.
// Reuses OUTLOOK_KV.

import { computeStablecoins } from "./stablecoins-engine.js";
import { REFRESH } from "./stablecoins-config.js";
import { putIfChanged, staleEnough } from "./kv-write.js";

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, timeout = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function peggedUsd(v) {
  // DefiLlama returns either a number or an object like { peggedUSD: n }
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && Number.isFinite(v.peggedUSD)) return v.peggedUSD;
  return null;
}

// Total supply history, ascending [{ ts, totalUsd }]
async function history() {
  const rows = await getJson("https://stablecoins.llama.fi/stablecoincharts/all", 9000);
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows
    .map((r) => ({ ts: parseInt(r.date, 10), totalUsd: peggedUsd(r.totalCirculatingUSD) }))
    .filter((r) => Number.isFinite(r.totalUsd))
    .sort((a, b) => a.ts - b.ts);
}

// Per-coin circulating [{ symbol, name, circulating }]
async function assets() {
  const j = await getJson("https://stablecoins.llama.fi/stablecoins?includePrices=false", 8000);
  const list = j?.peggedAssets;
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => ({ symbol: (a.symbol || "").toUpperCase(), name: a.name || a.symbol, circulating: peggedUsd(a.circulating) }))
    .filter((a) => a.symbol && Number.isFinite(a.circulating) && a.circulating > 0);
}

export async function refreshStablecoins(env) {
  if (!(await staleEnough(env, REFRESH.kvKey, REFRESH.refetchSeconds))) return { ok: true, skipped: true };
  const [hist, ass] = await Promise.all([history(), assets()]);
  if ((!hist || !hist.length) && (!ass || !ass.length)) return { ok: false, reason: "no stablecoin data" };
  const out = computeStablecoins({ history: hist, assets: ass });
  await putIfChanged(env, REFRESH.kvKey, out);
  return { ok: true, stablecoins: out };
}

export async function readStablecoins(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.stablecoins, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-stablecoins-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshStablecoins(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
