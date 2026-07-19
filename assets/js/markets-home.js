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
    });
    pull("/api/bitcoin-outlook", function (p) { setOutlook("mk-btc-outlook", p); });
    pull("/api/eth-outlook", function (p) { setOutlook("mk-eth-outlook", p); });
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
