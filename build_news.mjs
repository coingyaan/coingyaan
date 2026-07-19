/* CoinGyaan · News generator (build-time baking).
   Reads assets/js/news-data.js + news/_content/{slug}.html and writes
   news/{slug}/index.html with full SEO, JSON-LD, SVG cover, related
   intelligence and related articles baked in as real HTML.

   Run from repo root:  node build_news.mjs
*/
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = __dirname;
const SITE = "https://coingyaan.com";

const { NEWS_CATEGORIES, NEWS_TAGS, NEWS_INTEL_LINKS, NEWS_ARTICLES } =
  require(path.join(ROOT, "assets/js/news-data.js"));

const catBySlug = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.slug, c]));
const tagBySlug = Object.fromEntries(NEWS_TAGS.map((t) => [t.slug, t]));

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/* ---- V7 SVG cover: dark bg, soft glow, large centered icon, category accent ---- */
const ICONS = {
  bitcoin: '<path d="M0 -30 A30 30 0 1 0 0.01 -30 Z" fill="none"/><text x="0" y="14" font-size="44" font-family="JetBrains Mono, monospace" font-weight="800" text-anchor="middle" fill="COLOR">&#8383;</text>',
  ethereum: '<path d="M0 -34 L20 2 L0 14 L-20 2 Z M0 20 L20 6 L0 34 L-20 6 Z" fill="COLOR"/>',
  blocks: '<rect x="-26" y="-26" width="22" height="22" rx="3" fill="COLOR"/><rect x="4" y="-26" width="22" height="22" rx="3" fill="COLOR" opacity=".55"/><rect x="-26" y="4" width="22" height="22" rx="3" fill="COLOR" opacity=".55"/><rect x="4" y="4" width="22" height="22" rx="3" fill="COLOR"/>',
  agent: '<circle cx="0" cy="-6" r="16" fill="COLOR"/><rect x="-20" y="12" width="40" height="18" rx="9" fill="COLOR" opacity=".7"/>',
  defi: '<circle cx="-10" cy="0" r="16" fill="COLOR"/><circle cx="12" cy="0" r="16" fill="COLOR" opacity=".55"/>',
  gavel: '<rect x="-24" y="-24" width="30" height="12" rx="3" transform="rotate(45)" fill="COLOR"/><rect x="-4" y="16" width="34" height="8" rx="4" fill="COLOR" opacity=".7"/>',
  mic: '<rect x="-9" y="-30" width="18" height="34" rx="9" fill="COLOR"/><path d="M-16 0 A16 16 0 0 0 16 0" fill="none" stroke="COLOR" stroke-width="4" opacity=".7"/><rect x="-2" y="16" width="4" height="12" fill="COLOR" opacity=".7"/>',
};
function coverSvg(accent, iconKey, label) {
  const icon = (ICONS[iconKey] || ICONS.blocks).replace(/COLOR/g, accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${esc(label)}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1424"/><stop offset="100%" stop-color="#080c16"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(600 285) scale(3.1)">${icon}</g>
  <text x="600" y="470" font-family="JetBrains Mono, monospace" font-size="26" letter-spacing="6" text-anchor="middle" fill="#8a94a6">COINGYAAN INTELLIGENCE</text>
  <text x="600" y="512" font-family="Inter, sans-serif" font-size="30" font-weight="600" text-anchor="middle" fill="#e6ebf5">${esc(label)}</text>
</svg>`;
}

/* ---- related content by category + shared tags ---- */
function related(article, all, n = 3) {
  return all
    .filter((a) => a.type === "original" && a.slug !== article.slug)
    .map((a) => {
      let score = a.category === article.category ? 2 : 0;
      score += a.tags.filter((t) => article.tags.includes(t)).length;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || (y.a.date < x.a.date ? -1 : 1))
    .slice(0, n)
    .map((x) => x.a);
}
function relatedIntel(article) {
  const seen = new Set(), out = [];
  for (const t of article.tags) {
    for (const l of (NEWS_INTEL_LINKS[t] || [])) {
      if (!seen.has(l.href)) { seen.add(l.href); out.push(l); }
    }
  }
  return out.slice(0, 4);
}

/* ---- page template ---- */
function articleHtml(article, all) {
  const cat = catBySlug[article.category] || NEWS_CATEGORIES[0];
  const url = `${SITE}/news/${article.slug}/`;
  const coverIsAuto = !article.cover || article.cover === "auto";
  const coverAccent = (article.coverTag && tagBySlug[article.coverTag] && tagBySlug[article.coverTag].accent) || cat.accent;
  const coverIcon = (article.coverTag && tagBySlug[article.coverTag] && tagBySlug[article.coverTag].icon) || cat.icon;
  const ogImage = coverIsAuto ? `${SITE}/news/${article.slug}/cover.svg` : `${SITE}${article.cover}`;
  const body = fs.readFileSync(path.join(ROOT, "news/_content", article.slug + ".html"), "utf8");

  const tagChips = article.tags.map((t) => {
    const tg = tagBySlug[t]; if (!tg) return "";
    return `<a class="art-tag" href="/news/tag/${t}/">${esc(tg.name)}</a>`;
  }).join("");

  const intel = relatedIntel(article);
  const intelHtml = intel.length ? `
  <aside class="art-intel">
    <h2>Related Intelligence</h2>
    <div class="art-intel-links">${intel.map((l) => `<a href="${l.href}">${esc(l.label)} &#8594;</a>`).join("")}</div>
  </aside>` : "";

  const rel = related(article, all);
  const relHtml = rel.length ? `
  <section class="art-related">
    <h2>Related analysis</h2>
    <div class="art-rel-grid">${rel.map((a) => {
      const rc = catBySlug[a.category] || cat;
      return `<a class="art-rel-card" href="/news/${a.slug}/"><span class="art-rel-cat" style="color:${rc.accent}">${esc(rc.name)}</span><span class="art-rel-title">${esc(a.title)}</span></a>`;
    }).join("")}</div>
  </section>` : "";

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", "@id": url + "#article",
        "headline": article.title, "description": article.excerpt,
        "datePublished": article.date, "dateModified": article.updated || article.date,
        "author": { "@type": "Organization", "name": article.author || "CoinGyaan Intelligence" },
        "publisher": { "@type": "Organization", "name": "CoinGyaan", "logo": { "@type": "ImageObject", "url": SITE + "/assets/images/favicon/coingyaan-android-icon-512x512.png" } },
        "image": ogImage, "mainEntityOfPage": { "@id": url + "#webpage" }, "articleSection": cat.name, "inLanguage": "en-US" },
      { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/" },
        { "@type": "ListItem", "position": 2, "name": "News", "item": SITE + "/news/" },
        { "@type": "ListItem", "position": 3, "name": cat.name, "item": `${SITE}/news/${cat.slug}/` },
        { "@type": "ListItem", "position": 4, "name": article.title, "item": url },
      ] },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#0b1120" />
<meta name="color-scheme" content="dark" />
<title>${esc(article.title)} | CoinGyaan</title>
<meta name="description" content="${esc(article.excerpt)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="CoinGyaan" />
<meta property="og:title" content="${esc(article.title)}" />
<meta property="og:description" content="${esc(article.excerpt)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${ogImage}" />
<meta property="article:published_time" content="${article.date}" />
<meta property="article:section" content="${esc(cat.name)}" />
${article.tags.map((t) => `<meta property="article:tag" content="${esc((tagBySlug[t] || {}).name || t)}" />`).join("\n")}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@coin_gyaan" />
<meta name="twitter:title" content="${esc(article.title)}" />
<meta name="twitter:description" content="${esc(article.excerpt)}" />
<meta name="twitter:image" content="${ogImage}" />
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<meta name="google-adsense-account" content="ca-pub-9704432095241296" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon/coingyaan-favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/favicon/coingyaan-apple-touch-icon-180x180.png" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/coingyaan.css" />
<script async src="https://www.googletagmanager.com/gtag/js?id=G-DXY9ZZ543X"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-DXY9ZZ543X');</script>
</head>
<body>
<div id="site-nav"></div>
<main class="wrap art">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/news/">News</a><span>/</span><a href="/news/${cat.slug}/">${esc(cat.name)}</a></nav>
  <article class="art-body">
    <header class="art-head">
      <a class="art-cat" href="/news/${cat.slug}/" style="color:${cat.accent}">${esc(cat.name)}</a>
      <h1>${esc(article.title)}</h1>
      <div class="art-byline"><span>${esc(article.author || "CoinGyaan Intelligence")}</span><span class="art-dot">&#183;</span><time datetime="${article.date}">${fmtDate(article.date)}</time><span class="art-dot">&#183;</span><span>${article.readMins || 4} min read</span></div>
    </header>
    <figure class="art-cover">${coverIsAuto ? coverSvg(coverAccent, coverIcon, cat.name) : `<img src="${esc(article.cover)}" alt="${esc(article.title)}" width="1200" height="630" />`}</figure>
    <div class="art-content">
${body}
    </div>
    <div class="art-tags">${tagChips}</div>
${intelHtml}
  </article>
${relHtml}
</main>
<div id="site-footer"></div>
<script src="/assets/js/nav.js"></script>
<script src="/assets/js/footer.js"></script>
<script defer src="/assets/js/news-article.js"></script>
</body>
</html>
`;
}

/* ---- run ---- */
let built = 0;
for (const article of NEWS_ARTICLES.filter((a) => a.type === "original")) {
  const dir = path.join(ROOT, "news", article.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), articleHtml(article, NEWS_ARTICLES));
  const cat = catBySlug[article.category] || NEWS_CATEGORIES[0];
  if (!article.cover || article.cover === "auto") {
    const accent = (article.coverTag && tagBySlug[article.coverTag] && tagBySlug[article.coverTag].accent) || cat.accent;
    const icon = (article.coverTag && tagBySlug[article.coverTag] && tagBySlug[article.coverTag].icon) || cat.icon;
    fs.writeFileSync(path.join(dir, "cover.svg"), coverSvg(accent, icon, cat.name));
  }
  built++;
  console.log("built /news/" + article.slug + "/");
}
console.log(built + " article(s) generated");
