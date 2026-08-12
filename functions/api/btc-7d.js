// GET /api/btc-7d  -> cached Bitcoin 7 day movement (historical, descriptive).
// Read-only. Two independent BTC price sources sampled at 06:00 UTC daily.
import { readMovement } from "../_lib/movement-cache.js";

export async function onRequest(context) {
  const { env, ctx } = context;
  const data = await readMovement(env, ctx);
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
