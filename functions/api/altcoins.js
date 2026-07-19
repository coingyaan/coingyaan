// GET /api/altcoins  (public, cached, stale-while-revalidate)
import { readAltcoins } from "../_lib/altcoins-cache.js";

export async function onRequestGet(context) {
  const { env } = context;
  let payload;
  try {
    payload = await readAltcoins(env, context);
  } catch (e) {
    payload = { asOf: new Date().toISOString(), status: "error", source: "coingyaan-altcoins-v1", data: null, error: String(e) };
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
}
