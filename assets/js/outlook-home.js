/* CoinGyaan · homepage Bitcoin Outlook hydration
   Fetches /api/bitcoin-outlook and fills the hero card and the intelligence
   mini card. If the API is unreachable, the static fallback values stay. */
(function () {
  "use strict";
  var API = "/api/bitcoin-outlook";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber", info: "st-blue" };
  var toneColor = { up: "#16c784", down: "#ea3943", neutral: "var(--gold)", info: "#60a5fa" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, val) { var el = q(sel); if (el && val != null) el.textContent = val; }
  function age(s) { if (s == null) return ""; if (s < 60) return "just now"; return Math.round(s / 60) + "m ago"; }

  function pill(sel, val, tone) {
    var el = q(sel); if (!el) return;
    el.textContent = val; el.style.color = toneColor[tone] || "var(--gold)";
  }
  function row(sel, val, tone) {
    txt(sel, val);
    var st = q(sel + "-st");
    if (st) { st.className = "st " + (toneClass[tone] || "st-amber"); }
  }

  function apply(p) {
    if (!p || !p.data) return;
    var d = p.data, t = d.tones || {};

    // hero: probability
    var big = q("upside"); if (big) big.innerHTML = d.upsideProbability + "<span>%</span>";
    txt("summary", d.summary);
    var bar = q("bar"); if (bar) bar.style.width = d.upsideProbability + "%";

    // hero: pills
    pill("direction-pill", d.direction, t.direction);
    pill("confidence-pill", d.confidenceLabel, t.confidence);

    // hero: table
    row("direction", d.direction, t.direction);
    var ds = q("direction-st"); if (ds) ds.textContent = d.direction;
    row("confidence", d.confidenceLabel, t.confidence);
    var cs = q("confidence-st"); if (cs) cs.textContent = d.confidenceLabel;
    row("condition", d.condition, t.condition);
    var cd = q("condition-st"); if (cd) cd.textContent = d.condition;
    txt("range", d.expectedRange.display);
    var rs = q("range-st"); if (rs) { rs.textContent = "\u00b1" + d.expectedRange.pct + "%"; rs.className = "st " + (toneClass[t.range] || "st-green"); }

    // hero: bias
    var bd = q("bias-down"), bu = q("bias-up");
    if (bd) { bd.style.width = d.bias.downside + "%"; bd.textContent = d.bias.downside + "%"; }
    if (bu) { bu.style.width = d.bias.upside + "%"; bu.textContent = d.bias.upside + "%"; }
    txt("legend-down", "Downside " + d.bias.downside + "% \u2193");
    txt("legend-up", "\u2191 Upside " + d.bias.upside + "%");

    // freshness stamp
    var stamp = q("stamp");
    if (stamp) {
      var label = p.status === "stale" ? "Delayed" : "Live";
      stamp.innerHTML = '<i class="dot"></i>' + label + " \u00b7 updated " + age(p.ageSeconds);
    }

    // intelligence mini card
    var ib = q("ipc-upside"); if (ib) ib.textContent = d.upsideProbability + "%";
    var ibar = q("ipc-bar"); if (ibar) ibar.style.width = d.upsideProbability + "%";
    var idir = q("ipc-direction"); if (idir) { idir.textContent = d.direction; idir.style.color = toneColor[t.direction] || "#60a5fa"; }
    txt("ipc-confidence", d.confidenceLabel);
    txt("ipc-condition", d.condition);
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(apply)
      .catch(function () { /* keep static fallback */ });
  }

  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000); // refresh every 5 min while the page is open
})();
