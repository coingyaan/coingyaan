// /api/refresh?key=SECRET   (POST or GET)
// Protected. Forces a recompute and writes KV. Called by the cron worker.
import { refreshOutlook } from "../_lib/cache.js";

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-refresh-key");

  if (!env.REFRESH_KEY || key !== env.REFRESH_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  try {
    const r = await refreshOutlook(env);
    return json(r, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
