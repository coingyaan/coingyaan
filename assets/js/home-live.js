/* CoinGyaan · homepage ticker + Live Market Snapshot hydration.
   Wires the fields we have live data for (prices, dominance, Fear and Greed,
   Bitcoin Outlook direction). Funding and Open Interest stay static until their
   engines exist. Static values remain on any fetch error. */
(function () {
  "use strict";
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b", Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }

  function price(n) {
    if (n == null) return null;
    if (n >= 10000) return "$" + Math.round(n).toLocaleString("en-US");
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }
  function setChange(sel, n) {
    var el = q(sel); if (!el || n == null) return;
    el.textContent = pct(n);
    el.className = n >= 0 ? "up" : "down";
  }

  function markets(p) {
    if (!p || !p.data) return;
    var d = p.data;
    if (d.btc) { txt("tk-btc", price(d.btc.price)); setChange("tk-btc-ch", d.btc.changePct); }
    if (d.eth) { txt("tk-eth", price(d.eth.price)); setChange("tk-eth-ch", d.eth.changePct); }
    if (d.sol) { txt("tk-sol", price(d.sol.price)); setChange("tk-sol-ch", d.sol.changePct); }
    if (d.hype) { txt("tk-hype", price(d.hype.price)); setChange("tk-hype-ch", d.hype.changePct); }
    if (d.dominance != null) txt("tk-dom", d.dominance.toFixed(1) + "%");
  }

  function fng(p) {
    if (!p || !p.data) return;
    var d = p.data, color = toneColor[d.tone] || "#f59e0b";
    txt("tk-fng", d.value);
    var lbl = q("tk-fng-lbl"); if (lbl) { lbl.textContent = d.classification; lbl.className = d.tone === "up" ? "up" : d.tone === "down" ? "down" : ""; }
    var s = q("snap-fng"); if (s) { s.textContent = d.value; s.style.color = color; }
  }

  function outlook(p) {
    if (!p || !p.data) return;
    var d = p.data;
    var el = q("snap-outlook");
    if (el) { el.textContent = d.direction; el.style.color = toneColor[d.direction] || "#f59e0b"; }
    var foot = q("snap-foot");
    if (foot) foot.textContent = "Updated " + (p.ageSeconds == null || p.ageSeconds < 60 ? "just now" : Math.round(p.ageSeconds / 60) + "m ago");
  }

  function pull(url, fn) {
    fetch(url, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(fn).catch(function () {});
  }
  function load() {
    pull("/api/markets", markets);
    pull("/api/fear-greed", fng);
    pull("/api/bitcoin-outlook", outlook);
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
