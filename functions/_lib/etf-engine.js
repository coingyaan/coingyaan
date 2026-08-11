// CoinGyaan · ETF Flows engine (pure, no network).
// Turns SoSoValue aggregate + per-fund data into CoinGyaan ETF intelligence.
// Every number is derived from real API fields. Missing inputs yield null, never
// a fabricated value. This engine does NOT touch the Bitcoin outlook engine; it
// only exposes etfNet for that engine to consume at its existing 0.12 weight.

import { SIGNAL, ETF_NET } from "./etf-config.js";

const M = 1e6;

function asc(rows) {
  // summary-history is newest-first; return a chronological copy.
  return Array.isArray(rows) ? rows.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))) : [];
}
function num(v) { const n = typeof v === "string" ? parseFloat(v) : v; return Number.isFinite(n) ? n : null; }
function sumLastN(series, n) {
  if (!series.length) return null;
  const s = series.slice(-n);
  return s.reduce((a, r) => a + (num(r.total_net_inflow) || 0), 0);
}
function avgLastN(series, n) {
  if (series.length < 1) return null;
  const s = series.slice(-n);
  if (!s.length) return null;
  return s.reduce((a, r) => a + (num(r.total_net_inflow) || 0), 0) / s.length;
}
function avgPrev(series, n, offset) {
  // average of n days ending `offset` days before the latest
  if (series.length < offset + 1) return null;
  const end = series.length - offset;
  const s = series.slice(Math.max(0, end - n), end);
  if (!s.length) return null;
  return s.reduce((a, r) => a + (num(r.total_net_inflow) || 0), 0) / s.length;
}

function trendState(sum20mUSD) {
  if (sum20mUSD == null) return null;
  const m = sum20mUSD / M; // $m over 20 days
  if (m >= 1500) return "Strongly positive";
  if (m >= 300) return "Positive";
  if (m <= -1500) return "Strongly negative";
  if (m <= -300) return "Negative";
  return "Neutral";
}

function momentumState(recent5dAvgM, prior5dAvgM) {
  if (recent5dAvgM == null || prior5dAvgM == null) return null;
  const diff = recent5dAvgM - prior5dAvgM;
  if (Math.abs(diff) < SIGNAL.momentumBand) return "Stable";
  return diff > 0 ? "Accelerating" : "Decelerating";
}

// The transparent ETF Flow Signal. Returns state plus the exact components that
// produced it so the page can show the user why.
function flowSignal(avg5dM, avg20dM, momentumM) {
  if (avg5dM == null || avg20dM == null) return null;
  const mom = momentumM == null ? 0 : momentumM;
  const score = SIGNAL.wLevel * avg5dM + SIGNAL.wContext * avg20dM + SIGNAL.wMomentum * mom;
  let state, tone;
  if (score >= SIGNAL.strongBull) { state = "Strongly Bullish"; tone = "up"; }
  else if (score >= SIGNAL.bull) { state = "Bullish"; tone = "up"; }
  else if (score <= SIGNAL.strongBear) { state = "Strongly Bearish"; tone = "down"; }
  else if (score <= SIGNAL.bear) { state = "Bearish"; tone = "down"; }
  else { state = "Neutral"; tone = "neutral"; }
  return {
    state, tone,
    score: round1(score),
    components: {
      avg5d: round1(avg5dM),
      avg20d: round1(avg20dM),
      momentum: round1(mom),
      weights: { level: SIGNAL.wLevel, context: SIGNAL.wContext, momentum: SIGNAL.wMomentum },
    },
  };
}

function round1(n) { return n == null ? null : Math.round(n * 10) / 10; }
function roundM(usd) { return usd == null ? null : Math.round((usd / M) * 10) / 10; } // USD -> $m, 1dp

// Concentration from per-fund snapshots. We use AUM share as the dominance basis
// because it is always well defined and 0 to 100 percent. Cumulative-flow share
// is intentionally NOT used: funds with large lifetime outflows (for example
// GBTC) shrink the denominator and can push a leader above 100 percent, which
// would be misleading. We add the latest-day positive-inflow leader, which shows
// where new money went that day. Period (5D/20D) per-fund share is deferred until
// per-fund history is wired, so it is not approximated here.
function concentration(funds) {
  const valid = (funds || []).filter((f) => f && f.ticker);
  if (!valid.length) return null;
  const rows = valid.map((f) => ({
    ticker: f.ticker, name: f.name || f.ticker,
    aum: num(f.net_assets), day: num(f.net_inflow), cum: num(f.cum_inflow),
  }));
  const totalAum = rows.reduce((a, f) => a + (f.aum || 0), 0);
  const totalPosDay = rows.reduce((a, f) => a + Math.max(0, f.day || 0), 0);
  const byAum = rows
    .map((f) => ({
      ...f,
      aumSharePct: totalAum ? round1(((f.aum || 0) / totalAum) * 100) : null,
      dayInflowSharePct: (totalPosDay && (f.day || 0) > 0) ? round1((f.day / totalPosDay) * 100) : null,
    }))
    .sort((a, b) => (b.aum || 0) - (a.aum || 0));
  const top = byAum[0];
  const dayLeader = byAum
    .filter((f) => f.dayInflowSharePct != null)
    .sort((a, b) => b.dayInflowSharePct - a.dayInflowSharePct)[0] || null;
  return {
    basis: "aum",
    funds: byAum,
    topTicker: top ? top.ticker : null,
    topAumSharePct: top ? top.aumSharePct : null,
    totalAumM: roundM(totalAum),
    dayInflowLeader: dayLeader ? { ticker: dayLeader.ticker, sharePct: dayLeader.dayInflowSharePct } : null,
  };
}

