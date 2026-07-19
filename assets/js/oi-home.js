/* CoinGyaan · homepage Open Interest card hydration from /api/open-interest. */
(function () {
  "use strict";
  var API = "/api/open-interest";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };
  var barColor = { up: "#22c55e", down: "#ef4444", neutral: "#94a3b8" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }

  function drawBars(bars, tone) {
    var svg = q("oi-bars"); if (!svg || !bars || !bars.length) return;
    var rects = svg.querySelectorAll("rect");
    var g = svg.querySelector("g"); if (g) g.setAttribute("fill", barColor[tone] || "#22c55e");
    for (var i = 0; i < rects.length; i++) {
      var b = bars[bars.length - rects.length + i];
      if (!b) continue;
      var hpx = Math.round(6 + b.h * 22); // 6..28 within a 34 tall viewBox
      rects[i].setAttribute("height", hpx);
      rects[i].setAttribute("y", 34 - hpx);
    }
  }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data;
    txt("oi-value", d.oiUsdDisplay);
    var ch = q("oi-change"); if (ch) { ch.textContent = d.changeDisplay; ch.style.color = toneColor[d.changeTone] || "#f59e0b"; }
    txt("oi-activity", d.activity);
    drawBars(d.bars, d.changeTone);
  }

  // Positioning derived from funding bias (net long/short of the market)
  function applyPositioning(p) {
    if (!p || !p.data) return;
    var pos = q("oi-positioning"); if (!pos) return;
    var b = p.data.bias;
    var word = b === "Long" ? "Net long" : b === "Short" ? "Net short" : "Balanced";
    var c = b === "Long" ? "#16c784" : b === "Short" ? "#ea3943" : "#f59e0b";
    pos.textContent = word; pos.style.color = c;
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
    fetch("/api/funding-rate", { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(applyPositioning).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
