// CoinGyaan · Ethereum network metrics cache + refresh.
// Gas from a public Ethereum RPC (eth_gasPrice). TVL history and all-chain TVL
// from DefiLlama (free, no key). Reuses OUTLOOK_KV.

import { computeEthMetrics } from "./eth-metrics-engine.js";
import { PARAMS, REFRESH } from "./eth-metrics-config.js";

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, timeout = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Gas price in gwei from a public RPC eth_gasPrice (free, no key).
async function rpcGasGwei() {
  const body = JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 });
  const rpcs = ["https://cloudflare-eth.com", "https://ethereum-rpc.publicnode.com", "https://rpc.ankr.com/eth"];
  for (const url of rpcs) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...UA }, body, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const j = await res.json();
      if (j && typeof j.result === "string") {
        const wei = parseInt(j.result, 16);
        if (Number.isFinite(wei)) return { gwei: wei / 1e9, source: "rpc" };
      }
    } catch { /* try next */ }
  }
  return null;
}

async function gasRead() {
  return await rpcGasGwei();
}

async function tvlHistory() {
  const rows = await getJson("https://api.llama.fi/v2/historicalChainTvl/Ethereum", 8000);
  if (!Array.isArray(rows) || !rows.length) return { now: null, prior: null };
  const series = rows.map((r) => ({ ts: r.date, tvl: r.tvl })).filter((r) => Number.isFinite(r.tvl));
  if (!series.length) return { now: null, prior: null };
  const now = series[series.length - 1].tvl;
  const idx = Math.max(0, series.length - 1 - PARAMS.tvlWindowDays);
  const prior = series[idx].tvl;
  return { now, prior };
}

async function chainsShare() {
  const rows = await getJson("https://api.llama.fi/chains", 8000);
  if (!Array.isArray(rows) || !rows.length) return { ethTvl: null, totalTvl: null };
  let ethTvl = null, totalTvl = 0;
  for (const c of rows) {
    if (!Number.isFinite(c.tvl)) continue;
    totalTvl += c.tvl;
    if ((c.name || "") === "Ethereum") ethTvl = c.tvl;
  }
  return { ethTvl, totalTvl: totalTvl || null };
}

export async function refreshEthMetrics(env) {
  const [gas, tvl, chains] = await Promise.all([gasRead(), tvlHistory(), chainsShare()]);
  const gasGwei = gas ? gas.gwei : null;
  if (gasGwei == null && tvl.now == null && chains.ethTvl == null) return { ok: false, reason: "no eth metrics" };
  const out = computeEthMetrics({ gasGwei, tvlNow: tvl.now, tvlPrior: tvl.prior, ethTvl: chains.ethTvl, totalTvl: chains.totalTvl });
  if (gas && gas.source) out.data.gasSource = gas.source;
  await env.OUTLOOK_KV.put(REFRESH.kvKey, JSON.stringify(out));
  return { ok: true, ethMetrics: out };
}

export async function readEthMetrics(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.ethMetrics, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-eth-metrics-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshEthMetrics(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
