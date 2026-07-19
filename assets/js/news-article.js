/* CoinGyaan · article live-signal embeds. The only runtime piece in an
   otherwise fully baked article: fills <div class="art-live" data-signal>. */
(function () {
  "use strict";
  var MAP = {
    "bitcoin-outlook": "/api/bitcoin-outlook",
    "eth-outlook": "/api/eth-outlook",
    "sol-outlook": "/api/sol-outlook",
  };
  var col = { Bullish: "#16c784", Bearish: "#ea3943", Neutral: "#f59e0b" };

  function fill(block) {
    var key = block.getAttribute("data-signal");
    var url = MAP[key];
    if (!url) return;
    fetch(url, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (p) {
        if (!p || !p.data) return;
        var d = p.data;
        var up = block.querySelector('[data-cg="al-upside"]');
        if (up) up.textContent = d.upsideProbability;
        var dir = block.querySelector('[data-cg="al-direction"]');
        if (dir) { dir.textContent = d.direction; dir.style.color = col[d.direction] || "#f59e0b"; }
        var cond = block.querySelector('[data-cg="al-condition"]');
        if (cond) cond.textContent = d.condition;
      })
      .catch(function () {});
  }

  function run() {
    var blocks = document.querySelectorAll(".art-live[data-signal]");
    for (var i = 0; i < blocks.length; i++) fill(blocks[i]);
  }
  if (document.readyState !== "loading") run();
  else document.addEventListener("DOMContentLoaded", run);
})();
