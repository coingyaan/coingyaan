/* CoinGyaan homepage news feed: infinite scroll.
   The first 9 cards are baked into the HTML (SEO + no-JS fallback). This script
   lazy-loads the next batches of 9 from /news/feed.json as the reader nears the
   bottom, in publication order, with no duplicates. Drafts are never in the
   manifest. If JS or the fetch fails, the baked cards plus the "View all news"
   button remain as the fallback. */
(function () {
  "use strict";
  var feed = document.getElementById("home-feed");
  var sentinel = document.getElementById("home-feed-sentinel");
  if (!feed || !sentinel || !("IntersectionObserver" in window)) return;

  var BATCH = 9;
  var shown = parseInt(feed.getAttribute("data-shown") || "0", 10);
  var total = parseInt(feed.getAttribute("data-total") || "0", 10);
  if (shown >= total) { sentinel.style.display = "none"; return; }

  var data = null, loading = false, done = false;

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

  function card(a) {
    var ac = (a.cat && a.cat.accent) || "#f59e0b";
    var name = (a.cat && a.cat.name) || "";
    return '<a class="ecard" href="/news/' + a.slug + '/">'
      + '<span class="ethumb ethumb--brand"><img src="' + esc(a.thumb) + '" alt="' + esc(a.title) + '" loading="lazy" width="400" height="225" /></span>'
      + '<span class="ebody">'
      + '<span class="ecat" style="color:' + ac + ';border-color:' + ac + '40;background:' + ac + '14">' + esc(name) + '</span>'
      + '<span class="etitle">' + esc(a.title) + '</span>'
      + '<span class="eexc">' + esc(a.excerpt) + '</span>'
      + '<span class="emeta">' + esc(a.author) + ' \u00b7 ' + (a.readMins || 4) + ' min read</span>'
      + '</span></a>';
  }

  function finish() { done = true; io.disconnect(); sentinel.style.display = "none"; }

  function appendBatch() {
    if (!data) return;
    var next = data.slice(shown, shown + BATCH);
    if (next.length) {
      feed.insertAdjacentHTML("beforeend", next.map(card).join(""));
      shown += next.length;
    }
    if (shown >= data.length) finish();
  }

  function load() {
    if (loading || done) return;
    loading = true;
    if (data) { appendBatch(); loading = false; return; }
    fetch("/news/feed.json", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("feed " + r.status); return r.json(); })
      .then(function (j) { data = j; appendBatch(); loading = false; })
      .catch(function () { loading = false; /* baked cards + button remain as fallback */ });
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { load(); break; }
  }, { rootMargin: "400px 0px" });
  io.observe(sentinel);
})();
