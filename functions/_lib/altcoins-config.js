// CoinGyaan · Altcoins engine config
// The Altcoin Season Index is the share of the top coins that outperformed
// Bitcoin over the window. Thresholds and exclusions live here.

export const PARAMS = {
  topN: 50, // top coins by rank, after exclusions
  window: "30d", // performance window used (CoinPaprika exposes 30d at the edge)
  seasonHigh: 75, // index >= this: Altcoin Season
  expandMid: 50, // index >= this: alts expanding
  compressLow: 25, // index < this: Bitcoin Season
  domTrendBand: 0.2, // dominance move under this (points) reads Steady
  moversCount: 5, // top movers shown on the hub
};

// Stablecoins and wrapped/pegged assets are excluded from the season count so
// the index reflects real altcoin performance, not pegs.
export const EXCLUDE = new Set([
  "BTC",
  "USDT", "USDC", "DAI", "BUSD", "TUSD", "USDD", "FDUSD", "PYUSD", "USDE", "GUSD", "USDP", "FRAX", "LUSD",
  "WBTC", "WETH", "WBETH", "STETH", "WSTETH", "RETH", "WEETH", "CBETH", "BTCB",
]);

export const REFRESH = {
  ttlSeconds: 600, // alts move slower than price; 10 min fresh window
  staleSeconds: 3600,
  lockSeconds: 120,
  kvKey: "altcoins:v1",
  lockKey: "altcoins:lock",
};
