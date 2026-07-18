// CoinGyaan Outlook cron worker.
// scheduled(): fires every 5 min, pings the Pages refresh endpoint.
// fetch(): /run lets you trigger it manually for testing.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/run") {
      const r = await ping(env);
      return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
    }
    return new Response("coingyaan-outlook-cron ok\n");
  },
};

async function ping(env) {
  try {
    const res = await fetch(`${env.REFRESH_URL}?key=${env.REFRESH_KEY}`, { method: "POST" });
    return { ok: res.ok, status: res.status, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
