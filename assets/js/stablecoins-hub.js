/* CoinGyaan · /markets/stablecoins/ hub hydration from /api/stablecoins. */
(function () {
  "use strict";
  var API = "/api/stablecoins";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function age(s) { return s == null || s < 60 ? "just now" : Math.round(s / 60) + "m ago"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function apply(p) {
    if (!p || !p.data) { var st = q("s-stamp"); if (st) st.innerHTML = '<i class="dot"></i>Live data unavailable'; return; }
    var d = p.data;

    txt("s-total", d.totalDisplay);
    var out = q("s-outlook"); if (out) { out.textContent = "Liquidity " + d.outlook; out.style.color = toneColor[d.outlookTone] || "#f59e0b"; }
    txt("s-note", d.note);

    var tr = q("s-trend"); if (tr) { tr.textContent = d.supplyTrend; tr.className = "st " + (toneClass[d.trendTone] || "st-amber"); }
    var fl = q("s-flow"); if (fl && d.netFlowDisplay) { fl.textContent = d.netFlowDisplay; fl.style.color = (d.netFlow != null && d.netFlow < 0) ? "#ea3943" : "#16c784"; }
    var os = q("s-outlook-st"); if (os) { os.textContent = d.outlook; os.className = "st " + (toneClass[d.outlookTone] || "st-amber"); }
    txt("s-leader", d.leaderDisplay);

    var tb = q("s-breakdown");
    if (tb) {
      if (p.breakdown && p.breakdown.length) {
        tb.innerHTML = p.breakdown.map(function (b) {
          return "<tr><td>" + esc(b.name) + " <span class=\"ol-read\">" + esc(b.symbol) + "</span></td><td>" + esc(b.circulatingDisplay) + "</td><td>" + b.share + "%</td></tr>";
        }).join("");
      } else { tb.innerHTML = '<tr><td colspan="3" class="ol-empty">Breakdown unavailable right now.</td></tr>'; }
    }

    var stamp = q("s-stamp");
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
