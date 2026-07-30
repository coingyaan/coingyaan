/* CoinGyaan · surface articles into Intelligence pages and Market hubs.
   A page opts in with:  <section class="news-surface" data-news-surface="bitcoin" hidden>
                            <h2>Latest Intelligence</h2><div class="ns-mount"></div>
                          </section>
   The section stays hidden until at least one matching article exists, so pages
   never show an empty block. One article, many entry points, no duplication. */
(function () {
  "use strict";
  function ready(fn) { document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmt(d) { try { return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }); } catch (e) { return d; } }

  ready(function () {
    var sections = document.querySelectorAll(".news-surface[data-news-surface]");
    if (!sections.length || !window.NEWS_ARTICLES) return;
    var cats = {}; (window.NEWS_CATEGORIES || []).forEach(function (c) { cats[c.slug] = c; });
    var authors = window.NEWS_AUTHORS || {};

    sections.forEach(function (sec) {
      var tag = sec.getAttribute("data-news-surface");
      var mount = sec.querySelector(".ns-mount");
      if (!mount) return;
      var arts = (window.NEWS_ARTICLES || [])
        .filter(function (a) { return a.type === "original" && !a.draft && a.tags && a.tags.indexOf(tag) >= 0; })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; })
        .slice(0, 3);
      if (!arts.length) return; // leave hidden
      mount.innerHTML = '<div class="ns-grid">' + arts.map(function (a) {
        var c = cats[a.category] || { name: a.category, accent: "#f59e0b" };
        var au = (authors[a.author] || {}).name || "CoinGyaan Team";
        return '<a class="ns-card" href="/news/' + a.slug + '/">' +
          '<span class="ns-cat" style="color:' + c.accent + '">' + esc(c.name) + '</span>' +
          '<span class="ns-title">' + esc(a.title) + '</span>' +
          '<span class="ns-meta">' + esc(au) + ' \u00b7 ' + fmt(a.date) + '</span></a>';
      }).join("") + '</div>' +
        '<a class="ns-all" href="/news/tag/' + tag + '/">View all ' + esc((window.NEWS_TAGS || []).filter(function (t) { return t.slug === tag; }).map(function (t) { return t.name; })[0] || tag) + ' analysis &#8594;</a>';
      sec.removeAttribute("hidden");
    });
  });
})();
