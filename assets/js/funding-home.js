/* CoinGyaan · homepage Funding Rate card hydration from /api/funding-rate. */
(function () {
  "use strict";
  var API = "/api/funding-rate";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data, color = toneColor[d.tone] || "#f59e0b";

    var rate = q("fr-rate");
    if (rate) { rate.innerHTML = d.ratePctDisplay + "<span> / 8h</span>"; rate.style.color = color; }

    var sl = q("fr-split-long"), ss = q("fr-split-short");
    if (sl) sl.style.width = d.splitLong + "%";
    if (ss) ss.style.width = d.splitShort + "%";

    var bias = q("fr-bias"); if (bias) { bias.textContent = d.bias; bias.style.color = color; }
    txt("fr-positioning", d.positioning);
    txt("fr-note", d.note);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
