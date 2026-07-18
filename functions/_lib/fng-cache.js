// CoinGyaan · Fear and Greed cache + refresh (reuses the OUTLOOK_KV binding).
// Same stale-while-revalidate behaviour as the outlook cache.

import { computeFearGreed } from "./fng-engine.js";
import { REFRESH } from "./fng-config.js";

async function fetchHistory(limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`, {
      headers: { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const d = await res.json();
    const rows = d?.data;
    if (!Array.isArray(rows) || !rows.length) return null;
    // Alternative.me returns newest first; normalise to oldest -> newest
    return rows
      .map((r) => ({ t: parseInt(r.timestamp, 10), v: parseInt(r.value, 10) }))
      .filter((r) => Number.isFinite(r.v))
      .reverse();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshFearGreed(env) {
  const history = await fetchHistory(REFRESH.historyLimit);
  if (!history || !history.length) return { ok: false, reason: "no fng data" };
  const out = computeFearGreed(history);
  if (out.status !== "ok") return { ok: false, reason: out.error || "compute failed" };
  await env.OUTLOOK_KV.put(REFRESH.kvKey, JSON.stringify(out));
  return { ok: true, fng: out };
}

export async function readFearGreed(env, ctx) {
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
  if (r.ok) return withMeta(r.fng, "ok", 0);
  if (cached) return withMeta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-fng-v1", data: null, error: "no data available" };
}

async function guardedRefresh(env) {
  try {
    const locked = await env.OUTLOOK_KV.get(REFRESH.lockKey);
    if (locked) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshFearGreed(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function withMeta(o, status, ageSec) {
  return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) };
}
