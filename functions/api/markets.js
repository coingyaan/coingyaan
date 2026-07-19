// GET /api/markets  (public, cached ticker data)
import { readMarkets } from "../_lib/markets-cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readMarkets(env, context);
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-markets-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
}
