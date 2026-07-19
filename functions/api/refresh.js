// /api/refresh?key=SECRET   (POST or GET)
// Protected. Forces a recompute of every engine and writes KV. Cron calls this.
import { refreshOutlook } from "../_lib/cache.js";
import { refreshFearGreed } from "../_lib/fng-cache.js";
import { refreshMarkets } from "../_lib/markets-cache.js";
import { refreshFunding } from "../_lib/funding-cache.js";
import { refreshOpenInterest } from "../_lib/oi-cache.js";
import { refreshAltcoins } from "../_lib/altcoins-cache.js";
import { refreshStablecoins } from "../_lib/stablecoins-cache.js";
import { refreshEthMetrics } from "../_lib/eth-metrics-cache.js";

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-refresh-key");

  if (!env.REFRESH_KEY || key !== env.REFRESH_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  // Refresh each engine independently so one failing does not block the others.
  const [outlook, ethOutlook, solOutlook, fng, markets, funding, oi, altcoins, stablecoins, ethMetrics] = await Promise.allSettled([
    refreshOutlook(env),
    refreshOutlook(env, "eth"),
    refreshOutlook(env, "sol"),
    refreshFearGreed(env),
    refreshMarkets(env),
    refreshFunding(env),
    refreshOpenInterest(env),
    refreshAltcoins(env),
    refreshStablecoins(env),
    refreshEthMetrics(env),
  ]);
  const unwrap = (r) => (r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) });
  const body = { ok: true, outlook: unwrap(outlook), ethOutlook: unwrap(ethOutlook), solOutlook: unwrap(solOutlook), fng: unwrap(fng), markets: unwrap(markets), funding: unwrap(funding), oi: unwrap(oi), altcoins: unwrap(altcoins), stablecoins: unwrap(stablecoins), ethMetrics: unwrap(ethMetrics) };
  // Always 200 so the diagnostic body is visible; cron treats any 2xx as success.
  return json(body, 200);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
