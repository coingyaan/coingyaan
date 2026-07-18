// CoinGyaan · Bitcoin Outlook Engine v1
// The interpretation layer. Free market data in, a CoinGyaan outlook out.
// Providers can change; this file is the product. Every number here is ours.
// All tunable weights/thresholds live in engine-config.js, never here.

import {
  rsi, rsiAt, macd, realizedVol, volumeTrend, ema, clamp, tanh,
} from "./indicators.js";
import { WEIGHTS, PARAMS } from "./engine-config.js";

const toneOf = (lean) => (lean > 0 ? "up" : lean < 0 ? "down" : "neutral");
const P = PARAMS;

export function computeOutlook(market) {
  const {
    price, priceChangePct24h = 0,
    closes1h = [], volumes1h = [],
    funding = null, oiChangePct = null, oiUsd = null,
    dominance = null, fearGreed = null, etfNet = null,
  } = market;

  // ---- indicators ----
  const rsiV = rsi(closes1h, P.rsiPeriod);
  const rsiPrev = rsiAt(closes1h, P.rsiPeriod, P.rsiLookback);
  const macdV = macd(closes1h, P.macdFast, P.macdSlow, P.macdSignal);
  const ema20 = ema(closes1h, 20);
  const ema50 = ema(closes1h, 50);
  const volPer = realizedVol(closes1h, P.volWindow);
  const dailyVol = volPer != null ? volPer * Math.sqrt(24) : null;
  const volTrend = volumeTrend(volumes1h, 12, 48);
  const volNorm = dailyVol != null ? clamp(dailyVol / P.volDailyRef, 0, 1) : P.volNormFallback;
  const priceDir = priceChangePct24h > 0 ? 1 : priceChangePct24h < 0 ? -1 : 0;

  // ---- signal: trend ----
  let trendScore = null;
  if (ema20 != null && ema50 != null && price) {
    const fastVsSlow = (ema20 - ema50) / ema50;
    const priceVsSlow = (price - ema50) / ema50;
    trendScore = tanh((fastVsSlow * 0.6 + priceVsSlow * 0.4) * P.trendScale);
  }

  // ---- signal: momentum (RSI + MACD) ----
  let momScore = null, rsiImproving = false, macdImproving = false;
  if (rsiV != null) {
    const rScore = clamp((rsiV - 50) / P.rsiDivisor);
    rsiImproving = rsiPrev != null && rsiV > rsiPrev;
    let mScore = 0;
    if (macdV) {
      mScore = clamp(tanh((macdV.hist / (P.macdScale * price)) || 0));
      macdImproving = macdV.prevHist != null && macdV.hist > macdV.prevHist;
    }
    momScore = clamp(rScore * P.momentumRsiWeight + mScore * P.momentumMacdWeight);
  }
  const momImproving = rsiImproving || macdImproving;

  // ---- signal: funding (confirmation with crowding reversal) ----
  let fundScore = null;
  if (funding != null) {
    const base = funding / P.fundingUnit;
    if (base > 1) fundScore = clamp(1 - (base - 1) * P.fundingCrowdSlope);
    else if (base < -1) fundScore = clamp(-1 - (base + 1) * P.fundingCrowdSlope);
    else fundScore = clamp(base);
  }

  // ---- signal: open interest ----
  let oiScore = null;
  if (oiChangePct != null) {
    const mag = tanh(Math.abs(oiChangePct) / P.oiScale);
    oiScore = clamp(priceDir * mag * (oiChangePct >= 0 ? 1 : P.oiFallingDamp));
  }

  // ---- signal: ETF (absent in v1) ----
  let etfScore = null;
  if (etfNet != null) etfScore = clamp(tanh(etfNet / P.etfScale));

  // ---- signal: fear & greed ----
  let fngScore = null;
  if (fearGreed != null) fngScore = clamp((fearGreed - 50) / P.fngDivisor);

  // ---- assemble, drop absent, redistribute weight ----
  const raw = { trend: trendScore, momentum: momScore, funding: fundScore, oi: oiScore, etf: etfScore, fng: fngScore };
  const present = Object.keys(raw).filter((k) => raw[k] != null);
  const baseSum = present.reduce((s, k) => s + WEIGHTS[k], 0);
  const weights = {};
  present.forEach((k) => { weights[k] = WEIGHTS[k] / baseSum; });
  let composite = 0;
  present.forEach((k) => { composite += raw[k] * weights[k]; });
  composite = clamp(composite);

  // ---- probability + direction ----
  const upside = Math.round(clamp(50 + composite * P.probSpread, P.probMin, P.probMax));
  const downside = 100 - upside;
  const diff = upside - 50;
  let direction, stance;
  if (upside >= P.directionBull) {
    direction = "Bullish";
    stance = (diff >= P.stanceStrong ? "Strongly bullish" : "Moderately bullish") + " over the next 24 hours";
  } else if (upside <= P.directionBear) {
    direction = "Bearish";
    stance = (diff <= -P.stanceStrong ? "Strongly bearish" : "Moderately bearish") + " over the next 24 hours";
  } else {
    direction = "Neutral";
    stance = "No clear directional edge over the next 24 hours";
  }
  const directionTone = direction === "Bullish" ? "up" : direction === "Bearish" ? "down" : "neutral";

  // ---- confidence (earned) ----
  const strength = Math.abs(composite);
  const compSign = composite > 0 ? 1 : composite < 0 ? -1 : 0;
  let agree = 0, counted = 0;
  present.forEach((k) => {
    if (Math.abs(raw[k]) < P.confAgreeMinAbs) return;
    counted++;
    if ((raw[k] > 0 ? 1 : -1) === compSign) agree++;
  });
  const agreement = counted ? agree / counted : 0;
  const confRaw = clamp(P.confStrengthW * strength + P.confAgreeW * agreement - volNorm * P.confVolPenalty, 0, 1);
  const confidencePct = Math.round(P.confBase + confRaw * P.confSpread);
  const confidenceLabel = confidencePct > P.confHigh ? "High" : confidencePct >= P.confModerate ? "Moderate" : "Low";
  const confidenceTone = confidenceLabel === "High" ? "up" : "neutral";

  // ---- risk ----
  const fundExtremity = funding != null ? clamp(Math.abs(funding) / P.riskFundRef, 0, 1) : 0;
  const oiSurge = oiChangePct != null ? clamp(Math.abs(oiChangePct) / P.riskOiRef, 0, 1) : 0;
  const riskRaw = P.riskVolW * volNorm + P.riskFundW * fundExtremity + P.riskOiW * oiSurge;
  const risk = riskRaw > P.riskHigh ? "High" : riskRaw > P.riskMedium ? "Medium" : "Low";
  const riskTone = risk === "Low" ? "up" : risk === "High" ? "down" : "neutral";

  // ---- market condition ----
  let condition, conditionTone;
  const t = trendScore ?? 0;
  if (t < P.condRecoveryTrend && momImproving && volNorm < P.condRecoveryVol) { condition = "Recovery Phase"; conditionTone = "info"; }
  else if (Math.abs(t) < P.condRangingTrend && volNorm < P.condRangingVol) { condition = "Ranging"; conditionTone = "neutral"; }
  else if (t > P.condTrendUp && (oiChangePct == null || oiChangePct >= 0)) { condition = "Trending Up"; conditionTone = "up"; }
  else if (t < P.condTrendDown) { condition = "Trending Down"; conditionTone = "down"; }
  else if (volNorm > P.condRiskoffVol && (momScore ?? 0) < 0) { condition = "Risk-off"; conditionTone = "down"; }
  else if (direction === "Bullish") { condition = "Trending Up"; conditionTone = "up"; }
  else if (direction === "Bearish") { condition = "Pullback"; conditionTone = "down"; }
  else { condition = "Ranging"; conditionTone = "neutral"; }

  // ---- expected range ----
  const dv = dailyVol != null ? dailyVol : P.rangeFallbackVol;
  const rangeLow = price * (1 - dv);
  const rangeHigh = price * (1 + dv);
  const rangePct = +(dv * 100).toFixed(1);

  // ---- reasons ----
  const reasons = buildReasons({ raw, weights, rsiV, macdV, funding, oiChangePct, priceDir, fearGreed, trendScore });

  // ---- summary ----
  let summary;
  if (direction === "Neutral") {
    summary = "Signals are split. No clear directional edge over the next 24 hours.";
  } else {
    const top = reasons.slice(0, 2).map((r) => r.note.toLowerCase()).join(", and ");
    summary = `${stance.charAt(0).toUpperCase() + stance.slice(1)}. ${top}.`;
  }

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-outlook-v1",
    data: {
      price: Math.round(price),
      direction, stance,
      upsideProbability: upside, downsideProbability: downside,
      confidence: confidencePct, confidenceLabel,
      risk, condition, momentum: momImproving ? "Improving" : "Softening",
      expectedRange: { low: Math.round(rangeLow), high: Math.round(rangeHigh), pct: rangePct, display: `${fmtK(rangeLow)} \u2192 ${fmtK(rangeHigh)}` },
      bias: { upside, downside },
      summary, reasons,
      tones: { direction: directionTone, confidence: confidenceTone, condition: conditionTone, risk: riskTone, range: "up" },
    },
    signals: {
      rsi: rsiV != null ? +rsiV.toFixed(1) : null,
      macdHist: macdV ? +macdV.hist.toFixed(2) : null,
      trend: trendScore != null ? +trendScore.toFixed(2) : null,
      funding: funding != null ? +(funding * 100).toFixed(4) : null,
      oiChangePct: oiChangePct != null ? +oiChangePct.toFixed(1) : null,
      oiUsd: oiUsd != null ? Math.round(oiUsd) : null,
      dominance: dominance != null ? +dominance.toFixed(1) : null,
      fearGreed, volatilityPct: dailyVol != null ? +(dailyVol * 100).toFixed(1) : null,
      volumeTrendPct: volTrend != null ? +(volTrend * 100).toFixed(1) : null,
    },
    scores: Object.fromEntries(present.map((k) => [k, +raw[k].toFixed(2)])),
    weights: Object.fromEntries(present.map((k) => [k, +weights[k].toFixed(3)])),
    composite: +composite.toFixed(3),
  };
}

