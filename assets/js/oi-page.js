/* CoinGyaan · /open-interest/ full page hydration. */
(function () {
  "use strict";
  var API = "/api/open-interest";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, v) { var el = q(sel); if (el && v != null) el.textContent = v; }
  function age(s) { return s == null || s < 60 ? "just now" : Math.round(s / 60) + "m ago"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function apply(p) {
    if (!p || !p.data) { var st = q("oi-stamp"); if (st) st.innerHTML = '<i class="dot"></i>Live data unavailable'; return; }
    var d = p.data;
    txt("oi-value", d.oiUsdDisplay);
    txt("oi-activity", d.activity);
    txt("oi-interp", d.interpretation);
    var ch = q("oi-change"); if (ch) { ch.textContent = d.changeDisplay; ch.style.color = toneColor[d.changeTone] || "#f59e0b"; }
    var ast = q("oi-activity-st"); if (ast) { ast.textContent = d.activity; ast.className = "st " + (toneClass[d.activityTone] || "st-amber"); }
    txt("oi-venue-count", (p.venues || []).length);

    var tb = q("oi-venues");
    if (tb && p.venues) {
      tb.innerHTML = p.venues.map(function (v) {
        return "<tr><td>" + esc(v.name) + '</td><td class="ol-read">' + esc(v.oiUsdDisplay) + "</td></tr>";
      }).join("");
    }
    var stamp = q("oi-stamp");
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
