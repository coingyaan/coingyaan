/* CoinGyaan · Related Intelligence live cards. Fills each card's value from its
   product API, keyed by data-intel-kind. Falls back to the static blurb. */
(function () {
  "use strict";
  var col = { up: "#16c784", down: "#ea3943", neutral: "#f59e0b", Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };

  function render(kind, d) {
    switch (kind) {
      case "outlook": return { text: d.direction + " \u00b7 " + d.upsideProbability + "% up", tone: d.direction };
      case "funding": return { text: (d.bias || "Neutral") + " funding", tone: d.tone };
      case "oi": return { text: d.activity + " activity", tone: d.activityTone };
      case "fng": return { text: d.value + " \u00b7 " + d.classification, tone: d.tone };
      case "altcoins": return { text: (d.seasonIndex != null ? d.seasonIndex + " \u00b7 " : "") + (d.seasonLabel || d.outlook), tone: d.tone };
      case "stablecoins": return { text: "Liquidity " + d.outlook, tone: d.outlookTone };
      default: return null;
    }
  }
  function fill(card) {
    var api = card.getAttribute("data-intel-api");
    var kind = card.getAttribute("data-intel-kind");
    var slot = card.querySelector("[data-intel-val]");
    if (!api || !slot) return;
    fetch(api, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (p) {
        if (!p || !p.data) return;
        var r = render(kind, p.data);
        if (!r) return;
        slot.textContent = r.text;
        if (r.tone && col[r.tone]) slot.style.color = col[r.tone];
      })
      .catch(function () {});
  }
  function run() {
    var cards = document.querySelectorAll(".art-intel-card[data-intel-api]");
    for (var i = 0; i < cards.length; i++) fill(cards[i]);
  }
  if (document.readyState !== "loading") run();
  else document.addEventListener("DOMContentLoaded", run);
})();
