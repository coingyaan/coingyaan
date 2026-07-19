// GET /api/open-interest  (public, cached, stale-while-revalidate)
import { readOpenInterest } from "../_lib/oi-cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readOpenInterest(env, context);
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-oi-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
}
