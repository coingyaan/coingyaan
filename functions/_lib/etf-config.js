// CoinGyaan · ETF Flows engine config (SoSoValue Open API)
// Endpoints, request params, the ETF Flow Signal thresholds, the etfNet
// definition and cache timings live here, not in the engine. Nothing is
// fabricated: the ETF universe and every value come from the live API.

export const SOSO = {
  base: "https://openapi.sosovalue.com/api/v1",
  keyEnv: "SOSOVALUE_API_KEY", // server-side Cloudflare secret, never sent to the browser
  symbol: "BTC",
  countryCode: "US",
  historyLimit: 300, // summary-history returns at most 300 records per call
};

// ETF Flow Signal thresholds. Fully transparent and documented on the page.
// All flow figures below are aggregate daily net inflow in USD millions ($m).
// The blended score is:
//   score = wLevel*avg5d + wContext*avg20d + wMomentum*(avg5d - avgPrior5d)   [in $m]
// then banded:  >= strongBull Strongly Bullish, >= bull Bullish,
//               <= strongBear Strongly Bearish, <= bear Bearish, else Neutral.
export const SIGNAL = {
  wLevel: 0.5,     // recent 5 day average daily net flow
  wContext: 0.3,   // 20 day average daily net flow (persistence)
  wMomentum: 0.2,  // acceleration: recent 5d average vs the prior 5d average
  bull: 60,        // blended score at or above this reads Bullish ($m)
  strongBull: 250, // and Strongly Bullish at or above this
  bear: -60,       // at or below this reads Bearish
  strongBear: -250,// and Strongly Bearish at or below this
  momentumBand: 40,// |recent5d - prior5d| below this reads Stable momentum
};

// etfNet feed into the Bitcoin engine:
//   etfNet = 5 day average daily aggregate net inflow / 1,000,000   (USD millions)
// The existing engine then applies:  etfScore = tanh(etfNet / etfScale)  with
// etfScale 300 and weight 0.12. Those existing values are NOT changed here.
export const ETF_NET = { smoothDays: 5 };

export const REFRESH = {
  kvKey: "etf:btc:v1",
  lockKey: "etf:btc:lock",
  // ETF data updates about once per trading day, so refresh slowly and stay
  // comfortably inside SoSoValue's 20 requests/min Demo limit.
  ttlSeconds: 3600, // serve fresh for 1 hour
  staleSeconds: 21600, // serve stale up to 6 hours while refreshing in background
  refetchSeconds: 3600, // hard throttle: cron may call often, but skip refetch if KV is younger than this
  lockSeconds: 120,
  priceSymbol: "BTCUSDT", // daily BTC closes for the price vs flows overlay
  priceDays: 260,
};
