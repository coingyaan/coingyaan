/* CoinGyaan · /funding-rate/ full page hydration. */
(function () {
  "use strict";
  var API = "/api/funding-rate";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber" };
  var leanText = { up: "Long", down: "Short", neutral: "Flat" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function age(s) { return s == null || s < 60 ? "just now" : Math.round(s / 60) + "m ago"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function apply(p) {
    if (!p || !p.data) { var st = q("fr-stamp"); if (st) st.innerHTML = '<i class="dot"></i>Live data unavailable'; return; }
    var d = p.data, color = toneColor[d.tone] || "#f59e0b";

    var big = q("fr-rate"); if (big) big.innerHTML = d.ratePctDisplay + "<b> / 8h</b>";
    if (big) big.style.color = color;
    txt("fr-bias", d.bias + " bias");
    txt("fr-interp", d.interpretation);

    var sl = q("fr-split-long"), ss = q("fr-split-short");
    if (sl) sl.style.width = d.splitLong + "%";
    if (ss) ss.style.width = d.splitShort + "%";
    txt("fr-leg-long", "Long " + d.splitLong + "%");
    txt("fr-leg-short", "Short " + d.splitShort + "%");

    var bst = q("fr-bias-st"); if (bst) { bst.textContent = d.bias; bst.className = "st " + (toneClass[d.biasTone] || "st-amber"); }
    txt("fr-positioning", d.positioning);
    var cr = q("fr-crowding"); if (cr) { cr.textContent = d.crowding; cr.className = "st " + (toneClass[d.crowdTone] || "st-amber"); }
    txt("fr-annual", (d.annualizedPct >= 0 ? "+" : "") + d.annualizedPct + "% APR");

    var tb = q("fr-venues");
    if (tb && p.venues) {
      tb.innerHTML = p.venues.map(function (v) {
        return "<tr><td>" + esc(v.name) + '</td><td class="ol-read">' + esc(v.ratePctDisplay) + "</td><td class=\"ol-read\">" + (v.annualizedPct >= 0 ? "+" : "") + v.annualizedPct + "%</td><td><i class=\"st " + (toneClass[v.tone] || "st-amber") + "\">" + (leanText[v.tone] || "Flat") + "</i></td></tr>";
      }).join("");
    }
    var stamp = q("fr-stamp");
    if (stamp) stamp.innerHTML = '<i class="dot"></i>' + (p.status === "stale" ? "Delayed" : "Live") + " \u00b7 updated " + age(p.ageSeconds);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(function () {});
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
