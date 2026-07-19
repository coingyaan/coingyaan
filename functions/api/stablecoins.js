// GET /api/stablecoins  (public, cached, stale-while-revalidate)
import { readStablecoins } from "../_lib/stablecoins-cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readStablecoins(env, context);
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-stablecoins-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}
