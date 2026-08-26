// CoinGyaan · Stablecoins engine config
// Supply trend and net mint/burn from DefiLlama total supply history; dominance
// from per-coin circulating. Liquidity outlook is our interpretation.

export const PARAMS = {
  windowDays: 7, // lookback for supply trend and net mint/burn
  windowLabel: "7 days",
  expandBand: 0.3, // percent change over window above this reads Expanding
  topN: 6, // stablecoins shown on the hub table
};

export const REFRESH = {
  ttlSeconds: 1800,
  refetchSeconds: 1740, // supply moves slowly; 15 min fresh window
  staleSeconds: 3600,
  lockSeconds: 120,
  kvKey: "stablecoins:v1",
  lockKey: "stablecoins:lock",
};
