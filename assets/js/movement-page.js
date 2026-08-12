/* CoinGyaan · /bitcoin-outlook/ Bitcoin 7 day movement chart.
   Historical, descriptive. Two independent BTC price series sampled at 06:00 UTC:
   CoinGyaan reference (dominant) and Hyperliquid reference (secondary). Interactive
   crosshair on hover and tap. Never a prediction. Independent of the outlook. */
(function () {
  "use strict";
  var API = "/api/btc-7d";
  var CG = "#f59e0b", HL = "#60a5fa", GREEN = "#16c784", RED = "#ea3943", MUTE = "#94a3b8", GRID = "rgba(148,163,184,.16)";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var state = null; // { pts, W, H, geom }

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function fmtUsd(n, dp) { return n == null ? "n/a" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function fmtPct(n) { return n == null ? "n/a" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
  function fmtDiff(n) { return n == null ? "n/a" : (n >= 0 ? "+$" : "-$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
  function col(n) { return n == null ? MUTE : n > 0 ? GREEN : n < 0 ? RED : MUTE; }
  function dlabel(d) { var p = d.split("-"); return p[2] + " " + MONTHS[(+p[1]) - 1]; }

  function boot() {
    fetch(API).then(function (r) { return r.json(); }).then(function (p) {
      if (!p || p.available === false || !p.points || !p.points.length) return empty();
      fill(p);
      state = { p: p };
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
    var p = state.p, pts = p.points;
    var W = Math.max(280, host.clientWidth || 720);
    var mobile = W < 520;
    var H = mobile ? 240 : 300;
    var padL = 52, padR = 14, padT = 16, padB = 28;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var vals = [];
    pts.forEach(function (d) { if (d.cg != null) vals.push(d.cg); if (d.hl != null) vals.push(d.hl); });
    if (vals.length < 2) return empty();
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var pad = (max - min) * 0.08 || max * 0.01; min -= pad; max += pad;
    var n = pts.length;
    var xOf = function (i) { return padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW); };
    var yOf = function (v) { return padT + (1 - (v - min) / (max - min)) * plotH; };

    // gridlines + y labels
    var grid = "", LN = 4;
    for (var g = 0; g <= LN; g++) {
      var gv = min + (g / LN) * (max - min), gy = yOf(gv);
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="' + GRID + '" stroke-width="1"/>';
      grid += '<text x="' + (padL - 8) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" fill="' + MUTE + '" font-size="10">$' + Math.round(gv).toLocaleString("en-US") + '</text>';
    }
    // x date labels (first, middle, last)
    var xl = "";
    [0, Math.floor((n - 1) / 2), n - 1].forEach(function (i) {
      var anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
      xl += '<text x="' + xOf(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + anchor + '" fill="' + MUTE + '" font-size="10">' + dlabel(pts[i].date) + '</text>';
    });

    var cgPath = pathFor(pts, "cg", xOf, yOf);
    var hlPath = pathFor(pts, "hl", xOf, yOf);
    // area under CoinGyaan line
    var area = areaFor(pts, "cg", xOf, yOf, H - padB);

    var cgDots = markers(pts, "cg", xOf, yOf, 3.2, CG);
    var hlDots = markers(pts, "hl", xOf, yOf, 2.6, HL);

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Bitcoin 7 day price movement">' +
      grid + xl + area +
      (hlPath ? '<path d="' + hlPath + '" fill="none" stroke="' + HL + '" stroke-width="1.75" stroke-dasharray="5 4" opacity="0.9"/>' : '') +
      (cgPath ? '<path d="' + cgPath + '" fill="none" stroke="' + CG + '" stroke-width="2.6"/>' : '') +
      hlDots + cgDots +
      '<g data-cg="mv-cross" style="display:none"><line stroke="' + MUTE + '" stroke-width="1" stroke-dasharray="3 3"></line><circle r="4.5" fill="none" stroke="' + CG + '" stroke-width="2"></circle><circle r="4" fill="none" stroke="' + HL + '" stroke-width="2"></circle></g>' +
      '<rect data-cg="mv-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent" style="cursor:crosshair"></rect>' +
      '</svg>';

    state.geom = { W: W, H: H, padL: padL, padT: padT, plotW: plotW, plotH: plotH, n: n, xOf: xOf, yOf: yOf };
    wireHover();
  }

  function pathFor(pts, key, xOf, yOf) {
    var d = "", pen = false;
    pts.forEach(function (pt, i) {
      if (pt[key] == null) { pen = false; return; }
      d += (pen ? "L" : "M") + xOf(i).toFixed(1) + " " + yOf(pt[key]).toFixed(1) + " ";
      pen = true;
    });
    return d.trim();
  }
  function areaFor(pts, key, xOf, yOf, baseY) {
    var seg = [], cur = [];
    pts.forEach(function (pt, i) { if (pt[key] == null) { if (cur.length) { seg.push(cur); cur = []; } } else cur.push([xOf(i), yOf(pt[key])]); });
    if (cur.length) seg.push(cur);
    return seg.filter(function (s) { return s.length > 1; }).map(function (s) {
      var d = "M" + s[0][0].toFixed(1) + " " + baseY.toFixed(1);
      s.forEach(function (pp) { d += " L" + pp[0].toFixed(1) + " " + pp[1].toFixed(1); });
      d += " L" + s[s.length - 1][0].toFixed(1) + " " + baseY.toFixed(1) + " Z";
      return '<path d="' + d + '" fill="' + CG + '" opacity="0.07"/>';
    }).join("");
  }
  function markers(pts, key, xOf, yOf, r, c) {
    return pts.map(function (pt, i) { return pt[key] == null ? "" : '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + yOf(pt[key]).toFixed(1) + '" r="' + r + '" fill="' + c + '"/>'; }).join("");
  }

  function wireHover() {
    var host = q("mv-chart"), svg = host.querySelector("svg");
    var hit = host.querySelector('[data-cg="mv-hit"]');
    var cross = host.querySelector('[data-cg="mv-cross"]');
    var tip = q("mv-tip");
    if (!svg || !hit || !cross || !tip) return;
    var g = state.geom, pts = state.p.points;

    function locate(clientX) {
      var rect = svg.getBoundingClientRect();
      var scale = g.W / rect.width; // viewBox unit per screen px
      var x = (clientX - rect.left) * scale;
      var i = Math.round((x - g.padL) / (g.plotW / Math.max(1, g.n - 1)));
      return Math.max(0, Math.min(g.n - 1, i));
    }
    function show(clientX) {
      var i = locate(clientX), d = pts[i];
      var cx = g.xOf(i);
      var ln = cross.querySelector("line"), c0 = cross.querySelectorAll("circle")[0], c1 = cross.querySelectorAll("circle")[1];
      ln.setAttribute("x1", cx); ln.setAttribute("x2", cx); ln.setAttribute("y1", g.padT); ln.setAttribute("y2", g.padT + g.plotH);
      if (d.cg != null) { c0.setAttribute("cx", cx); c0.setAttribute("cy", g.yOf(d.cg)); c0.style.display = ""; } else c0.style.display = "none";
      if (d.hl != null) { c1.setAttribute("cx", cx); c1.setAttribute("cy", g.yOf(d.hl)); c1.style.display = ""; } else c1.style.display = "none";
      cross.style.display = "";
      tip.hidden = false;
      tip.innerHTML =
        '<div class="mv-tip-date">' + dlabel(d.date) + ' \u00b7 06:00 UTC</div>' +
        row("CoinGyaan", fmtUsd(d.cg), "cg") +
        row("Hyperliquid", d.hl == null ? "unavailable" : fmtUsd(d.hl), "hl") +
        row2("Difference", d.diff == null ? "n/a" : fmtDiff(d.diff), col(d.diff)) +
        row2("From previous ref", fmtPct(d.cgPctFromPrev), col(d.cgPctFromPrev));
      // position tooltip within the wrap
      var wrap = host.parentElement, ww = wrap.clientWidth, tw = tip.offsetWidth || 180;
      var rect = svg.getBoundingClientRect();
      var screenX = cx / (g.W / rect.width);
      var left = Math.max(4, Math.min(ww - tw - 4, screenX - tw / 2));
      tip.style.left = left + "px";
    }
    function hide() { cross.style.display = "none"; tip.hidden = true; }

    hit.addEventListener("mousemove", function (e) { show(e.clientX); });
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", function (e) { if (e.touches[0]) { show(e.touches[0].clientX); } }, { passive: true });
    hit.addEventListener("touchmove", function (e) { if (e.touches[0]) { show(e.touches[0].clientX); } }, { passive: true });
    hit.addEventListener("touchend", hide);
  }

  function row(k, v, cls) { return '<div class="mv-tip-row"><span class="mv-k mv-k-' + cls + '">' + k + '</span><span>' + v + '</span></div>'; }
  function row2(k, v, c) { return '<div class="mv-tip-row"><span>' + k + '</span><span style="color:' + c + '">' + v + '</span></div>'; }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
