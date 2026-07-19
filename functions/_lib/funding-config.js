// CoinGyaan · Funding Rate engine config
// Thresholds for bias and crowding live here, not in the engine.
// All rates are 8 hour funding expressed as a fraction (0.0001 = 0.01%).

export const PARAMS = {
  neutralBand: 0.00003, // |rate| below this reads Neutral (about 0.003% / 8h)
  crowdedLong: 0.0004, // at or above this, longs look crowded (about 0.04% / 8h)
  crowdedShort: -0.0004, // at or below this, shorts look crowded
  splitScale: 6000, // maps rate to the green/red tilt bar via tanh
  annualFactor: 1095, // 3 funding windows per day * 365 days
};

export const REFRESH = {
  symbol: "BTCUSDT",
  hlCoin: "BTC",
  okxInst: "BTC-USDT-SWAP",
  ttlSeconds: 300,
  staleSeconds: 900,
  lockSeconds: 90,
  kvKey: "funding:v1",
  lockKey: "funding:lock",
};
