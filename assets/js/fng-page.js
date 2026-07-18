/* CoinGyaan · /fear-greed-index/ full page hydration.
   Fills the reading, deltas, interpretation and a 30-day sparkline. */
(function () {
  "use strict";
  var API = "/api/fear-greed";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, val) { var el = q(sel); if (el && val != null) el.textContent = val; }

  function signed(n) { return n == null ? "n/a" : (n > 0 ? "+" + n : "" + n); }
  function deltaCell(sel, n) {
    var el = q(sel); if (!el) return;
    el.textContent = signed(n);
    el.className = "v " + (n == null ? "" : n > 0 ? "fg-up" : n < 0 ? "fg-down" : "fg-flat");
  }

  function spark(history, color) {
    var el = q("fg-spark"); if (!el || !history || history.length < 2) return;
    var vals = history.map(function (p) { return p.v; });
    var n = vals.length, W = 300, H = 70, pad = 4;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var pts = vals.map(function (v, i) {
      var x = pad + (i / (n - 1)) * (W - 2 * pad);
      var y = pad + (1 - (v - min) / span) * (H - 2 * pad);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    el.innerHTML =
      '<polyline fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" points="' + pts + '"></polyline>';
  }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data, color = toneColor[d.tone] || "#f59e0b";

    var big = q("fg-value"); if (big) { big.innerHTML = d.value + "<span> / 100</span>"; big.style.color = color; }
    var cls = q("fg-class"); if (cls) { cls.textContent = d.classification; cls.style.color = color; }
    var marker = q("fg-marker"); if (marker) { marker.style.left = Math.max(0, Math.min(100, d.scalePct)) + "%"; marker.style.background = color; }

    txt("fg-trend", d.trend);
    txt("fg-yesterday", d.yesterday == null ? "n/a" : d.yesterday);
    deltaCell("fg-d7", d.delta7d);
    deltaCell("fg-d30", d.delta30d);
    txt("fg-interp", d.interpretation);

    if (d.contrarian) {
      var wrap = q("fg-contrarian-wrap"); if (wrap) wrap.style.display = "";
      txt("fg-contrarian", d.contrarian);
    }
    spark(p.history, color);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
