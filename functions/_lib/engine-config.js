// CoinGyaan · Bitcoin Outlook Engine — tuning configuration
// Everything you would experiment with lives here. The engine reads these and
// never hardcodes a weight or threshold, so you can tune Trend, RSI, MACD,
// Funding, OI, Volatility etc. and compare against real outcomes without
// touching engine logic.

// Directional signal weights. ETF is defined but absent in v1 (no free daily
// feed wired yet); its weight redistributes automatically across present signals.
export const WEIGHTS = {
  trend: 0.28,
  momentum: 0.22, // RSI + MACD blended
  funding: 0.14,
  oi: 0.14,
  etf: 0.12,
  fng: 0.10,
};

export const PARAMS = {
  // trend
  trendScale: 30, // higher = trend reacts harder to MA separation

  // momentum
  rsiPeriod: 14,
  rsiLookback: 3, // candles back, for "improving" detection
  rsiDivisor: 25, // (rsi-50)/divisor -> score
  macdFast: 12, macdSlow: 26, macdSignal: 9,
  macdScale: 0.002, // hist normalised by macdScale * price
  momentumRsiWeight: 0.6,
  momentumMacdWeight: 0.4,

  // funding (8h rate as fraction). Mild positive = supportive; extreme = crowding reversal
  fundingUnit: 0.0002, // ~0.02% 8h maps to score 1.0
  fundingCrowdSlope: 1.4,

  // open interest (24h % change vs price direction)
  oiScale: 8,
  oiFallingDamp: 0.4, // falling OI = unwinding, weaker signal

  // etf (v1 absent)
  etfScale: 300, // net flow $m mapped through tanh

  // fear & greed
  fngDivisor: 40, // (value-50)/divisor

  // volatility
  volWindow: 24, // hourly candles
  volDailyRef: 0.06, // daily sigma that maps to volNorm = 1
  volNormFallback: 0.4,

  // probability mapping
  probSpread: 35, // composite [-1,1] -> +/- points around 50
  probMin: 15, probMax: 85,

  // direction bands (on upside probability)
  directionBull: 55, directionBear: 45, stanceStrong: 12,

  // confidence (earned)
  confStrengthW: 0.45, confAgreeW: 0.55, confVolPenalty: 0.25,
  confBase: 15, confSpread: 70, confAgreeMinAbs: 0.05,
  confHigh: 70, confModerate: 45,

  // risk
  riskVolW: 0.55, riskFundW: 0.30, riskOiW: 0.15,
  riskFundRef: 0.0005, riskOiRef: 15,
  riskHigh: 0.66, riskMedium: 0.33,

  // market condition thresholds
  condRecoveryTrend: -0.08, condRecoveryVol: 0.6,
  condRangingTrend: 0.15, condRangingVol: 0.45,
  condTrendUp: 0.35, condTrendDown: -0.35,
  condRiskoffVol: 0.66,

  // reasons + range
  reasonsMax: 4,
  rangeFallbackVol: 0.025,
};

// refresh / cache behaviour
export const REFRESH = {
  symbol: "BTCUSDT", // Binance/Bybit perp symbol
  hlCoin: "BTC", // Hyperliquid coin name
  coinId: "bitcoin", // CoinGecko id (price fallback)
  klineInterval: "1h",
  klineLimit: 200,
  ttlSeconds: 300, // 5 min: below this, cache is "fresh"
  refetchSeconds: 240, // FAST tier: BTC flagship refetches ~every 5 min cron tick
  staleSeconds: 1800, // above this, force a synchronous refresh on read
  lockSeconds: 90, // refresh lock TTL to avoid stampede
  kvKey: "outlook:btc:v1",
  lockKey: "outlook:btc:lock",
};

// Per-asset overrides. Shared timings and kline settings come from REFRESH; each
// asset supplies its own symbols and cache keys. BTC values match REFRESH exactly
// so the existing Bitcoin outlook is untouched.
export const ASSETS = {
  btc: { symbol: "BTCUSDT", hlCoin: "BTC", coinId: "bitcoin", kvKey: "outlook:btc:v1", lockKey: "outlook:btc:lock" },
  eth: { symbol: "ETHUSDT", hlCoin: "ETH", coinId: "ethereum", kvKey: "outlook:eth:v1", lockKey: "outlook:eth:lock", refetchSeconds: 840, ttlSeconds: 900, staleSeconds: 2700 }, // MEDIUM 15m
  sol: { symbol: "SOLUSDT", hlCoin: "SOL", coinId: "solana", kvKey: "outlook:sol:v1", lockKey: "outlook:sol:lock", refetchSeconds: 840, ttlSeconds: 900, staleSeconds: 2700 }, // MEDIUM 15m
};
