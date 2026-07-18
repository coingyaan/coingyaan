// CoinGyaan · technical indicators
// Pure functions. No network. Given arrays of closes/volumes, return numbers.
// Kept deliberately small and readable so the methodology page can describe them.

export function sma(values, period) {
  if (values.length < period) return null;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i];
  return s / period;
}

export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  // seed with SMA of the first `period` values
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

// full EMA series (needed for MACD signal line)
function emaSeries(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

// Wilder's RSI
export function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// RSI a few candles back, for slope/"improving" detection
export function rsiAt(closes, period = 14, lookback = 3) {
  if (closes.length < period + 1 + lookback) return null;
  return rsi(closes.slice(0, closes.length - lookback), period);
}

// MACD(12,26,9) -> last macd line, signal line, histogram
export function macd(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return null;
  const fastE = emaSeries(closes, fast);
  const slowE = emaSeries(closes, slow);
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastE[i] != null && slowE[i] != null) macdLine[i] = fastE[i] - slowE[i];
  }
  const compact = macdLine.filter((x) => x != null);
  const sigE = emaSeries(compact, signal);
  const macdVal = compact[compact.length - 1];
  const signalVal = sigE[sigE.length - 1];
  const prevMacd = compact[compact.length - 2];
  const prevSignal = sigE[sigE.length - 2];
  return {
    macd: macdVal,
    signal: signalVal,
    hist: macdVal - signalVal,
    prevHist: prevMacd != null && prevSignal != null ? prevMacd - prevSignal : null,
  };
}

// realized volatility: stddev of log returns over the window
export function realizedVol(closes, window = 24) {
  if (closes.length < window + 1) window = closes.length - 1;
  if (window < 2) return null;
  const rets = [];
  for (let i = closes.length - window; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance); // per-candle sigma
}

// volume trend: recent avg vs prior avg, returned as a ratio - 1
export function volumeTrend(volumes, recent = 12, prior = 48) {
  if (volumes.length < recent + prior) return null;
  const r = volumes.slice(-recent);
  const p = volumes.slice(-(recent + prior), -recent);
  const ra = r.reduce((a, b) => a + b, 0) / r.length;
  const pa = p.reduce((a, b) => a + b, 0) / p.length;
  if (pa === 0) return 0;
  return ra / pa - 1;
}

export const clamp = (x, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
export const tanh = (x) => Math.tanh(x);
