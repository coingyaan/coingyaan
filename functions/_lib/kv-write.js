// CoinGyaan · KV write efficiency helpers (kv-write.js). Additive infrastructure.
// Two safeguards used by the refresh path so CoinGyaan stays read heavy and writes
// efficiently. Neither changes any intelligence value, methodology or data source.
//
// 1) staleEnough(env, key, refetchSeconds): tiered cadence gate. The cron still
//    fires every 5 minutes, but a module only refetches and writes when its own KV
//    key is older than its cadence. Fail-open: on missing value, parse error or any
//    failure it returns true (refresh), never suppressing a needed refresh.
// 2) putIfChanged(env, key, obj): compare-and-skip. Skips the write only when the
//    SEMANTIC payload is identical, ignoring volatile fields (asOf, ageSeconds,
//    status and similar refresh metadata) that would otherwise force false writes.
//    Fail-open: on any read/parse/compare failure it writes, preferring a fresh
//    write over risking stale production data.

const VOLATILE = ["asOf", "ageSeconds", "status", "updatedAt", "generatedAt", "refreshedAt", "fetchedAt", "lastChecked", "ts"];

function stripVolatile(o, extra) {
  if (!o || typeof o !== "object") return o;
  var drop = extra && extra.length ? VOLATILE.concat(extra) : VOLATILE;
  var out = {};
  for (var k in o) if (drop.indexOf(k) === -1) out[k] = o[k];
  return out;
}

// deterministic stringify with recursively sorted keys, so key order never causes a false diff
function stable(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  var keys = Object.keys(v).sort();
  return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + stable(v[k]); }).join(",") + "}";
}

function semanticEqual(a, b, extra) {
  try { return stable(stripVolatile(a, extra)) === stable(stripVolatile(b, extra)); }
  catch (e) { return false; } // fail-open: treat as different -> write
}

export function ageSeconds(obj) {
  try { return obj && obj.asOf ? (Date.now() - Date.parse(obj.asOf)) / 1000 : Infinity; }
  catch (e) { return Infinity; }
}

export async function staleEnough(env, key, refetchSeconds) {
  if (!refetchSeconds) return true;
  try {
    var raw = await env.OUTLOOK_KV.get(key);
    if (!raw) return true;
    var age = ageSeconds(JSON.parse(raw));
    return age >= refetchSeconds;
  } catch (e) { return true; } // fail-open: refresh
}

export async function putIfChanged(env, key, obj, opts) {
  opts = opts || {};
  try {
    var prevRaw = await env.OUTLOOK_KV.get(key);
    if (prevRaw) {
      var prev = JSON.parse(prevRaw);
      if (semanticEqual(prev, obj, opts.volatile)) return { written: false, reason: "unchanged" };
    }
  } catch (e) { /* fail-open: fall through and write */ }
  try { await env.OUTLOOK_KV.put(key, JSON.stringify(obj), opts.putOptions); return { written: true }; }
  catch (e) { return { written: false, error: String(e) }; }
}
