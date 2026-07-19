/* CoinGyaan · per-asset market hub (/markets/bitcoin/, /markets/ethereum/).
   Reads the asset from <main data-asset>. Pulls the asset outlook, price and
   market-wide sentiment and fills one unified view. No new engines needed. */
(function () {
  "use strict";
  var main = document.querySelector("main[data-asset]");
  var asset = main ? main.getAttribute("data-asset") : "btc";
  var outlookUrl = asset === "btc" ? "/api/bitcoin-outlook" : "/api/" + asset + "-outlook";

  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber", info: "st-blue" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b", info: "#60a5fa", Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function age(s) { return s == null || s < 60 ? "just now" : Math.round(s / 60) + "m ago"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function price(n) {
    if (n == null) return "--";
    if (n >= 10000) return "$" + Math.round(n).toLocaleString("en-US");
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function usd(n) {
    if (n == null) return "--";
    var a = Math.abs(n);
    if (a >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function fillOutlook(p) {
    if (!p || !p.data) { var st = q("h-stamp"); if (st) st.innerHTML = '<i class="dot"></i>Live data unavailable'; return; }
    var d = p.data, t = d.tones || {}, s = p.signals || {};

    var big = q("h-upside"); if (big) big.textContent = d.upsideProbability;
    txt("h-stance", d.stance.charAt(0).toUpperCase() + d.stance.slice(1));
    txt("h-summary", d.summary);

    var bd = q("h-bias-down"), bu = q("h-bias-up");
    if (bd) { bd.style.width = d.bias.downside + "%"; bd.textContent = d.bias.downside + "%"; }
    if (bu) { bu.style.width = d.bias.upside + "%"; bu.textContent = d.bias.upside + "%"; }
    txt("h-legend-down", "Downside " + d.bias.downside + "% \u2193");
    txt("h-legend-up", "\u2191 Upside " + d.bias.upside + "%");

    var dir = q("h-direction"); if (dir) { dir.textContent = d.direction; dir.className = "st " + (toneClass[t.direction] || "st-amber"); }
    var cf = q("h-conf"); if (cf) { cf.textContent = d.confidenceLabel + " (" + d.confidence + ")"; cf.className = "st " + (toneClass[t.confidence] || "st-amber"); }
    var cd = q("h-condition"); if (cd) { cd.textContent = d.condition; cd.className = "st " + (toneClass[t.condition] || "st-blue"); }
    txt("h-range", d.expectedRange.display);

    // metrics from signals
    if (s.funding != null) {
      txt("h-funding", (s.funding >= 0 ? "+" : "") + s.funding + "%");
      var fl = q("h-funding-lbl"); if (fl) { fl.textContent = s.funding > 0 ? "longs pay shorts" : s.funding < 0 ? "shorts pay longs" : "flat"; }
      var fv = q("h-funding"); if (fv) fv.style.color = toneColor[s.funding > 0 ? "up" : s.funding < 0 ? "down" : "neutral"];
    }
    txt("h-oi", usd(s.oiUsd));
    if (s.rsi != null) txt("h-rsi", s.rsi);
    if (s.volatilityPct != null) txt("h-vol", s.volatilityPct + "%");

    var reasons = q("h-reasons");
    if (reasons) {
      reasons.innerHTML = (d.reasons || []).map(function (x) {
        return '<div class="ol-reason ol-' + (x.tone || "neutral") + '"><span class="ol-rtag">' + esc(x.signal) + "</span><span>" + esc(x.note) + "</span></div>";
      }).join("") || '<p class="ol-empty">Signals are balanced right now.</p>';
    }

    var stamp = q("h-stamp");
    if (stamp) stamp.innerHTML = '<i class="dot"></i>' + (p.status === "stale" ? "Delayed" : "Live") + " \u00b7 updated " + age(p.ageSeconds);
  }

  function fillPrice(p) {
    if (!p || !p.data) return;
    var coin = p.data[asset];
    if (!coin) return;
    txt("h-price", price(coin.price));
    var ch = q("h-price-ch");
    if (ch && coin.changePct != null) { ch.textContent = (coin.changePct >= 0 ? "+" : "") + coin.changePct.toFixed(1) + "% today"; ch.style.color = toneColor[coin.changePct >= 0 ? "up" : "down"]; }
  }

  function fillFng(p) {
    if (!p || !p.data) return;
    txt("h-fng", p.data.value);
    var lbl = q("h-fng-lbl"); if (lbl) lbl.textContent = p.data.classification + " \u00b7 market wide";
    var v = q("h-fng"); if (v) v.style.color = toneColor[p.data.tone] || "#f59e0b";
  }

  function pull(url, fn) {
    fetch(url, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(fn).catch(function () {});
  }
  function load() {
    pull(outlookUrl, fillOutlook);
    pull("/api/markets", fillPrice);
    pull("/api/fear-greed", fillFng);
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
