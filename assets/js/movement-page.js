/* CoinGyaan · /bitcoin-outlook/ Bitcoin 7 day movement chart.
   Historical, descriptive. Continuous hourly BTC price across the full 7 day
   window from two independent sources: CoinGyaan reference (dominant, gold, area
   fill) and Hyperliquid reference (secondary, blue). The standardized 06:00 UTC
   daily references are marked on the line. Interactive crosshair on hover and tap.
   Never a prediction. Independent of the outlook. No interpolated or fake data. */
(function () {
  "use strict";
  var API = "/api/btc-7d";
  var CG = "#f59e0b", HL = "#60a5fa", GREEN = "#16c784", RED = "#ea3943", MUTE = "#94a3b8", GRID = "rgba(148,163,184,.14)", REF = "rgba(245,158,11,.28)";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var state = null;

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function fmtUsd(n, dp) { return n == null ? "n/a" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function fmtPct(n) { return n == null ? "n/a" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
  function fmtDiff(n) { return n == null ? "n/a" : (n >= 0 ? "+$" : "-$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
  function col(n) { return n == null ? MUTE : n > 0 ? GREEN : n < 0 ? RED : MUTE; }
  function fmtTs(t) { var d = new Date(t); return String(d.getUTCDate()).padStart(2, "0") + " " + MONTHS[d.getUTCMonth()] + " " + String(d.getUTCHours()).padStart(2, "0") + ":00 UTC"; }

  function boot() {
    fetch(API).then(function (r) { return r.json(); }).then(function (p) {
      if (!p || p.available === false || !p.series || p.series.length < 2) return empty();
      fill(p);
      var refPct = {};
      (p.points || []).forEach(function (pt) { if (pt.cgPctFromPrev != null) refPct[pt.ts] = pt.cgPctFromPrev; });
      state = { p: p, refPct: refPct };
      draw();
      window.addEventListener("resize", debounce(draw, 150));
    }).catch(empty);
  }

  function empty() {
    var e = q("mv-empty"), w = document.querySelector(".mv-chart-wrap");
    if (e) { e.hidden = false; e.textContent = "7 day movement data is temporarily unavailable."; }
    if (w) w.style.display = "none";
  }

  function fill(p) {
    var chg = q("mv-chg"); if (chg) { chg.textContent = fmtPct(p.cg7dChangePct); chg.style.color = col(p.cg7dChangePct); }
    var hi = q("mv-high"); if (hi) hi.textContent = fmtUsd(p.high7d);
    var lo = q("mv-low"); if (lo) lo.textContent = fmtUsd(p.low7d);
    var cgc = q("mv-cg-chg"); if (cgc) { cgc.textContent = fmtPct(p.cg7dChangePct); cgc.style.color = col(p.cg7dChangePct); }
    var hlc = q("mv-hl-chg");
    if (hlc) { if (p.hlAvailable) { hlc.textContent = fmtPct(p.hl7dChangePct); hlc.style.color = col(p.hl7dChangePct); } else { hlc.textContent = "unavailable"; hlc.style.color = MUTE; } }
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function draw() {
    if (!state) return;
    var host = q("mv-chart"); if (!host) return;
    var p = state.p, s = p.series, n = s.length;
    var W = Math.max(300, host.clientWidth || 760);
    var mobile = W < 560;
    var H = mobile ? 260 : 330;
    var padL = 54, padR = 14, padT = 16, padB = 30;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var vals = [];
    for (var k = 0; k < n; k++) { if (s[k].cg != null) vals.push(s[k].cg); if (s[k].hl != null) vals.push(s[k].hl); }
    if (vals.length < 2) return empty();
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var pad = (max - min) * 0.06 || max * 0.01; min -= pad; max += pad;
    var xOf = function (i) { return padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW); };
    var yOf = function (v) { return padT + (1 - (v - min) / (max - min)) * plotH; };

    var grid = "", LN = 4;
    for (var g = 0; g <= LN; g++) {
      var gv = min + (g / LN) * (max - min), gy = yOf(gv);
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="' + GRID + '" stroke-width="1"/>';
      grid += '<text x="' + (padL - 8) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" fill="' + MUTE + '" font-size="10">$' + Math.round(gv).toLocaleString("en-US") + '</text>';
    }

    var refIdx = [];
    for (var r = 0; r < n; r++) if (s[r].ref) refIdx.push(r);
    var ticks = refIdx.map(function (i) {
      return '<line x1="' + xOf(i).toFixed(1) + '" y1="' + padT + '" x2="' + xOf(i).toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="' + REF + '" stroke-width="1" stroke-dasharray="2 4"/>';
    }).join("");
    var labelPick = refIdx.length <= 4 ? refIdx : [refIdx[0], refIdx[Math.floor(refIdx.length / 2)], refIdx[refIdx.length - 1]];
    var xl = labelPick.map(function (i) {
      var anchor = i === refIdx[0] ? "start" : i === refIdx[refIdx.length - 1] ? "end" : "middle";
      var d = new Date(s[i].t);
      return '<text x="' + xOf(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + anchor + '" fill="' + MUTE + '" font-size="10">' + String(d.getUTCDate()).padStart(2, "0") + " " + MONTHS[d.getUTCMonth()] + '</text>';
    }).join("");

    var cgPath = pathFor(s, "cg", xOf, yOf);
    var hlPath = pathFor(s, "hl", xOf, yOf);
    var area = areaFor(s, "cg", xOf, yOf, padT + plotH);
    var refDots = refIdx.map(function (i) {
      return s[i].cg == null ? "" : '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + yOf(s[i].cg).toFixed(1) + '" r="3" fill="' + CG + '" stroke="#0b1120" stroke-width="1"/>';
    }).join("");

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Bitcoin 7 day price movement, hourly">' +
      '<defs><linearGradient id="mvfill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + CG + '" stop-opacity="0.20"/><stop offset="100%" stop-color="' + CG + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + ticks + xl +
      (area ? '<path d="' + area + '" fill="url(#mvfill)"/>' : '') +
      (hlPath ? '<path d="' + hlPath + '" fill="none" stroke="' + HL + '" stroke-width="1.4" opacity="0.72" stroke-linejoin="round" stroke-linecap="round"/>' : '') +
      (cgPath ? '<path d="' + cgPath + '" fill="none" stroke="' + CG + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' : '') +
      refDots +
      '<g data-cg="mv-cross" style="display:none"><line stroke="' + MUTE + '" stroke-width="1" stroke-dasharray="3 3"></line><circle r="4.5" fill="none" stroke="' + CG + '" stroke-width="2"></circle><circle r="4" fill="none" stroke="' + HL + '" stroke-width="2"></circle></g>' +
      '<rect data-cg="mv-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent" style="cursor:crosshair"></rect>' +
      '</svg>';

    state.geom = { W: W, H: H, padL: padL, padT: padT, plotW: plotW, plotH: plotH, n: n, xOf: xOf, yOf: yOf };
    wireHover();
  }

  function pathFor(s, key, xOf, yOf) {
    var d = "", pen = false;
    for (var i = 0; i < s.length; i++) {
      if (s[i][key] == null) { pen = false; continue; }
      d += (pen ? "L" : "M") + xOf(i).toFixed(1) + " " + yOf(s[i][key]).toFixed(1) + " ";
      pen = true;
    }
    return d.trim();
  }
  function areaFor(s, key, xOf, yOf, baseY) {
    var segs = [], cur = [];
    for (var i = 0; i < s.length; i++) { if (s[i][key] == null) { if (cur.length) { segs.push(cur); cur = []; } } else cur.push([xOf(i), yOf(s[i][key])]); }
    if (cur.length) segs.push(cur);
    return segs.filter(function (x) { return x.length > 1; }).map(function (seg) {
      var d = "M" + seg[0][0].toFixed(1) + " " + baseY.toFixed(1);
      seg.forEach(function (pp) { d += " L" + pp[0].toFixed(1) + " " + pp[1].toFixed(1); });
      d += " L" + seg[seg.length - 1][0].toFixed(1) + " " + baseY.toFixed(1) + " Z";
      return d;
    }).join(" ");
  }

  function wireHover() {
    var host = q("mv-chart"), svg = host.querySelector("svg");
    var hit = host.querySelector('[data-cg="mv-hit"]');
    var cross = host.querySelector('[data-cg="mv-cross"]');
    var tip = q("mv-tip");
    if (!svg || !hit || !cross || !tip) return;
    var g = state.geom, s = state.p.series, refPct = state.refPct;

    function locate(clientX) {
      var rect = svg.getBoundingClientRect();
      var scale = g.W / rect.width;
      var x = (clientX - rect.left) * scale;
      var i = Math.round((x - g.padL) / (g.plotW / Math.max(1, g.n - 1)));
      return Math.max(0, Math.min(g.n - 1, i));
    }
    function show(clientX) {
      var i = locate(clientX), d = s[i], cx = g.xOf(i);
      var ln = cross.querySelector("line"), c0 = cross.querySelectorAll("circle")[0], c1 = cross.querySelectorAll("circle")[1];
      ln.setAttribute("x1", cx); ln.setAttribute("x2", cx); ln.setAttribute("y1", g.padT); ln.setAttribute("y2", g.padT + g.plotH);
      if (d.cg != null) { c0.setAttribute("cx", cx); c0.setAttribute("cy", g.yOf(d.cg)); c0.style.display = ""; } else c0.style.display = "none";
      if (d.hl != null) { c1.setAttribute("cx", cx); c1.setAttribute("cy", g.yOf(d.hl)); c1.style.display = ""; } else c1.style.display = "none";
      cross.style.display = "";
      tip.hidden = false;
      var diff = (d.cg != null && d.hl != null) ? d.cg - d.hl : null;
      var rows =
        '<div class="mv-tip-date">' + fmtTs(d.t) + (d.ref ? ' \u00b7 reference' : '') + '</div>' +
        row("CoinGyaan", fmtUsd(d.cg), "cg") +
        row("Hyperliquid", d.hl == null ? "unavailable" : fmtUsd(d.hl), "hl") +
        row2("Difference", diff == null ? "n/a" : fmtDiff(diff), col(diff));
      if (d.ref && refPct[d.t] != null) rows += row2("From previous 06:00 ref", fmtPct(refPct[d.t]), col(refPct[d.t]));
      tip.innerHTML = rows;
      var wrap = host.parentElement, ww = wrap.clientWidth, tw = tip.offsetWidth || 190;
      var rect2 = svg.getBoundingClientRect();
      var screenX = cx / (g.W / rect2.width);
      tip.style.left = Math.max(4, Math.min(ww - tw - 4, screenX - tw / 2)) + "px";
    }
    function hide() { cross.style.display = "none"; tip.hidden = true; }

    hit.addEventListener("mousemove", function (e) { show(e.clientX); });
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", function (e) { if (e.touches[0]) show(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchmove", function (e) { if (e.touches[0]) show(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchend", hide);
  }

  function row(k, v, cls) { return '<div class="mv-tip-row"><span class="mv-k mv-k-' + cls + '">' + k + '</span><span>' + v + '</span></div>'; }
  function row2(k, v, c) { return '<div class="mv-tip-row"><span>' + k + '</span><span style="color:' + c + '">' + v + '</span></div>'; }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
