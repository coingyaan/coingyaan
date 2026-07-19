// GET /api/eth-metrics  (public, cached, stale-while-revalidate)
import { readEthMetrics } from "../_lib/eth-metrics-cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readEthMetrics(env, context);
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-eth-metrics-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=45",
      "access-control-allow-origin": "*",
    },
  });
}
