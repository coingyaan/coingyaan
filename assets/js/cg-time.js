/* CoinGyaan · shared time helper (cg-time.js).
   UTC is canonical: all inputs are epoch milliseconds (UTC). This helper only
   formats for PRESENTATION. Default mode is the visitor's local timezone; a
   Local/UTC toggle is persisted in localStorage. Candle/window boundaries are
   always computed in UTC upstream; here we only render the chosen timezone with a
   timezone abbreviation and correct date-boundary handling. Used by the price
   action chart, the short term signal cards and the market context section so
   every surface agrees. Emits a 'cg-tz-change' window event when the mode flips. */
(function () {
  "use strict";
  var KEY = "cg_tz";
  function mode() {
    try { var v = localStorage.getItem(KEY); return v === "utc" ? "utc" : "local"; } catch (e) { return "local"; }
  }
  function setMode(m) {
    m = m === "utc" ? "utc" : "local";
    try { localStorage.setItem(KEY, m); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent("cg-tz-change", { detail: { mode: m } })); } catch (e) { /* ignore */ }
  }
  function isUTC() { return mode() === "utc"; }
  function tz() { return isUTC() ? "UTC" : undefined; } // undefined -> browser local

  function parts(ms, opts) {
    var o = { timeZone: tz(), hourCycle: "h23" };
    for (var k in opts) o[k] = opts[k];
    try { return new Intl.DateTimeFormat(undefined, o).formatToParts(new Date(ms)); }
    catch (e) { return null; }
  }
  function get(ps, type) { if (!ps) return ""; for (var i = 0; i < ps.length; i++) if (ps[i].type === type) return ps[i].value; return ""; }

  // "14:15" (no tz) in the active mode
  function hm(ms) {
    var ps = parts(ms, { hour: "2-digit", minute: "2-digit" });
    if (!ps) return "--:--";
    return get(ps, "hour") + ":" + get(ps, "minute");
  }
  // short tz abbreviation for the active mode, e.g. "UTC", "IST", "GMT+5:30"
  function abbr(ms) {
    var ps = parts(ms, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    return get(ps, "timeZoneName") || (isUTC() ? "UTC" : "");
  }
  // "26 Aug" in the active mode (for date-boundary display)
  function md(ms) {
    var ps = parts(ms, { day: "2-digit", month: "short" });
    if (!ps) return "";
    return get(ps, "day") + " " + get(ps, "month");
  }
  // calendar day key in the active mode, for boundary detection
  function dayKey(ms) {
    var ps = parts(ms, { year: "numeric", month: "2-digit", day: "2-digit" });
    if (!ps) return "";
    return get(ps, "year") + get(ps, "month") + get(ps, "day");
  }
  // "14:15 UTC" or "19:45 IST"
  function stamp(ms) { return hm(ms) + " " + abbr(ms); }
  // "14:15 → 14:30 UTC", or with dates when the window crosses a calendar day
  function fmtWindow(startMs, endMs) {
    var a = abbr(startMs);
    if (dayKey(startMs) === dayKey(endMs)) return hm(startMs) + " \u2192 " + hm(endMs) + " " + a;
    return md(startMs) + " " + hm(startMs) + " \u2192 " + md(endMs) + " " + hm(endMs) + " " + a;
  }
  // axis / tooltip helpers used by the chart (msOrSec tolerant)
  function toMs(t) { return t > 1e12 ? t : t * 1000; }
  function axis(t, intraday) { var ms = toMs(t); return intraday ? hm(ms) : md(ms); }
  function dateTime(t) { var ms = toMs(t); return md(ms) + " " + hm(ms) + " " + abbr(ms); }

  // floor `now` to an interval in UTC (candle boundary), returns epoch ms
  function floorUTC(nowMs, intervalMs) { return Math.floor(nowMs / intervalMs) * intervalMs; }

  window.CGTime = {
    mode: mode, setMode: setMode, isUTC: isUTC,
    hm: hm, abbr: abbr, md: md, stamp: stamp, window: fmtWindow,
    axis: axis, dateTime: dateTime, dayKey: dayKey, floorUTC: floorUTC
  };
})();
