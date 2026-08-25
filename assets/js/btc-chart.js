/* CoinGyaan · Bitcoin price action chart (/bitcoin-outlook/).
   Original CoinGyaan native candlestick chart. Selectable 15m | 1h | 4h | 24h.
   The chart is the PRICE ACTION layer (genuine OHLC from the CoinGyaan primary
   chain). The compact panel beside it is the INTELLIGENCE layer: it surfaces the
   EXISTING CoinGyaan signal for the selected timeframe, unchanged, with the exact
   UTC window it refers to. No recalculation, no buy/sell/target markers, no advice
   language. Intelligence interprets price action; it is not an entry or exit call. */
(function () {
  "use strict";
  var CANDLES_API = "/api/btc-candles";
  var OUTLOOK_API = "/api/bitcoin-outlook";
  var GREEN = "#16c784", RED = "#ea3943", GOLD = "#f59e0b", MUTE = "#94a3b8", DIM = "#64748b", GRID = "rgba(148,163,184,.12)";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var TF_INTERVAL = { "15m": "15m", "1h": "1h", "4h": "4h", "24h": "1d" };
  var TF_MS = { "15m": 900000, "1h": 3600000, "4h": 14400000 };
  var state = { tf: "1h", candles: null, outlook: null };

  function q(s) { return document.querySelector('[data-cg="' + s + '"]'); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function utcHM(ms) { var d = new Date(ms); return pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()); }
  function utcDay(ms) { var d = new Date(ms); return pad2(d.getUTCDate()) + " " + MONTHS[d.getUTCMonth()]; }
  function money(n) { return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 2 }); }
  function age(s) { if (s == null) return "just now"; if (s < 60) return "just now"; var m = Math.round(s / 60); if (m < 60) return m + "m ago"; var h = Math.round(m / 60); if (h < 24) return h + "h ago"; return Math.round(h / 24) + "d ago"; }
  function dirTone(dir) { var d = (dir || "").toLowerCase(); if (d.indexOf("bull") >= 0) return GREEN; if (d.indexOf("bear") >= 0) return RED; return GOLD; }

  function boot() {
    if (!q("bc-chart")) return;
    Promise.all([
      fetch(CANDLES_API).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(OUTLOOK_API, { headers: { accept: "application/json" } }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (res) {
      state.candles = res[0]; state.outlook = res[1];
      wireSelector();
      renderAll();
      window.addEventListener("resize", debounce(drawChart, 150));
      setInterval(renderIntel, 20000); // keep window + updated labels live
      setInterval(refetch, 60000);     // refresh data quietly
    });
  }

  function refetch() {
    Promise.all([
      fetch(CANDLES_API).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(OUTLOOK_API, { headers: { accept: "application/json" } }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (res) { if (res[0]) state.candles = res[0]; if (res[1]) state.outlook = res[1]; renderAll(); });
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function wireSelector() {
    var wrap = q("bc-tabs"); if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var tf = b.getAttribute("data-tf"); if (!tf || tf === state.tf) return;
      state.tf = tf;
      var kids = wrap.querySelectorAll("button");
      for (var i = 0; i < kids.length; i++) kids[i].classList.toggle("on", kids[i] === b);
      renderAll();
    });
  }

  function renderAll() { drawChart(); renderIntel(); }

  function series() {
    var c = state.candles; if (!c || !c.tf) return null;
    var slot = c.tf[TF_INTERVAL[state.tf]];
    return slot && slot.candles && slot.candles.length ? slot.candles : null;
  }

  function drawChart() {
    var host = q("bc-chart"); if (!host) return;
    var rows = series();
    if (!rows) { host.innerHTML = '<div class="bc-empty">Price data is temporarily unavailable.</div>'; return; }
    var W = Math.max(300, host.clientWidth || 760), mobile = W < 560, H = mobile ? 300 : 380;
    var padL = 8, padR = 62, padT = 12, padB = 26, plotW = W - padL - padR, plotH = H - padT - padB;
    var n = rows.length;
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < n; i++) { if (rows[i][3] < lo) lo = rows[i][3]; if (rows[i][2] > hi) hi = rows[i][2]; }
    var padp = (hi - lo) * 0.06 || hi * 0.01; lo -= padp; hi += padp;
    var slot = plotW / n, bw = Math.max(1, Math.min(slot * 0.66, 16));
    var xC = function (i) { return padL + i * slot + slot / 2; };
    var yP = function (p) { return padT + (1 - (p - lo) / (hi - lo)) * plotH; };

    var grid = "", LN = 4, k;
    for (k = 0; k <= LN; k++) {
      var gp = lo + (k / LN) * (hi - lo), gy = yP(gp);
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + gy.toFixed(1) + '" stroke="' + GRID + '" stroke-width="1"/>';
      grid += '<text x="' + (W - padR + 6) + '" y="' + (gy + 3).toFixed(1) + '" fill="' + MUTE + '" font-size="10">' + money(gp) + '</text>';
    }
    var isIntraday = state.tf !== "24h";
    var picks = [0, Math.floor((n - 1) / 3), Math.floor(2 * (n - 1) / 3), n - 1], xl = "";
    picks.forEach(function (i) {
      var anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
      var lab = isIntraday ? utcHM(rows[i][0]) : utcDay(rows[i][0]);
      xl += '<text x="' + xC(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor + '" fill="' + MUTE + '" font-size="10">' + lab + '</text>';
    });

    var candles = "";
    for (i = 0; i < n; i++) {
      var o = rows[i][1], h = rows[i][2], l = rows[i][3], c = rows[i][4], up = c >= o, col = up ? GREEN : RED;
      var x = xC(i), yO = yP(o), yC = yP(c), yH = yP(h), yL = yP(l);
      var top = Math.min(yO, yC), bh = Math.max(1, Math.abs(yC - yO));
      candles += '<line x1="' + x.toFixed(1) + '" y1="' + yH.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + yL.toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>';
      candles += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + col + '"/>';
    }

    var last = rows[n - 1], lastC = last[4], lastUp = lastC >= last[1], lc = lastUp ? GREEN : RED, ly = yP(lastC);
    var marker = '<line x1="' + padL + '" y1="' + ly.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + ly.toFixed(1) + '" stroke="' + lc + '" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>' +
      '<rect x="' + (W - padR) + '" y="' + (ly - 8).toFixed(1) + '" width="' + (padR - 2) + '" height="16" rx="3" fill="' + lc + '"/>' +
      '<text x="' + (W - padR / 2 - 1) + '" y="' + (ly + 3.5).toFixed(1) + '" text-anchor="middle" fill="#0b1120" font-size="10" font-weight="700">' + money(lastC) + '</text>';

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Bitcoin ' + state.tf + ' candlestick chart">' +
      grid + xl + candles + marker +
      '<g data-cg="bc-cross" style="display:none"><line stroke="' + MUTE + '" stroke-width="1" stroke-dasharray="3 3"></line></g>' +
      '<rect data-cg="bc-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent" style="cursor:crosshair"></rect>' +
      '</svg>';
    wireHover(host, { W: W, padL: padL, padT: padT, plotW: plotW, plotH: plotH, n: n, xC: xC, slot: slot, rows: rows, intraday: isIntraday });
  }

  function wireHover(host, g) {
    var svg = host.querySelector("svg"), hit = host.querySelector('[data-cg="bc-hit"]'), cross = host.querySelector('[data-cg="bc-cross"]'), tip = q("bc-tip");
    if (!svg || !hit || !cross || !tip) return;
    function locate(clientX) { var r = svg.getBoundingClientRect(); var x = (clientX - r.left) * (g.W / r.width); return Math.max(0, Math.min(g.n - 1, Math.floor((x - g.padL) / g.slot))); }
    function show(clientX) {
      var i = locate(clientX), row = g.rows[i], cx = g.xC(i);
      var ln = cross.querySelector("line"); ln.setAttribute("x1", cx); ln.setAttribute("x2", cx); ln.setAttribute("y1", g.padT); ln.setAttribute("y2", g.padT + g.plotH);
      cross.style.display = "";
      var o = row[1], h = row[2], l = row[3], c = row[4], up = c >= o, chg = o ? ((c - o) / o) * 100 : 0;
      var when = g.intraday ? (utcDay(row[0]) + " " + utcHM(row[0]) + " UTC") : (utcDay(row[0]) + " UTC");
      tip.hidden = false;
      tip.innerHTML = '<div class="bc-tip-t">' + when + '</div>' +
        '<div class="bc-tip-r"><span>O</span><b>' + money(o) + '</b><span>H</span><b>' + money(h) + '</b></div>' +
        '<div class="bc-tip-r"><span>L</span><b>' + money(l) + '</b><span>C</span><b>' + money(c) + '</b></div>' +
        '<div class="bc-tip-r"><span>Change</span><b style="color:' + (up ? GREEN : RED) + '">' + (chg >= 0 ? "+" : "") + chg.toFixed(2) + '%</b></div>';
      var wrap = host.parentElement, ww = wrap.clientWidth, tw = tip.offsetWidth || 150, r = svg.getBoundingClientRect(), sx = cx / (g.W / r.width);
      tip.style.left = Math.max(4, Math.min(ww - tw - 4, sx - tw / 2)) + "px";
    }
    function hide() { cross.style.display = "none"; tip.hidden = true; }
    hit.addEventListener("mousemove", function (e) { show(e.clientX); });
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", function (e) { if (e.touches[0]) show(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchmove", function (e) { if (e.touches[0]) show(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchend", hide);
  }

  function renderIntel() {
    var host = q("bc-intel"); if (!host) return;
    var o = state.outlook, tf = state.tf;
    var dir, upside, confLabel, avail = true;
    if (tf === "24h") {
      if (!o || o.upsideProbability == null) avail = false;
      else { dir = o.direction; upside = o.upsideProbability; confLabel = o.confidenceLabel; }
    } else {
      var fr = o && o.shortTerm && o.shortTerm.frames ? o.shortTerm.frames.filter(function (f) { return f.tf === tf; })[0] : null;
      if (!fr || !fr.available) avail = false;
      else { dir = fr.direction; upside = fr.upside; confLabel = fr.confidenceLabel; }
    }
    var updated = o ? age(o.ageSeconds) : "just now";
    if (!avail) { host.innerHTML = '<div class="bc-intel-line">CoinGyaan intelligence for ' + tf + ' is not available right now.</div>'; return; }

    var head = '<span class="bc-tf">' + tf + '</span><span class="bc-dot" style="background:' + dirTone(dir) + '"></span>' +
      '<b style="color:' + dirTone(dir) + '">' + esc(dir) + '</b>' +
      '<span class="bc-sep">' + upside + '% upside</span>' +
      '<span class="bc-sep">' + esc(confLabel) + ' confidence</span>';
    var when;
    if (tf === "24h") {
      when = '<span class="bc-asof">As of \u00b7 ' + utcHM(Date.now()) + ' UTC</span><span class="bc-hz">Horizon \u00b7 Next 24 hours</span>';
    } else {
      var ms = TF_MS[tf], start = Math.floor(Date.now() / ms) * ms;
      when = '<span class="bc-asof">As of \u00b7 ' + utcHM(start) + ' UTC</span><span class="bc-hz">Signal window \u00b7 ' + utcHM(start) + ' \u2192 ' + utcHM(start + ms) + ' UTC</span>';
    }
    host.innerHTML =
      '<div class="bc-intel-line">' + head + '</div>' +
      '<div class="bc-intel-when">' + when + '<span class="bc-upd">Updated ' + updated + '</span></div>' +
      '<div class="bc-intel-note">Price action is what Bitcoin is doing. This is how the CoinGyaan model reads that action for the ' + tf + ' timeframe. It is not an entry or exit signal.</div>';
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
