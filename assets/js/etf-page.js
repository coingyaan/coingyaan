/* CoinGyaan · /etf-flows/ hydration (SoSoValue-backed).
   Fills headline metrics, the intelligence summary, the transparent ETF Flow
   Signal, the leaderboard, concentration, the period comparison and three inline
   SVG charts. No data is fabricated: empty or missing inputs show a clear state. */
(function () {
  "use strict";
  var API = "/api/etf-flows";
  var GREEN = "#16c784", RED = "#ea3943", AMBER = "#f59e0b", GRID = "rgba(148,163,184,.18)", MUTE = "#94a3b8";
  var toneCls = { up: "st-green", down: "st-red", neutral: "st-amber" };
  var P = null;

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el) el.textContent = v == null ? "n/a" : v; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function fmtM(m) { // m already in $ millions
    if (m == null || isNaN(m)) return "n/a";
    var s = m >= 0 ? "+" : "-", a = Math.abs(m);
    if (a >= 1000) return s + "$" + (a / 1000).toFixed(2) + "B";
    return s + "$" + a.toFixed(1) + "M";
  }
  function fmtUsd(u) { return u == null || isNaN(u) ? "n/a" : fmtM(u / 1e6); }
  function signColor(v) { return v == null ? MUTE : v > 0 ? GREEN : v < 0 ? RED : AMBER; }
  function setColored(sel, m) { var el = q(sel); if (el) { el.textContent = fmtM(m); el.style.color = signColor(m); } }

  function boot() {
    fetch(API).then(function (r) { return r.json(); }).then(function (p) {
      P = p;
      if (!p || p.available === false || p.status === "error" || !p.metrics) return empty(p);
      var prod = q("product"), emp = q("empty");
      if (prod) prod.hidden = false; if (emp) emp.hidden = true;
      render(p);
    }).catch(function () { empty(null); });
  }

  function empty(p) {
    var prod = q("product"), emp = q("empty");
    if (prod) prod.hidden = true;
    if (emp) { emp.hidden = false; emp.textContent = "ETF flow data is temporarily unavailable. Please check back shortly."; }
  }

  function render(p) {
    var m = p.metrics;
    // stamp
    var stamp = q("stamp");
    if (stamp) stamp.innerHTML = '<i class="dot"></i>' + (p.status === "stale" ? "Delayed" : "Live") + " \u00b7 updated " + age(p.ageSeconds);
    // hero + metrics
    setColored("m-latest", m.latestNetFlowM);
    txt("m-latest-date", m.lastDate);
    setColored("m-1d", m.flow1dM);
    setColored("m-5d", m.flow5dM);
    setColored("m-20d", m.flow20dM);
    setColored("m-90d", m.flow90dM);
    var cum = q("m-cum"); if (cum) cum.textContent = fmtM(m.cumNetInflowM);
    var aum = q("m-aum"); if (aum) aum.textContent = fmtM(m.totalNetAssetsM);

    // summary
    var sh = q("s-headline");
    if (sh && p.summary) { sh.textContent = p.summary.headline; sh.className = "st " + (p.signal ? (toneCls[p.signal.tone] || "st-amber") : "st-amber"); }
    var obs = q("s-obs");
    if (obs && p.summary) obs.innerHTML = (p.summary.observations || []).map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("");

    // signal
    if (p.signal) {
      var ss = q("sig-state"); if (ss) { ss.textContent = p.signal.state; ss.className = "st st-lg " + (toneCls[p.signal.tone] || "st-amber"); }
      var sc = q("sig-score"); if (sc) { sc.textContent = (p.signal.score >= 0 ? "+" : "") + p.signal.score; sc.style.color = signColor(p.signal.score); }
      var br = q("sig-break"), c = p.signal.components;
      if (br && c) {
        br.innerHTML =
          line("5D average", c.avg5d, c.weights.level) +
          line("20D average", c.avg20d, c.weights.context) +
          line("Momentum", c.momentum, c.weights.momentum) +
          '<div class="etf-break-eq">= blended <b style="color:' + signColor(p.signal.score) + '">' + (p.signal.score >= 0 ? "+" : "") + p.signal.score + '</b> $m</div>';
      }
    }

    // demand panel: momentum + trend (reuse into summary area via obs already); add small badges row under signal
    // leaderboard
    var lb = q("lb-body");
    if (lb) {
      var funds = (p.concentration && p.concentration.funds) || [];
      if (!funds.length) lb.innerHTML = '<tr><td colspan="5" class="etf-na">Per fund data unavailable right now.</td></tr>';
      else lb.innerHTML = funds.map(function (f) {
        return "<tr><td>" + esc(f.name || f.ticker) + "</td><td class=\"mono\">" + esc(f.ticker) + "</td>" +
          "<td class=\"r\">" + fmtUsd(f.aum) + "</td>" +
          "<td class=\"r\" style=\"color:" + signColor(f.day) + "\">" + fmtUsd(f.day) + "</td>" +
          "<td class=\"r\" style=\"color:" + signColor(f.cum) + "\">" + fmtUsd(f.cum) + "</td></tr>";
      }).join("");
    }

    // concentration
    var conc = p.concentration;
    var cl = q("conc-lead");
    if (cl) {
      if (conc && conc.topTicker && conc.topAumSharePct != null)
        cl.innerHTML = "<b>" + esc(conc.topTicker) + "</b> holds <b>" + conc.topAumSharePct + "%</b> of US spot Bitcoin ETF assets.";
      else cl.textContent = "Per fund concentration data is unavailable right now.";
    }
    var cb = q("conc-bars");
    if (cb && conc && conc.funds) cb.innerHTML = conc.funds.filter(function (f) { return f.aumSharePct != null; }).map(function (f) {
      return '<div class="etf-bar"><span class="etf-bar-k">' + esc(f.ticker) + '</span><span class="etf-bar-t"><i style="width:' + Math.max(1, f.aumSharePct) + '%"></i></span><span class="etf-bar-v">' + f.aumSharePct + '%</span></div>';
    }).join("");
    var cn = q("conc-note");
    if (cn && conc) cn.textContent = conc.dayInflowLeader ? (conc.dayInflowLeader.ticker + " led the latest day with " + conc.dayInflowLeader.sharePct + "% of that day's positive inflows.") : "Bars show each fund's share of total ETF assets. This is always defined between 0 and 100 percent.";

    // compare
    var cmp = q("compare");
    if (cmp && p.compare) {
      var pc = p.compare;
      var change = pc.changePct == null ? "n/a" : (pc.changePct >= 0 ? "+" : "") + pc.changePct + "%";
      cmp.innerHTML =
        '<div class="etf-cmp-cell"><span>Current 30D</span><b style="color:' + signColor(pc.current30dM) + '">' + fmtM(pc.current30dM) + '</b></div>' +
        '<div class="etf-cmp-cell"><span>Previous 30D</span><b style="color:' + signColor(pc.previous30dM) + '">' + fmtM(pc.previous30dM) + '</b></div>' +
        '<div class="etf-cmp-cell"><span>Change</span><b style="color:' + signColor(pc.changePct) + '">' + change + '</b></div>';
    }

    // source
    var src = q("src");
    if (src) src.innerHTML =
      row("Data source", esc(p.provider || "SoSoValue")) +
      row("Coverage", "US spot Bitcoin ETFs") +
      row("Updated", esc(m.lastDate) + " (" + age(p.ageSeconds) + ")") +
      row("Data window", (p.windowDays || "n/a") + " trading days from " + esc(p.windowStart || "n/a"));

    // charts
    var daily = p.daily || [];
    initRange("range-daily", "chart-daily", 30, function (n) { barChart(q("chart-daily"), sliceN(daily, n)); });
    initRange("range-cum", "chart-cum", 90, function (n) { lineChart(q("chart-cum"), sliceN(daily, n)); });
    initRange("range-cmp", "chart-cmp", 90, function (n) { dualChart(q("chart-cmp"), sliceN(daily, n), sliceN(p.price || [], n)); });
  }

  function line(label, val, w) {
    return '<div class="etf-break-r"><span>' + label + '</span><b style="color:' + signColor(val) + '">' + (val >= 0 ? "+" : "") + val + '</b><em>x ' + w + '</em></div>';
  }
  function row(k, v) { return '<div class="etf-src-r"><span>' + k + '</span><b>' + v + '</b></div>'; }

  function sliceN(arr, n) { if (!arr || !arr.length) return []; if (n === "all" || n >= arr.length) return arr.slice(); return arr.slice(arr.length - n); }

  function initRange(rangeSel, chartSel, def, draw) {
    var wrap = q(rangeSel); if (!wrap) { draw(def); return; }
    function pick(n, btn) {
      var kids = wrap.querySelectorAll("button");
      for (var i = 0; i < kids.length; i++) kids[i].classList.remove("on");
      if (btn) btn.classList.add("on");
      draw(n === "all" ? "all" : parseInt(n, 10));
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      pick(b.getAttribute("data-range"), b);
    });
    draw(def);
  }

  // ---- charts (inline SVG) ----
  function svgEl(w, h) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">'; }

  function barChart(host, pts) {
    if (!host) return;
    if (!pts.length) { host.innerHTML = na(); return; }
    var W = 760, H = 210, padX = 10, padT = 14, padB = 24, plot = H - padT - padB, mid = padT + plot / 2;
    var maxAbs = 1; pts.forEach(function (p) { maxAbs = Math.max(maxAbs, Math.abs(p.netM || 0)); });
    var slot = (W - 2 * padX) / pts.length, bw = Math.max(1, slot * 0.66);
    var bars = pts.map(function (p, i) {
      var v = p.netM || 0, h = Math.abs(v) / maxAbs * (plot / 2);
      var x = padX + i * slot + (slot - bw) / 2, y = v >= 0 ? mid - h : mid;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.6, h).toFixed(1) + '" fill="' + (v >= 0 ? GREEN : RED) + '"><title>' + p.date + ": " + fmtM(v) + '</title></rect>';
    }).join("");
    host.innerHTML = svgEl(W, H) +
      '<line x1="' + padX + '" y1="' + mid + '" x2="' + (W - padX) + '" y2="' + mid + '" stroke="' + GRID + '" stroke-width="1"/>' +
      bars + axis(pts, W, H, padX, padB) + '</svg>';
  }

  function lineChart(host, pts) {
    if (!host) return;
    var d = pts.filter(function (p) { return p.cumM != null; });
    if (d.length < 2) { host.innerHTML = na(); return; }
    var W = 760, H = 210, padX = 10, padT = 14, padB = 24, plot = H - padT - padB;
    var vals = d.map(function (p) { return p.cumM; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var pointsStr = d.map(function (p, i) {
      var x = padX + (i / (d.length - 1)) * (W - 2 * padX);
      var y = padT + (1 - (p.cumM - min) / span) * plot;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var last = d[d.length - 1];
    host.innerHTML = svgEl(W, H) +
      '<polyline fill="none" stroke="' + GREEN + '" stroke-width="2" points="' + pointsStr + '"/>' +
      '<text x="' + (W - padX) + '" y="' + (padT + 10) + '" text-anchor="end" fill="' + MUTE + '" font-size="11">' + fmtM(last.cumM) + '</text>' +
      axis(d, W, H, padX, padB) + '</svg>';
  }

  function dualChart(host, daily, price) {
    if (!host) return;
    if (!daily.length) { host.innerHTML = na(); return; }
    var W = 760, H = 240, padX = 10;
    var priceBandT = 12, priceBandH = 110, flowTop = 140, flowH = 74, flowMid = flowTop + flowH / 2, padB = 24;
    // price line
    var pv = price.filter(function (p) { return p.close != null; });
    var priceLine = "", priceLbl = "";
    if (pv.length >= 2) {
      var vals = pv.map(function (p) { return p.close; });
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
      priceLine = '<polyline fill="none" stroke="' + AMBER + '" stroke-width="2" points="' + pv.map(function (p, i) {
        var x = padX + (i / (pv.length - 1)) * (W - 2 * padX);
        var y = priceBandT + (1 - (p.close - min) / span) * priceBandH;
        return x.toFixed(1) + "," + y.toFixed(1);
      }).join(" ") + '"/>';
      priceLbl = '<text x="' + padX + '" y="' + (priceBandT + 10) + '" fill="' + MUTE + '" font-size="11">Price $' + Math.round(max).toLocaleString() + '</text>';
    }
    // flow bars
    var maxAbs = 1; daily.forEach(function (p) { maxAbs = Math.max(maxAbs, Math.abs(p.netM || 0)); });
    var slot = (W - 2 * padX) / daily.length, bw = Math.max(1, slot * 0.6);
    var bars = daily.map(function (p, i) {
      var v = p.netM || 0, h = Math.abs(v) / maxAbs * (flowH / 2);
      var x = padX + i * slot + (slot - bw) / 2, y = v >= 0 ? flowMid - h : flowMid;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.6, h).toFixed(1) + '" fill="' + (v >= 0 ? GREEN : RED) + '"><title>' + p.date + ": " + fmtM(v) + '</title></rect>';
    }).join("");
    host.innerHTML = svgEl(W, H) + priceLine + priceLbl +
      '<line x1="' + padX + '" y1="' + flowMid + '" x2="' + (W - padX) + '" y2="' + flowMid + '" stroke="' + GRID + '" stroke-width="1"/>' +
      '<text x="' + padX + '" y="' + (flowTop - 4) + '" fill="' + MUTE + '" font-size="11">Daily net flow</text>' +
      bars + axis(daily, W, H, padX, padB) + '</svg>';
  }

  function axis(pts, W, H, padX, padB) {
    if (!pts.length) return "";
    var first = pts[0].date, last = pts[pts.length - 1].date;
    return '<text x="' + padX + '" y="' + (H - 6) + '" fill="' + MUTE + '" font-size="10">' + first + '</text>' +
      '<text x="' + (W - padX) + '" y="' + (H - 6) + '" text-anchor="end" fill="' + MUTE + '" font-size="10">' + last + '</text>';
  }

  function na() { return '<div class="etf-na">Chart data unavailable for this range.</div>'; }

  function age(s) {
    if (s == null) return "just now";
    if (s < 60) return "just now";
    var m = Math.round(s / 60); if (m < 60) return m + "m ago";
    var h = Math.round(m / 60); if (h < 24) return h + "h ago";
    return Math.round(h / 24) + "d ago";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
