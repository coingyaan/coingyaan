// CoinGyaan · markets cache (ticker data). Prices from Bybit then OKX; BTC
// dominance from CoinPaprika then Coinlore (CoinGecko is blocked at the edge).
// Reuses the OUTLOOK_KV binding. Same stale-while-revalidate pattern.

const KEY = "markets:v1", LOCK = "markets:lock";
const TTL = 300, STALE = 900, LOCK_TTL = 90;
const UA = { "User-Agent": "CoinGyaan/1.0 (+https://coingyaan.com)" };

async function getJson(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 4500);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function coin(symbol) {
  // Bybit linear perp
  const bb = await getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
  const row = bb?.result?.list?.[0];
  if (row?.lastPrice) {
    return { price: parseFloat(row.lastPrice), changePct: row.price24hPcnt != null ? parseFloat(row.price24hPcnt) * 100 : 0 };
  }
  // OKX spot fallback
  const inst = symbol.replace("USDT", "-USDT");
  const ok = await getJson(`https://www.okx.com/api/v5/market/ticker?instId=${inst}`);
  const o = ok?.data?.[0];
  if (o?.last) {
    const last = parseFloat(o.last), open = parseFloat(o.open24h);
    return { price: last, changePct: open ? ((last - open) / open) * 100 : 0 };
  }
  return null;
}

async function dominance() {
  const cp = await getJson("https://api.coinpaprika.com/v1/global");
  if (cp?.bitcoin_dominance_percentage != null) return parseFloat(cp.bitcoin_dominance_percentage);
  const cl = await getJson("https://api.coinlore.net/api/global/");
  const d = Array.isArray(cl) ? cl[0]?.btc_d : null;
  return d != null ? parseFloat(d) : null;
}

export async function refreshMarkets(env) {
  const [btc, eth, sol, hype, dom] = await Promise.all([coin("BTCUSDT"), coin("ETHUSDT"), coin("SOLUSDT"), coin("HYPEUSDT"), dominance()]);
  if (!btc) return { ok: false, reason: "no price data" };
  const out = {
    asOf: new Date().toISOString(), status: "ok", source: "coingyaan-markets-v1",
    data: { btc, eth, sol, hype, dominance: dom },
  };
  await env.OUTLOOK_KV.put(KEY, JSON.stringify(out));
  return { ok: true, markets: out };
}

export async function readMarkets(env, ctx) {
  let cached = null;
  try { const s = await env.OUTLOOK_KV.get(KEY); if (s) cached = JSON.parse(s); } catch { /* ignore */ }
  const ageSec = cached ? (Date.now() - Date.parse(cached.asOf)) / 1000 : Infinity;
  if (cached && ageSec <= TTL) return meta(cached, "ok", ageSec);
  if (cached && ageSec <= STALE) { if (ctx && ctx.waitUntil) ctx.waitUntil(guarded(env)); return meta(cached, "stale", ageSec); }
  const r = await guarded(env);
  if (r.ok) return meta(r.markets, "ok", 0);
  if (cached) return meta(cached, "stale", ageSec);
  return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-markets-v1", data: null, error: "no data available" };
}

async function guarded(env) {
  try {
    if (await env.OUTLOOK_KV.get(LOCK)) return { ok: false, reason: "locked" };
    await env.OUTLOOK_KV.put(LOCK, "1", { expirationTtl: LOCK_TTL });
  } catch { /* proceed */ }
  try { return await refreshMarkets(env); }
  finally { try { await env.OUTLOOK_KV.delete(LOCK); } catch { /* ignore */ } }
}

function meta(o, status, ageSec) { return { ...o, status, ageSeconds: Math.max(0, Math.round(ageSec)) }; }
