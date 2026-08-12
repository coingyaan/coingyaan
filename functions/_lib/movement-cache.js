// CoinGyaan · Bitcoin 7 Day Movement (historical, descriptive).
// Two independent BTC price sources sampled with the SAME 06:00 UTC daily rule:
//   1) CoinGyaan reference: primary market chain (Binance -> Bybit -> OKX hourly)
//   2) Hyperliquid reference: BTC perpetual via /info candleSnapshot
// This module is read-only history. It is NOT a signal and never touches the 24h
// outlook or the short term signals. Missing data yields null, never a fabricated
// value. Reuses the OUTLOOK_KV binding and the stale-while-revalidate pattern.

const CFG = {
  symbolBybit: "BTCUSDT",
  symbolBinance: "BTCUSDT",
  instOkx: "BTC-USDT-SWAP",
  hlCoin: "BTC",
  refHourUTC: 6, // 06:00 UTC daily reference
  days: 8, // 8 daily reference points => a full 7 day change (last vs 7 days earlier)
  fetchHours: 264, // ~11 days of hourly candles for headroom
  matchWindowMs: 60 * 60 * 1000, // fallback: accept a candle within +/- 1h of 06:00 UTC
  kvKey: "movement:btc:v1",
  lockKey: "movement:btc:lock",
  ttlSeconds: 1800, // 30 min: the current partial day updates, references are daily
  staleSeconds: 7200,
  lockSeconds: 90,
};

const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 5000);
  try {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: { ...UA, ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ---- CoinGyaan primary chain: dated hourly OHLC, ascending [{t,o,h,l,c}] ----
async function primaryHourly() {
  const end = Date.now(), lim = CFG.fetchHours;
  // Binance futures (often edge-blocked, tried first to match the outlook chain)
  const b = await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${CFG.symbolBinance}&interval=1h&limit=${lim}`);
  if (Array.isArray(b) && b.length) {
    return { src: "binance", rows: b.map((r) => ({ t: +r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4] })) };
  }
  // Bybit v5 (edge-friendly), newest first
  const by = await getJson(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${CFG.symbolBybit}&interval=60&limit=${lim}`);
  const bl = by?.result?.list;
  if (Array.isArray(bl) && bl.length) {
    const rows = bl.map((r) => ({ t: +r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4] })).sort((a, z) => a.t - z.t);
    return { src: "bybit", rows };
  }
  // OKX, newest first
  const ok = await getJson(`https://www.okx.com/api/v5/market/candles?instId=${CFG.instOkx}&bar=1H&limit=${lim}`);
  const okl = ok?.data;
  if (Array.isArray(okl) && okl.length) {
    const rows = okl.map((r) => ({ t: +r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4] })).sort((a, z) => a.t - z.t);
    return { src: "okx", rows };
  }
  return null;
}

// ---- Hyperliquid BTC perpetual: dated hourly OHLC via candleSnapshot ----
async function hyperliquidHourly() {
  const end = Date.now(), start = end - (CFG.fetchHours + 6) * 3600 * 1000;
  const d = await getJson("https://api.hyperliquid.xyz/info", {
    method: "POST",
    body: { type: "candleSnapshot", req: { coin: CFG.hlCoin, interval: "1h", startTime: start, endTime: end } },
  });
  if (!Array.isArray(d) || !d.length) return null;
  // Candle fields: t (open ms), o,h,l,c (strings), plus T,s,i,v,n.
  const rows = d.map((r) => ({ t: +r.t, o: +r.o, h: +r.h, l: +r.l, c: +r.c })).filter((r) => Number.isFinite(r.t) && Number.isFinite(r.o)).sort((a, z) => a.t - z.t);
  return rows.length ? { src: "hyperliquid", rows } : null;
}

function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

// latest 06:00 UTC timestamp at or before now
function latestRefTs(now) {
  const d = new Date(now);
  const ref = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), CFG.refHourUTC, 0, 0, 0);
  return ref <= now ? ref : ref - 24 * 3600 * 1000;
}

// The reference price at 06:00 UTC is the OPEN of the 06:00 hourly candle. If that
// candle is absent, accept the nearest candle within +/- matchWindowMs, else null.
function refAt(rows, ts) {
  if (!rows || !rows.length) return null;
  let exact = null, nearest = null, nd = Infinity;
  for (const r of rows) {
    if (r.t === ts) { exact = r; break; }
    const diff = Math.abs(r.t - ts);
    if (diff < nd) { nd = diff; nearest = r; }
  }
  if (exact) return exact.o;
  if (nearest && nd <= CFG.matchWindowMs) return nearest.o;
  return null;
}

