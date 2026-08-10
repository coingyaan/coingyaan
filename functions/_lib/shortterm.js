// CoinGyaan · Short Term Signals (15m / 1h / 4h)
// An additive intraday layer for the Bitcoin Outlook. Each timeframe is computed
// on its OWN live candles using the same CoinGyaan trend and momentum methodology
// as the 24h engine. It is NOT derived from the 24h probability. Slow signals
// (funding, open interest, sentiment) are intentionally excluded because they are
// not meaningful at intraday resolution. The 24h engine is untouched.

import { rsi, rsiAt, macd, ema, realizedVol, clamp, tanh } from "./indicators.js";
import { WEIGHTS, PARAMS } from "./engine-config.js";

// candles per day, used to normalise per-candle volatility to a daily-equivalent
// sigma against the engine's own volDailyRef reference.
const CANDLES_PER_DAY = { "15m": 96, "1h": 24, "4h": 6 };
const TF_LABEL = { "15m": "15 min", "1h": "1 hour", "4h": "4 hours" };
const TF_SHORT = { "15m": "15M", "1h": "1H", "4h": "4H" };
// Grammatical form used inside the interpretation sentence.
const TF_PHRASE = { "15m": "15 minute", "1h": "1 hour", "4h": "4 hour" };

// Minimum candles needed for EMA50 + MACD(26,9) to be meaningful.
const MIN_CANDLES = 60;

function unavailable(tf) {
  return {
    tf, label: TF_LABEL[tf], short: TF_SHORT[tf],
    available: false, direction: null, tone: "neutral",
    upside: null, downside: null, confidence: null, confidenceLabel: null,
    rsi: null, interpretation: "Live candles for this timeframe are unavailable.",
  };
}

// Describe where price sits against its moving averages on this timeframe.
function trendClause(trendScore) {
  if (trendScore == null) return "trend structure is unclear";
  const t = trendScore;
  if (t > 0.35) return "price is pushing well above its moving averages";
  if (t > 0.1) return "price is holding above its moving averages";
  if (t < -0.35) return "price is pressing well below its moving averages";
  if (t < -0.1) return "price is trading below its moving averages";
  return "price is hugging its moving averages";
}

// Describe momentum from the RSI level, the momentum score sign and whether RSI
// is rising or falling on this timeframe.
function momentumClause(momScore, rsiV, momUp) {
  const r = rsiV != null ? " with RSI " + Math.round(rsiV) : "";
  if (rsiV != null && rsiV >= 70) return "momentum is stretched" + r;
  if (rsiV != null && rsiV <= 30) return "momentum is oversold" + r;
  const m = momScore == null ? 0 : momScore;
  if (m > 0.1) return (momUp ? "momentum is firming" : "momentum is positive but easing") + r;
  if (m < -0.1) return (momUp ? "momentum is soft but stabilising" : "momentum is fading") + r;
  return (momUp ? "momentum is flat and ticking up" : "momentum is flat") + r;
}

// Compose one timeframe-specific sentence from that frame's own signals. Because
// trendClause and momentumClause are driven by this frame's trend score, RSI
// level and RSI slope, the sentence differs whenever the underlying numbers do.
function buildInterpretation(label, trendScore, momScore, rsiV, momUp) {
  return "On the " + label + " timeframe " + trendClause(trendScore) + " and " + momentumClause(momScore, rsiV, momUp) + ".";
}