function buildSummary(metrics, sig, momentum, conc) {
  const obs = [];
  if (metrics.flow5dM != null) obs.push((metrics.flow5dM >= 0 ? "5 day net flows are positive at " : "5 day net flows are negative at ") + fmtM(metrics.flow5dM));
  if (momentum) obs.push("20 day flow momentum is " + momentum.toLowerCase());
  if (conc && conc.topTicker && conc.topAumSharePct != null) obs.push(conc.topTicker + " holds the largest share of ETF assets at " + conc.topAumSharePct + "%");
  if (metrics.cumNetInflowM != null) obs.push("cumulative net inflow since launch stands at " + fmtM(metrics.cumNetInflowM));
  let headline = "Neutral";
  if (sig) {
    if (sig.state.indexOf("Bullish") >= 0) headline = "Strengthening";
    else if (sig.state.indexOf("Bearish") >= 0) headline = "Weakening";
    else headline = "Balanced";
  }
  return { headline, observations: obs.slice(0, 4) };
}

function fmtM(m) {
  if (m == null) return "n/a";
  const s = m >= 0 ? "+" : "-";
  const a = Math.abs(m);
  if (a >= 1000) return s + "$" + (a / 1000).toFixed(2) + "B";
  return s + "$" + a.toFixed(1) + "M";
}

// Main entry. history = raw summary-history rows (newest first). funds = array of
// per-fund snapshot objects (may be empty). priceSeries = [{date, close}] daily.
export function computeEtf(history, funds, priceSeries) {
  const series = asc(history);
  if (series.length < 2) return { available: false, reason: "insufficient ETF history" };

  const latest = series[series.length - 1];
  const flow1d = num(latest.total_net_inflow);
  const metrics = {
    lastDate: latest.date,
    latestNetFlowM: roundM(flow1d),
    flow1dM: roundM(flow1d),
    flow5dM: roundM(sumLastN(series, 5)),
    flow20dM: roundM(sumLastN(series, 20)),
    flow90dM: roundM(sumLastN(series, 90)),
    cumNetInflowM: roundM(num(latest.cum_net_inflow)),
    totalNetAssetsM: roundM(num(latest.total_net_assets)),
  };

  const avg5dUSD = avgLastN(series, 5);
  const avg20dUSD = avgLastN(series, 20);
  const priorAvg5dUSD = avgPrev(series, 5, 5);
  const avg5dM = avg5dUSD == null ? null : avg5dUSD / M;
  const avg20dM = avg20dUSD == null ? null : avg20dUSD / M;
  const momentumM = (avg5dM != null && priorAvg5dUSD != null) ? avg5dM - priorAvg5dUSD / M : null;

  const momentum = momentumState(avg5dM, priorAvg5dUSD == null ? null : priorAvg5dUSD / M);
  const trend = trendState(sumLastN(series, 20));
  const sig = flowSignal(avg5dM, avg20dM, momentumM);
  const conc = concentration(funds);

  // etfNet for the Bitcoin engine: 5 day average daily net inflow in $m.
  const etfNet = avgLastN(series, ETF_NET.smoothDays);
  const etfNetM = etfNet == null ? null : round1(etfNet / M);

  // Current 30D vs previous 30D
  const cur30 = sumLastN(series, 30);
  const prev30 = (series.length >= 60)
    ? series.slice(-60, -30).reduce((a, r) => a + (num(r.total_net_inflow) || 0), 0)
    : null;
  const compare = {
    current30dM: roundM(cur30),
    previous30dM: roundM(prev30),
    changePct: (cur30 != null && prev30 != null && prev30 !== 0) ? round1(((cur30 - prev30) / Math.abs(prev30)) * 100) : null,
  };

  // Chart series (chronological). Daily flow + cumulative, each dated.
  const daily = series.map((r) => ({ date: r.date, netM: roundM(num(r.total_net_inflow)), cumM: roundM(num(r.cum_net_inflow)) }));
  const price = alignPrice(daily, priceSeries);

  return {
    available: true,
    metrics,
    summary: buildSummary(metrics, sig, momentum, conc),
    momentum, trend,
    signal: sig,
    concentration: conc,
    compare,
    daily,
    price,
    etfNet: etfNetM, // $m, consumed by the Bitcoin engine
    windowDays: series.length,
    windowStart: series[0].date,
  };
}

function alignPrice(daily, priceSeries) {
  if (!Array.isArray(priceSeries) || !priceSeries.length) return null;
  const map = new Map(priceSeries.map((p) => [p.date, num(p.close)]));
  const out = daily.map((d) => ({ date: d.date, close: map.has(d.date) ? map.get(d.date) : null }));
  return out.some((p) => p.close != null) ? out : null;
}
