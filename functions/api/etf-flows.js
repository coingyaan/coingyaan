// GET /api/etf-flows  -> cached CoinGyaan ETF Flows intelligence (SoSoValue).
// Read-only. The SoSoValue key stays server-side; only computed data is returned.
import { readETF } from "../_lib/etf-cache.js";

export async function onRequest(context) {
  const { env, ctx } = context;
  const data = await readETF(env, ctx);
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