// Score one timeframe from its own closes. Returns null when data is insufficient.
function frameScore(closes, price, interval) {
  if (!Array.isArray(closes) || closes.length < MIN_CANDLES) return null;
  const last = price || closes[closes.length - 1];
  if (!last) return null;

  // ---- trend (same formula as the 24h engine) ----
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  let trendScore = null;
  if (ema20 != null && ema50 != null) {
    const fastVsSlow = (ema20 - ema50) / ema50;
    const priceVsSlow = (last - ema50) / ema50;
    trendScore = tanh((fastVsSlow * 0.6 + priceVsSlow * 0.4) * PARAMS.trendScale);
  }

  // ---- momentum: RSI + MACD (same blend as the 24h engine) ----
  const rsiV = rsi(closes, PARAMS.rsiPeriod);
  const rsiPrev = rsiAt(closes, PARAMS.rsiPeriod, PARAMS.rsiLookback);
  const macdV = macd(closes, PARAMS.macdFast, PARAMS.macdSlow, PARAMS.macdSignal);
  let momScore = null;
  if (rsiV != null) {
    const rScore = clamp((rsiV - 50) / PARAMS.rsiDivisor);
    let mScore = 0;
    if (macdV) mScore = clamp(tanh((macdV.hist / (PARAMS.macdScale * last)) || 0));
    momScore = clamp(rScore * PARAMS.momentumRsiWeight + mScore * PARAMS.momentumMacdWeight);
  }
  // Is momentum rising on THIS timeframe? RSI slope or MACD histogram slope.
  const rsiUp = rsiPrev != null && rsiV != null && rsiV > rsiPrev;
  const macdUp = macdV && macdV.prevHist != null && macdV.hist > macdV.prevHist;
  const momUp = rsiUp || macdUp;

  if (trendScore == null && momScore == null) return null;

  // ---- blend trend + momentum with the engine's own weights, renormalised ----
  const raw = { trend: trendScore, momentum: momScore };
  const present = Object.keys(raw).filter((k) => raw[k] != null);
  const baseSum = present.reduce((s, k) => s + WEIGHTS[k], 0);
  let composite = 0;
  present.forEach((k) => { composite += raw[k] * (WEIGHTS[k] / baseSum); });
  composite = clamp(composite);

  // ---- probability + direction (same mapping and bands as the 24h engine) ----
  const upside = Math.round(clamp(50 + composite * PARAMS.probSpread, PARAMS.probMin, PARAMS.probMax));
  const downside = 100 - upside;
  let direction, tone;
  if (upside >= PARAMS.directionBull) { direction = "Bullish"; tone = "up"; }
  else if (upside <= PARAMS.directionBear) { direction = "Bearish"; tone = "down"; }
  else { direction = "Neutral"; tone = "neutral"; }

  // ---- confidence: earned, same coefficients as the 24h engine ----
  const strength = Math.abs(composite);
  const tSign = trendScore == null ? 0 : (trendScore > 0 ? 1 : trendScore < 0 ? -1 : 0);
  const mSign = momScore == null ? 0 : (momScore > 0 ? 1 : momScore < 0 ? -1 : 0);
  let agree;
  if (tSign === 0 || mSign === 0) agree = 0.5;
  else agree = tSign === mSign ? 1 : 0;
  const sigmaPerCandle = realizedVol(closes, 24);
  const volNorm = sigmaPerCandle != null
    ? clamp(sigmaPerCandle * Math.sqrt(CANDLES_PER_DAY[interval] || 24) / PARAMS.volDailyRef, 0, 1)
    : PARAMS.volNormFallback;
  const confRaw = clamp(PARAMS.confStrengthW * strength + PARAMS.confAgreeW * agree - volNorm * PARAMS.confVolPenalty, 0, 1);
  const confidencePct = Math.round(PARAMS.confBase + confRaw * PARAMS.confSpread);
  const confidenceLabel = confidencePct > PARAMS.confHigh ? "High" : confidencePct >= PARAMS.confModerate ? "Moderate" : "Low";

  return {
    tf: interval, label: TF_LABEL[interval], short: TF_SHORT[interval],
    available: true,
    direction, tone,
    upside, downside,
    confidence: confidencePct, confidenceLabel,
    rsi: rsiV != null ? +rsiV.toFixed(1) : null,
    interpretation: buildInterpretation(TF_PHRASE[interval], trendScore, momScore, rsiV, momUp),
  };
}

// Compute all three intraday frames. 1h closes are reused from the 24h engine so
// only 15m and 4h require extra fetches. Order is always 15m, 1h, 4h.
export function computeShortTerm({ closes15m, closes1h, closes4h, price }) {
  const order = ["15m", "1h", "4h"];
  const inputs = { "15m": closes15m, "1h": closes1h, "4h": closes4h };
  const frames = order.map((tf) => frameScore(inputs[tf], price, tf) || unavailable(tf));
  return { asOf: new Date().toISOString(), frames };
}
