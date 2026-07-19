/* CoinGyaan · Markets dashboard cards hydration.
   Bitcoin: outlook, funding, open interest, dominance (all live).
   Ethereum: outlook live; gas/TVL/ETF marked "soon" until that engine exists.
   Altcoins: outlook, season, breadth, top gainers (all live).
   Stablecoins: all fields "soon" until the stablecoins engine exists. */
(function () {
  "use strict";
  var outlookColor = { Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };
  var GREEN = "#16c784", RED = "#ea3943", AMBER = "#f59e0b";

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function color(sel, c) { var el = q(sel); if (el && c) el.style.color = c; }
  function toneCol(t) { return t === "up" ? GREEN : t === "down" ? RED : AMBER; }

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
    if (el) { el.textContent = p.data.direction; el.style.color = outlookColor[p.data.direction] || AMBER; }
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
      if (p.data.dominance != null) txt("mk-btc-dom", p.data.dominance.toFixed(1) + "%");
    });
    pull("/api/bitcoin-outlook", function (p) { setOutlook("mk-btc-outlook", p); });
    pull("/api/eth-outlook", function (p) { setOutlook("mk-eth-outlook", p); });

    // Bitcoin card: funding rate
    pull("/api/funding-rate", function (p) {
      if (!p || !p.data) return;
      var d = p.data;
      var word = d.bias === "Long" ? "Positive" : d.bias === "Short" ? "Negative" : "Flat";
      txt("mk-btc-funding", word); color("mk-btc-funding", toneCol(d.tone));
    });
    // Bitcoin card: open interest activity
    pull("/api/open-interest", function (p) {
      if (!p || !p.data) return;
      var t = p.data.activityTone;
      var word = t === "up" ? "Rising" : t === "down" ? "Falling" : "Steady";
      txt("mk-btc-oi", word); color("mk-btc-oi", toneCol(t));
    });

    // Altcoins card: outlook, season, breadth, top gainers
    pull("/api/altcoins", function (p) {
      if (!p || !p.data) return;
      var d = p.data;
      if (d.dominance != null) txt("mk-alt-dom", d.dominance.toFixed(1) + "%");
      var ol = q("mk-alt-outlook");
      if (ol) { ol.textContent = d.outlook; ol.style.color = toneCol(d.tone); }
      if (d.seasonIndex != null) txt("mk-alt-season", d.seasonIndex + " / 100");
      if (d.breadth) { txt("mk-alt-breadth", d.breadth); color("mk-alt-breadth", toneCol(d.breadthTone)); }
      if (d.gainers != null && d.total != null) txt("mk-alt-gainers", d.gainers + " / " + d.total);
    });

    // Stablecoins card: supply, trend, dominance, mint/burn, outlook
    pull("/api/stablecoins", function (p) {
      if (!p || !p.data) return;
      var d = p.data;
      txt("mk-stable-supply", d.totalDisplay);
      if (d.supplyTrend) { txt("mk-stable-trend", d.supplyTrend); color("mk-stable-trend", toneCol(d.trendTone)); }
      txt("mk-stable-dom", d.leaderDisplay);
      var fl = q("mk-stable-flow");
      if (fl && d.netFlowDisplay) { fl.textContent = d.netFlowDisplay; fl.style.color = d.netFlow >= 0 ? GREEN : RED; }
      if (d.outlook) { txt("mk-stable-outlook", d.outlook); color("mk-stable-outlook", toneCol(d.outlookTone)); }
    });
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
