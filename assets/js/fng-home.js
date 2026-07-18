/* CoinGyaan · homepage Fear and Greed card hydration.
   Fills the sentiment card from /api/fear-greed. Static fallback stays on error. */
(function () {
  "use strict";
  var API = "/api/fear-greed";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "var(--gold)" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, val) { var el = q(sel); if (el && val != null) el.textContent = val; }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data;
    var color = toneColor[d.tone] || "var(--gold)";

    var big = q("fng-value");
    if (big) { big.innerHTML = d.value + "<span> / 100</span>"; big.style.color = color; }

    var marker = q("fng-marker");
    if (marker) { marker.style.left = Math.max(0, Math.min(100, d.scalePct)) + "%"; marker.style.background = color; }

    var cls = q("fng-class"); if (cls) { cls.textContent = d.classification; cls.style.color = color; }
    txt("fng-trend", d.trend);
    txt("fng-note", d.note);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
