// CoinGyaan · Open Interest engine config
// Aggregate OI is summed across venues (USD). The 24h change is measured on the
// deepest venue history (Bybit, then OKX) so it is a real delta, not a guess.

export const PARAMS = {
  steadyBand: 1.0, // |24h change| below this percent reads Steady
  buildingBand: 3.0, // at or above this, a strong build or unwind
  barCount: 6, // recent points shown as bars on the card
};

export const REFRESH = {
  symbol: "BTCUSDT",
  okxInst: "BTC-USDT-SWAP",
  hlCoin: "BTC",
  historyInterval: "1h",
  historyLimit: 25, // ~24h of hourly points
  ttlSeconds: 300,
  staleSeconds: 900,
  lockSeconds: 90,
  kvKey: "oi:v1",
  lockKey: "oi:lock",
};
