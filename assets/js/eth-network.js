/* CoinGyaan · Ethereum hub network section from /api/eth-metrics. */
(function () {
  "use strict";
  var API = "/api/eth-metrics";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data;

    var gas = q("en-gas");
    if (gas) { gas.textContent = d.gasLabel; gas.style.color = toneColor[d.gasTone] || "#f59e0b"; }
    txt("en-gas-sub", d.gasGwei != null ? d.gasGwei + " gwei" : "gwei");

    txt("en-tvl", d.tvlDisplay);
    var ts = q("en-tvl-sub");
    if (ts && d.tvlTrend) { ts.textContent = d.tvlTrend + (d.tvlPct != null ? " (" + (d.tvlPct >= 0 ? "+" : "") + d.tvlPct + "%)" : ""); ts.style.color = toneColor[d.tvlTone] || "#94a3b8"; }

    txt("en-dom", d.defiDominanceDisplay);
    txt("en-note", d.note);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