function buildReasons({ raw, weights, rsiV, funding, oiChangePct, priceDir, fearGreed, trendScore }) {
  const items = [];
  const add = (key, note, lean, label) => {
    if (raw[key] == null) return;
    items.push({ signal: label, key, note, lean, tone: toneOf(lean), impact: Math.abs(raw[key] * (weights[key] || 0)) });
  };
  if (raw.trend != null) {
    const s = trendScore;
    const note = s > 0.15 ? "Price is holding above its moving averages"
      : s < -0.15 ? "Price is trading below its moving averages"
      : "Moving averages are flat and intertwined";
    add("trend", note, s > 0.1 ? 1 : s < -0.1 ? -1 : 0, "Trend");
  }
  if (raw.momentum != null && rsiV != null) {
    const note = rsiV < 35 ? `RSI is oversold at ${Math.round(rsiV)} and turning up`
      : rsiV > 65 ? `RSI is stretched at ${Math.round(rsiV)}`
      : raw.momentum > 0.1 ? `Momentum is improving (RSI ${Math.round(rsiV)})`
      : raw.momentum < -0.1 ? `Momentum is weakening (RSI ${Math.round(rsiV)})`
      : `Momentum is flat (RSI ${Math.round(rsiV)})`;
    add("momentum", note, raw.momentum > 0.1 ? 1 : raw.momentum < -0.1 ? -1 : 0, "Momentum");
  }
  if (raw.funding != null && funding != null) {
    const pct = (funding * 100).toFixed(3);
    let note, lean;
    if (raw.funding >= 0 && funding >= 0) { note = `Funding is positive at ${pct}%, supporting the move`; lean = 1; }
    else if (raw.funding < 0 && funding > 0) { note = `Funding is elevated at ${pct}%, long crowding raises squeeze risk`; lean = -1; }
    else if (raw.funding < 0 && funding <= 0) { note = `Funding is negative at ${pct}%, momentum is soft`; lean = -1; }
    else { note = `Funding is deeply negative at ${pct}%, shorts look crowded`; lean = 1; }
    add("funding", note, lean, "Funding");
  }
  if (raw.oi != null && oiChangePct != null) {
    const up = priceDir >= 0, rising = oiChangePct >= 0;
    const note = rising && up ? "Open interest is rising with price, new money is entering"
      : rising && !up ? "Open interest is rising into weakness, shorts are pressing"
      : !rising && up ? "Open interest is falling as price rises, short covering"
      : "Open interest is falling with price, positions are unwinding";
    add("oi", note, raw.oi > 0.05 ? 1 : raw.oi < -0.05 ? -1 : 0, "Open Interest");
  }
  if (raw.fng != null && fearGreed != null) {
    const note = fearGreed >= 55 ? `Sentiment sits in greed at ${fearGreed}`
      : fearGreed <= 45 ? `Sentiment is fearful at ${fearGreed}`
      : `Sentiment is neutral at ${fearGreed}`;
    add("fng", note, fearGreed >= 55 ? 1 : fearGreed <= 45 ? -1 : 0, "Sentiment");
  }
  return items.sort((a, b) => b.impact - a.impact).slice(0, PARAMS.reasonsMax).map(({ impact, ...r }) => r);
}

function fmtK(n) { return n >= 1000 ? "$" + (n / 1000).toFixed(1) + "K" : "$" + Math.round(n); }
