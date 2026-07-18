// CoinGyaan · cache + refresh orchestration (Cloudflare KV)
// readOutlook: serve fresh from KV, serve stale + refresh in background, or
// synchronously refresh on cold/very-stale. Never throws to the caller.

import { assembleMarket } from "./providers.js";
import { computeOutlook } from "./engine.js";
import { REFRESH } from "./engine-config.js";

export async function refreshOutlook(env) {
  const { market, status } = await assembleMarket(REFRESH);
  // Guard: never overwrite a good cache with a half-empty pull
  if (!market.price || !Array.isArray(market.closes1h) || market.closes1h.length < 60) {
    return { ok: false, reason: "insufficient market data", providers: status };
  }
  const outlook = computeOutlook(market);
  outlook.providers = status;
  await env.OUTLOOK_KV.put(REFRESH.kvKey, JSON.stringify(outlook));
  return { ok: true, outlook, providers: status };
}

export async function readOutlook(env, ctx) {
  let cached = null;
  try {
    const s = await env.OUTLOOK_KV.get(REFRESH.kvKey);
    if (s) cached = JSON.parse(s);
  } catch { /* ignore */ }

  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;

  if (cached && ageSec <= REFRESH.ttlSeconds) return withMeta(cached, "ok", ageSec);

  if (cached && ageSec <= REFRESH.staleSeconds) {
    if (ctx && ctx.waitUntil) ctx.waitUntil(guardedRefresh(env));
    return withMeta(cached, "stale", ageSec);
  }

  const r = await guardedRefresh(env);
  if (r.ok) return withMeta(r.outlook, "ok", 0);
  if (cached) return withMeta(cached, "stale", ageSec);
  return {
    asOf: new Date().toISOString(), status: "error",
    source: "coingyaan-outlook-v1", data: null, error: "no data available",
  };
}

async function guardedRefresh(env) {
  try {
    const locked = await env.OUTLOOK_KV.get(REFRESH.lockKey);
    if (locked) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* if lock fails, still attempt refresh */ }
  try {
    return await refreshOutlook(env);
  } finally {
    try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ }
  }
}

function withMeta(outlook, status, ageSec) {
  return { ...outlook, status, ageSeconds: Math.max(0, Math.round(ageSec)) };
}
