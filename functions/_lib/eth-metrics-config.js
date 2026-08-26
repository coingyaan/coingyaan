// CoinGyaan · Ethereum network metrics config
// Gas from a public Ethereum RPC, TVL and DeFi dominance from DefiLlama.

export const PARAMS = {
  gasLow: 8, // gwei below this reads Low
  gasHigh: 25, // gwei above this reads Elevated
  tvlWindowDays: 7, // lookback for the TVL trend
  tvlFlatBand: 0.5, // percent change under this reads Flat
};

export const REFRESH = {
  ttlSeconds: 1800,
  refetchSeconds: 1740, // gas moves fast; 5 min fresh window
  staleSeconds: 3600,
  lockSeconds: 90,
  kvKey: "eth-metrics:v1",
  lockKey: "eth-metrics:lock",
};
