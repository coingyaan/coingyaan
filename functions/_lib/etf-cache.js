// CoinGyaan · ETF Flows cache + refresh (SoSoValue Open API).
// The SOSOVALUE_API_KEY is read from the server-side environment only and is
// never returned to the browser. Reuses the OUTLOOK_KV binding and the same
// stale-while-revalidate pattern, but on a slow cadence since ETF data updates
// about once per trading day. Any failed source yields null, never fake data.

import { computeEtf } from "./etf-engine.js";
import { SOSO, REFRESH } from "./etf-config.js";

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, headers, timeout) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout || 6000);
  try {
    const res = await fetch(url, { headers: { ...UA, ...(headers || {}) }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// SoSoValue responses may be a bare array/object or wrapped as {code,msg,data}.
// Accept either shape rather than assume one.
function unwrap(resp) {
  if (resp == null) return null;
  if (Array.isArray(resp)) return resp;
  if (resp.data !== undefined) return resp.data;
  return resp;
}

function sosoHeaders(env) {
  const key = env[SOSO.keyEnv];
  return key ? { "x-soso-api-key": key } : null;
}

async function fetchSummaryHistory(env) {
  const h = sosoHeaders(env); if (!h) return null;
  const url = `${SOSO.base}/etfs/summary-history?symbol=${SOSO.symbol}&country_code=${SOSO.countryCode}&limit=${SOSO.historyLimit}`;
  const data = unwrap(await getJson(url, h));
  return Array.isArray(data) && data.length ? data : null;
}

async function fetchList(env) {
  const h = sosoHeaders(env); if (!h) return null;
  const url = `${SOSO.base}/etfs?symbol=${SOSO.symbol}&country_code=${SOSO.countryCode}`;
  const data = unwrap(await getJson(url, h));
  return Array.isArray(data) ? data : null;
}

async function fetchSnapshot(env, ticker) {
  const h = sosoHeaders(env); if (!h) return null;
  const url = `${SOSO.base}/etfs/${encodeURIComponent(ticker)}/market-snapshot`;
  const data = unwrap(await getJson(url, h));
  if (!data || typeof data !== "object") return null;
  return { ticker: data.ticker || ticker, name: undefined, ...data };
}

// Per-fund snapshots, fetched in small batches to respect the 20 req/min limit.
async function fetchFunds(env, list) {
  if (!Array.isArray(list) || !list.length) return [];
  const nameByTicker = new Map(list.map((e) => [e.ticker, e.name]));
  const tickers = list.map((e) => e.ticker).filter(Boolean).slice(0, 15);
  const out = [];
  const batch = 5;
  for (let i = 0; i < tickers.length; i += batch) {
    const chunk = tickers.slice(i, i + batch);
    const res = await Promise.all(chunk.map((t) => fetchSnapshot(env, t)));
    res.forEach((s) => { if (s) { s.name = nameByTicker.get(s.ticker) || s.ticker; out.push(s); } });
  }
  return out;
}

// Daily BTC closes with dates, from Bybit (edge-friendly, no key), for the price
// vs flows overlay. Best-effort: null on failure just hides the overlay.
async function fetchDailyPrice() {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${REFRESH.priceSymbol}&interval=D&limit=${REFRESH.priceDays}`;
  const d = await getJson(url);
  const list = d?.result?.list;
  if (!Array.isArray(list) || !list.length) return null;
  return list.map((r) => ({
    date: new Date(Number(r[0])).toISOString().slice(0, 10),
    close: parseFloat(r[4]),
  })).filter((p) => Number.isFinite(p.close));
}

async function readCached(env) {
  try { const s = await env.OUTLOOK_KV.get(REFRESH.kvKey); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return null;
}

export async function refreshETF(env, opts) {
  const force = opts && opts.force;
  // Slow-cadence throttle: skip refetch if the cache is younger than refetchSeconds.
  if (!force) {
    const cached = await readCached(env);
    if (cached && cached.asOf) {
      const age = (Date.now() - Date.parse(cached.asOf)) / 1000;
      if (age < REFRESH.refetchSeconds) return { ok: true, skipped: true, etf: cached };
    }
  }
  if (!sosoHeaders(env)) return { ok: false, reason: "SOSOVALUE_API_KEY not configured" };

  const history = await fetchSummaryHistory(env);
  if (!history) return { ok: false, reason: "no ETF summary history" };

  const [list, price] = await Promise.all([fetchList(env), fetchDailyPrice()]);
  const funds = await fetchFunds(env, list || []);

  const computed = computeEtf(history, funds, price);
  if (!computed.available) return { ok: false, reason: computed.reason || "compute failed" };

  const payload = {
    asOf: new Date().toISOString(),
    source: "coingyaan-etf-v1",
    provider: "SoSoValue",
    ...computed,
  };
  try { await env.OUTLOOK_KV.put(REFRESH.kvKey, JSON.stringify(payload)); } catch { /* ignore */ }
  return { ok: true, etf: payload };
}

export async function readETF(env, ctx) {
  const cached = await readCached(env);
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= REFRESH.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= REFRESH.staleSeconds) {
    if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env));
    return meta(cached, "stale", ageSec);
  }
  const r = await guarded(env);
  if (r.ok) return meta(r.etf, r.skipped ? "ok" : "ok", r.skipped ? ageSec : 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-etf-v1", available: false, error: "no data available" };
}

// Small helper for the Bitcoin outlook: the latest etfNet ($m) or null.
export async function readEtfNet(env) {
  const cached = await readCached(env);
  if (!cached) return null;
  const age = (Date.now() - Date.parse(cached.asOf)) / 1000;
  if (age > REFRESH.staleSeconds) return null; // too old to trust
  return typeof cached.etfNet === "number" ? cached.etfNet : null;
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(REFRESH.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(REFRESH.lockKey, "1", { expirationTtl: REFRESH.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshETF(env); }
  finally { try { await env.OUTLOOK_KV.delete(REFRESH.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
