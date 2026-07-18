// GET /api/bitcoin-outlook
// Public, read-only. Serves the cached outlook (stale-while-revalidate).
import { readOutlook } from "../_lib/cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readOutlook(env, context); // context provides waitUntil
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-outlook-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
}
