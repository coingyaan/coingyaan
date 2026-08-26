// CoinGyaan · Altcoins cache + refresh. Dominance from CoinPaprika/Coinlore,
// top-coin 30d performance from CoinPaprika for the Altcoin Season Index.
// Stores previous dominance to derive a trend over time. Reuses OUTLOOK_KV.

import { computeAltcoins } from "./altcoins-engine.js";
import { PARAMS, EXCLUDE, REFRESH } from "./altcoins-config.js";
import { putIfChanged, staleEnough } from "./kv-write.js";

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, timeout = 4500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function dominance() {
  const cp = await getJson("https://api.coinpaprika.com/v1/global");
  if (cp?.bitcoin_dominance_percentage != null) return parseFloat(cp.bitcoin_dominance_percentage);
  const cl = await getJson("https://api.coinlore.net/api/global/");
  const d = Array.isArray(cl) ? cl[0]?.btc_d : null;
  return d != null ? parseFloat(d) : null;
}

// Top coins with 7d performance from Coinlore (light, edge-friendly).
// Returns { btcChange, alts:[{symbol,name,change}] }
async function performance() {
  const d = await getJson("https://api.coinlore.net/api/tickers/?start=0&limit=100", 6000);
  const rows = d?.data;
  if (!Array.isArray(rows) || !rows.length) return { btcChange: null, alts: [] };
  let btcChange = null;
  const alts = [];
  for (const r of rows) {
    const sym = (r.symbol || "").toUpperCase();
    const chg = r.percent_change_7d;
    if (sym === "BTC") { if (chg != null) btcChange = parseFloat(chg); continue; }
    if (EXCLUDE.has(sym)) continue;
    if (chg == null || chg === "") continue;
    const v = parseFloat(chg);
    if (!Number.isFinite(v)) continue;
    alts.push({ symbol: sym, name: r.name || sym, change: v });
    if (alts.length >= PARAMS.topN) break;
  }
  return { btcChange, alts };
}

async function prevDominance(env) {
  try {
    const s = await env.OUTLOOK_KV.get(REFRESH.kvKey);
    if (s) { const o = JSON.parse(s); return o?.data?.dominance ?? null; }
  } catch { /* ignore */ }
  return null;
}

export async function refreshAltcoins(env) {
  if (!(await staleEnough(env, REFRESH.kvKey, REFRESH.refetchSeconds))) return { ok: true, skipped: true };
  const [dom, perf, prev] = await Promise.all([dominance(), performance(), prevDominance(env)]);
  if (dom == null && (!perf.alts || !perf.alts.length)) return { ok: false, reason: "no altcoin data" };
  const out = computeAltcoins({ dominance: dom, btcChange: perf.btcChange, alts: perf.alts, prevDominance: prev });
  await putIfChanged(env, REFRESH.kvKey, out);
  return { ok: true, altcoins: out };
}

export async function readAltcoins(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.altcoins, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-altcoins-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshAltcoins(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