function pct(a, b) { return (a != null && b != null && b !== 0) ? round2(((a - b) / Math.abs(b)) * 100) : null; }
function round2(n) { return n == null ? null : Math.round(n * 100) / 100; }
function round1(n) { return n == null ? null : Math.round(n * 10) / 10; }

// True intraday 7 day high/low from the primary hourly candles within the window.
function highLow(rows, fromTs, toTs) {
  const win = (rows || []).filter((r) => r.t >= fromTs && r.t <= toTs);
  if (!win.length) return { high: null, low: null };
  let high = -Infinity, low = Infinity;
  for (const r of win) { if (r.h > high) high = r.h; if (r.l < low) low = r.l; }
  return { high: Number.isFinite(high) ? round1(high) : null, low: Number.isFinite(low) ? round1(low) : null };
}

export function buildMovement(primary, hyper, now = Date.now()) {
  const cgRows = primary?.rows || null;
  const hlRows = hyper?.rows || null;
  if (!cgRows) return { available: false, reason: "no primary price data" };

  const t0 = latestRefTs(now);
  const stamps = [];
  for (let i = CFG.days - 1; i >= 0; i--) stamps.push(t0 - i * 24 * 3600 * 1000);

  const points = stamps.map((ts) => {
    const cg = refAt(cgRows, ts);
    const hl = hlRows ? refAt(hlRows, ts) : null;
    return { date: isoDate(ts), ts, cg: cg == null ? null : round1(cg), hl: hl == null ? null : round1(hl), diff: (cg != null && hl != null) ? round1(cg - hl) : null };
  });
  // percent move from the previous reference point (CoinGyaan series)
  for (let i = 0; i < points.length; i++) {
    points[i].cgPctFromPrev = i > 0 ? pct(points[i].cg, points[i - 1].cg) : null;
  }

  const first = points[0], last = points[points.length - 1];
  const cg7dChangePct = pct(last.cg, first.cg);
  const hl7dChangePct = pct(last.hl, first.hl);

  const hl = highLow(cgRows, t0 - 7 * 24 * 3600 * 1000, now);
  const cgHas = points.some((p) => p.cg != null);
  const hlHas = points.some((p) => p.hl != null);

  // Continuous hourly series across the full 7 day window. The primary source is
  // the x spine; each point is that hour's OPEN price (a real observed value, no
  // interpolation). Hyperliquid is matched on the exact hour, else null (gap).
  // The 06:00 UTC references are the subset flagged ref:true, so they sit exactly
  // on the line. windowStart is the oldest daily reference (t0 - 7 days).
  const windowStart = t0 - 7 * 24 * 3600 * 1000;
  const hlByTs = new Map();
  (hlRows || []).forEach((r) => { hlByTs.set(r.t, r.o); });
  const refTs = new Set(stamps);
  const series = cgRows
    .filter((r) => r.t >= windowStart && r.t <= now)
    .map((r) => {
      const hlv = hlByTs.has(r.t) ? hlByTs.get(r.t) : null;
      return {
        t: r.t,
        cg: round1(r.o),
        hl: hlv == null ? null : round1(hlv),
        ref: refTs.has(r.t),
      };
    });

  return {
    available: cgHas,
    referenceHourUTC: CFG.refHourUTC,
    windowDays: 7,
    windowStart,
    windowEnd: now,
    points,
    series,
    cg7dChangePct,
    hl7dChangePct,
    high7d: hl.high,
    low7d: hl.low,
    highLowSource: "CoinGyaan primary",
    cgSource: primary?.src || null,
    cgAvailable: cgHas,
    hlAvailable: hlHas,
  };
}

async function readCached(env) {
  try { const s = await env.OUTLOOK_KV.get(CFG.kvKey); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return null;
}

export async function refreshMovement(env) {
  const [primary, hyper] = await Promise.all([primaryHourly(), hyperliquidHourly()]);
  const built = buildMovement(primary, hyper);
  if (!built.available) return { ok: false, reason: built.reason || "compute failed" };
  const payload = { asOf: new Date().toISOString(), source: "coingyaan-movement-v1", ...built };
  try { await env.OUTLOOK_KV.put(CFG.kvKey, JSON.stringify(payload)); } catch { /* ignore */ }
  return { ok: true, movement: payload };
}

export async function readMovement(env, ctx) {
  const cached = await readCached(env);
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= CFG.ttlSeconds) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= CFG.staleSeconds) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.movement, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-movement-v1", available: false, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(CFG.lockKey)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(CFG.lockKey, "1", { expirationTtl: CFG.lockSeconds });
  } catch { /* proceed */ }
  try { return await refreshMovement(env); }
  finally { try { await env.OUTLOOK_KV.delete(CFG.lockKey); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
