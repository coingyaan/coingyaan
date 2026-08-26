// CoinGyaan · outlook cache + refresh orchestration (Cloudflare KV)
// Multi-asset: every function takes an asset key (default "btc"). BTC behaviour
// and cache keys are unchanged. readOutlook: serve fresh, serve stale + refresh
// in background, or synchronously refresh on cold/very-stale. Never throws.

import { assembleMarket, getIntervalCloses } from "./providers.js";
import { computeOutlook } from "./engine.js";
import { computeShortTerm } from "./shortterm.js";
import { readEtfNet } from "./etf-cache.js";
import { REFRESH, ASSETS } from "./engine-config.js";
import { putIfChanged, staleEnough } from "./kv-write.js";

function cfgFor(asset) {
  const a = ASSETS[asset] || ASSETS.btc;
  return { ...REFRESH, ...a }; // shared timings/kline from REFRESH, symbols/keys from asset
}

export async function refreshOutlook(env, asset = "btc") {
  const cfg = cfgFor(asset);
  if (!(await staleEnough(env, cfg.kvKey, cfg.refetchSeconds))) return { ok: true, skipped: true };
  const { market, status } = await assembleMarket(cfg);
  if (!market.price || !Array.isArray(market.closes1h) || market.closes1h.length < 60) {
    return { ok: false, reason: "insufficient market data", providers: status };
  }

  // Additive: supply the real ETF signal (BTC only) into the slot the engine
  // already has. etfNet is the 5 day average daily aggregate net inflow in $m,
  // computed by the ETF module. If unavailable it stays null and the engine
  // redistributes weight exactly as before. Weights and etfScale are unchanged.
  if (asset === "btc") {
    try { const v = await readEtfNet(env); if (typeof v === "number") market.etfNet = v; } catch { /* leave null */ }
  }

  const outlook = computeOutlook(market);
  outlook.asset = asset;
  outlook.providers = status;

  // Short Term Signals (BTC only). Additive: computed on separate intraday
  // candles and never alters the 24h outlook above. 1h is reused from the 24h
  // market; only 15m and 4h are fetched. Any failure leaves shortTerm null.
  if (asset === "btc") {
    try {
      const [closes15m, closes4h] = await Promise.all([
        getIntervalCloses(cfg.symbol, "15m", 150),
        getIntervalCloses(cfg.symbol, "4h", 150),
      ]);
      outlook.shortTerm = computeShortTerm({
        closes15m,
        closes1h: market.closes1h,
        closes4h,
        price: market.price,
      });
    } catch {
      outlook.shortTerm = null;
    }
  }

  await putIfChanged(env, cfg.kvKey, outlook);
  return { ok: true, outlook, providers: status };
}

export async function readOutlook(env, ctx, asset = "btc") {
  const cfg = cfgFor(asset);
  let cached = null;
  try {
    const s = await env.OUTLOOK_KV.get(cfg.kvKey);
    if (s) cached = JSON.parse(s);
  } catch { /* ignore */ }

  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;

  if (cached && ageSec <= cfg.ttlSeconds) return withMeta(cached, "ok", ageSec);

  if (cached && ageSec <= cfg.staleSeconds) {
    if (ctx && ctx.waitUntil) ctx.waitUntil(guardedRefresh(env, asset));
    return withMeta(cached, "stale", ageSec);
  }

  const r = await guardedRefresh(env, asset);
  if (r.ok) return withMeta(r.outlook, "ok", 0);
  if (cached) return withMeta(cached, "stale", ageSec);
  return {
    asOf: new Date().toISOString(), status: "error",
    source: "coingyaan-outlook-v1", data: null, error: "no data available",
  };
}

async function guardedRefresh(env, asset = "btc") {
  const cfg = cfgFor(asset);
  try {
    const locked = await env.OUTLOOK_KV.get(cfg.lockKey);
    if (locked) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(cfg.lockKey, "1", { expirationTtl: cfg.lockSeconds });
  } catch { /* if lock fails, still attempt refresh */ }
  try {
    return await refreshOutlook(env, asset);
  } finally {
    try { await env.OUTLOOK_KV.delete(cfg.lockKey); } catch { /* ignore */ }
  }
}

function withMeta(outlook, status, ageSec) {
  return { ...outlook, status, ageSeconds: Math.max(0, Math.round(ageSec)) };
}
