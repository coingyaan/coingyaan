// GET /api/btc-candles -> genuine BTC OHLC for 15m/1h/4h/1d (CoinGyaan primary).
// Read-only price action layer for the Outlook chart. Edge-cached so public
// traffic does not create upstream requests as it grows.
import { readCandles } from "../_lib/candles-cache.js";

export async function onRequest(context) {
  const { env, ctx } = context;
  const data = await readCandles(env, ctx);
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}
