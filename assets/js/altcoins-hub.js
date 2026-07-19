/* CoinGyaan · /markets/altcoins/ hub hydration from /api/altcoins. */
(function () {
  "use strict";
  var API = "/api/altcoins";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function age(s) { return s == null || s < 60 ? "just now" : Math.round(s / 60) + "m ago"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function apply(p) {
    if (!p || !p.data) { var st = q("a-stamp"); if (st) st.innerHTML = '<i class="dot"></i>Live data unavailable'; return; }
    var d = p.data, color = toneColor[d.tone] || "#f59e0b";

    if (d.seasonIndex != null) {
      txt("a-index", d.seasonIndex);
      var m = q("a-marker"); if (m) { m.style.left = Math.max(0, Math.min(100, d.seasonIndex)) + "%"; m.style.background = color; }
    } else { txt("a-index", "n/a"); }
    var lbl = q("a-label"); if (lbl) { lbl.textContent = d.seasonLabel; lbl.style.color = color; }
    txt("a-note", d.note);

    txt("a-dom", d.dominance != null ? d.dominance.toFixed(1) + "%" : "n/a");
    var dt = q("a-domtrend"); if (dt) { dt.textContent = d.domTrend; dt.className = "st " + (toneClass[d.domTrendTone] || "st-amber"); }
    txt("a-breadth", d.outperform != null ? d.outperform + " of " + d.total : "n/a");
    txt("a-window", d.window);

    var tb = q("a-movers");
    if (tb) {
      if (p.movers && p.movers.length) {
        tb.innerHTML = p.movers.map(function (mv) {
          var cls = mv.change >= 0 ? "st-green" : "st-red";
          var sign = mv.change >= 0 ? "+" : "";
          return "<tr><td>" + esc(mv.name) + " <span class=\"ol-read\">" + esc(mv.symbol) + "</span></td><td><i class=\"st " + cls + "\">" + sign + mv.change + "%</i></td></tr>";
        }).join("");
      } else { tb.innerHTML = '<tr><td colspan="2" class="ol-empty">Movers unavailable right now.</td></tr>'; }
    }

    var stamp = q("a-stamp");
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
