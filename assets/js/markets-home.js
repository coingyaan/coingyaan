/* CoinGyaan · Markets dashboard cards (Bitcoin, Ethereum) hydration.
   Wires price (from /api/markets) and Market Outlook (from the per-asset outlook
   API). Altcoins and Stablecoins stay static until their engines exist. */
(function () {
  "use strict";
  var outlookColor = { Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }

  function price(n) {
    if (n == null) return null;
    if (n >= 10000) return "$" + Math.round(n).toLocaleString("en-US");
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function setPx(pxSel, chSel, coin) {
    if (!coin) return;
    txt(pxSel, price(coin.price));
    var ch = q(chSel);
    if (ch && coin.changePct != null) { ch.textContent = (coin.changePct >= 0 ? "+" : "") + coin.changePct.toFixed(1) + "%"; ch.className = coin.changePct >= 0 ? "up" : "down"; }
  }
  function setMove(sel, coin) {
    if (!coin || coin.changePct == null) return;
    var el = q(sel); if (!el) return;
    el.textContent = (coin.changePct >= 0 ? "+" : "") + coin.changePct.toFixed(1) + "%";
    el.style.color = coin.changePct >= 0 ? "#16c784" : "#ea3943";
  }
  function setHL(highSel, lowSel, coin) {
    if (!coin) return;
    if (coin.high != null) txt(highSel, price(coin.high));
    if (coin.low != null) txt(lowSel, price(coin.low));
  }
  function setOutlook(sel, p) {
    if (!p || !p.data) return;
    var el = q(sel);
    if (el) { el.textContent = p.data.direction; el.style.color = outlookColor[p.data.direction] || "#f59e0b"; }
  }

  function pull(url, fn) {
    fetch(url, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(fn).catch(function () {});
  }
  function load() {
    pull("/api/markets", function (p) {
      if (!p || !p.data) return;
      setPx("mk-btc-px", "mk-btc-ch", p.data.btc);
      setPx("mk-eth-px", "mk-eth-ch", p.data.eth);
      setHL("mk-btc-high", "mk-btc-low", p.data.btc);
      setHL("mk-eth-high", "mk-eth-low", p.data.eth);
    });
    pull("/api/bitcoin-outlook", function (p) { setOutlook("mk-btc-outlook", p); });
    pull("/api/eth-outlook", function (p) { setOutlook("mk-eth-outlook", p); });
    pull("/api/altcoins", function (p) {
      if (!p || !p.data) return;
      var d = p.data;
      if (d.dominance != null) txt("mk-alt-dom", d.dominance.toFixed(1) + "%");
      var ol = q("mk-alt-outlook");
      if (ol) { ol.textContent = d.outlook; ol.style.color = d.tone === "up" ? "#16c784" : d.tone === "down" ? "#ea3943" : "#f59e0b"; }
      if (d.seasonIndex != null) txt("mk-alt-season", d.seasonIndex + " / 100");
    });
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
