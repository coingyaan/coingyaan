/* CoinGyaan · News generator (build-time baking).
   Reads assets/js/news-data.js + news/_content/{slug}.html and writes:
     /news/{slug}/index.html        article pages (full SEO, live intel cards)
     /news/index.html               all articles, newest first
     /news/{category}/index.html    category listings
     /news/tag/{tag}/index.html     tag listings (empty state until articles)
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

const { NEWS_CATEGORIES, NEWS_TAGS, NEWS_AUTHORS, NEWS_INTEL_LINKS, NEWS_ARTICLES } =
  require(path.join(ROOT, "assets/js/news-data.js"));

const catBySlug = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.slug, c]));
const tagBySlug = Object.fromEntries(NEWS_TAGS.map((t) => [t.slug, t]));
const originals = NEWS_ARTICLES.filter((a) => a.type === "original")
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function fmtDate(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
function authorOf(a) {
  const k = a.author || "coingyaan-team";
  return NEWS_AUTHORS[k] || { name: "CoinGyaan Team", title: "CoinGyaan" };
}

/* ---------- V7 covers with official asset logos ---------- */
/* Load logo SVGs from assets/logos/{tag}.svg once. Returns inner markup. */
const LOGO_DIR = path.join(ROOT, "assets/logos");
const logoCache = {};
function logoInner(tag) {
  if (!tag) return null;
  if (tag in logoCache) return logoCache[tag];
  const f = path.join(LOGO_DIR, tag + ".svg");
  let inner = null;
  if (fs.existsSync(f)) {
    const raw = fs.readFileSync(f, "utf8");
    const m = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    inner = m ? m[1].trim() : null;
  }
  logoCache[tag] = inner;
  return inner;
}
const CAT_ICONS = {
  blocks: '<rect x="-26" y="-26" width="22" height="22" rx="3" fill="COLOR"/><rect x="4" y="-26" width="22" height="22" rx="3" fill="COLOR" opacity=".55"/><rect x="-26" y="4" width="22" height="22" rx="3" fill="COLOR" opacity=".55"/><rect x="4" y="4" width="22" height="22" rx="3" fill="COLOR"/>',
  agent: '<circle cx="0" cy="-6" r="16" fill="COLOR"/><rect x="-20" y="12" width="40" height="18" rx="9" fill="COLOR" opacity=".7"/>',
  defi: '<circle cx="-10" cy="0" r="16" fill="COLOR"/><circle cx="12" cy="0" r="16" fill="COLOR" opacity=".55"/>',
  gavel: '<rect x="-24" y="-24" width="30" height="12" rx="3" transform="rotate(45)" fill="COLOR"/><rect x="-4" y="16" width="34" height="8" rx="4" fill="COLOR" opacity=".7"/>',
  mic: '<rect x="-9" y="-30" width="18" height="34" rx="9" fill="COLOR"/><path d="M-16 0 A16 16 0 0 0 16 0" fill="none" stroke="COLOR" stroke-width="4" opacity=".7"/><rect x="-2" y="16" width="4" height="12" fill="COLOR" opacity=".7"/>',
};
function coverSvg({ accent, catIcon, logo, label, showLabel }) {
  const centerpiece = logo
    ? `<g transform="translate(600 288) scale(1.9) translate(-64 -64)">${logo}</g>`
    : `<g transform="translate(600 288) scale(3)">${(CAT_ICONS[catIcon] || CAT_ICONS.blocks).replace(/COLOR/g, accent)}</g>`;
  const name = showLabel
    ? `<text x="600" y="452" font-family="JetBrains Mono, monospace" font-size="30" font-weight="700" letter-spacing="9" text-anchor="middle" fill="#e6ebf5">${esc((label || "").toUpperCase())}</text>`
    : "";
  // subtle grid matching the homepage news cards
  const grid = `<g stroke="#1e3048" stroke-width="1" opacity=".4"><path d="M0 105h1200M0 210h1200M0 315h1200M0 420h1200M0 525h1200M200 0v630M400 0v630M600 0v630M800 0v630M1000 0v630"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${esc(label)}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="44%" r="52%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d1626"/><stop offset="100%" stop-color="#080c16"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${grid}
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${centerpiece}
  ${name}
  <g transform="translate(600 560)" opacity=".6">
    <circle cx="-46" cy="-4" r="9" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <path d="M-49 -4 a3 3 0 0 1 6 0" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="-30" y="1" font-family="JetBrains Mono, monospace" font-size="17" font-weight="700" fill="#c7cfdd">CoinGyaan</text>
  </g>
</svg>`;
}
let __coverUid = 0;
function uniquifyIds(svg) {
  const uid = "c" + (++__coverUid);
  return svg
    .replace(/id="([^"]+)"/g, (m, id) => `id="${id}-${uid}"`)
    .replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${id}-${uid})`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, (m, attr, id) => `${attr}="#${id}-${uid}"`);
}
/* 400x225 homepage/listing thumbnail, same design language as the cover */
function homeThumb({ accent, catIcon, logo, label, showLabel }) {
  const centerpiece = logo
    ? `<g transform="translate(200 96) scale(0.62) translate(-64 -64)">${logo}</g>`
    : `<g transform="translate(200 96) scale(1)">${(CAT_ICONS[catIcon] || CAT_ICONS.blocks).replace(/COLOR/g, accent)}</g>`;
  const name = showLabel
    ? `<text x="200" y="168" font-family="JetBrains Mono, monospace" font-size="13.5" font-weight="700" letter-spacing="3.5" text-anchor="middle" fill="#e2e8f0">${esc((label || "").toUpperCase())}</text>`
    : "";
  return `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="glow" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="${accent}" stop-opacity=".26"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="400" height="225" fill="#0d1626"/><g stroke="#1e3048" stroke-width="1" opacity=".4"><path d="M0 56h400M0 112h400M0 169h400M100 0v225M200 0v225M300 0v225"/></g><rect width="400" height="225" fill="url(#glow)"/>${centerpiece}${name}</svg>`;
}
function coverFor(article) {
  const cat = catBySlug[article.category] || NEWS_CATEGORIES[0];
  const logo = article.coverTag ? logoInner(article.coverTag) : null;
  const accent = (article.coverTag && tagBySlug[article.coverTag] && tagBySlug[article.coverTag].accent) || cat.accent;
  const isAsset = !!(logo && tagBySlug[article.coverTag]);
  const label = isAsset ? tagBySlug[article.coverTag].name : cat.name;
  return { svg: uniquifyIds(coverSvg({ accent, catIcon: cat.icon, logo, label, showLabel: isAsset })), auto: !article.cover || article.cover === "auto" };
}

/* ---------- relationships ---------- */
function relatedArticles(article, n = 3) {
  return originals.filter((a) => a.slug !== article.slug)
    .map((a) => { let s = a.category === article.category ? 2 : 0; s += a.tags.filter((t) => article.tags.includes(t)).length; return { a, s }; })
    .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, n).map((x) => x.a);
}
function relatedIntel(article) {
  const seen = new Set(), out = [];
  for (const t of article.tags) for (const l of (NEWS_INTEL_LINKS[t] || [])) if (!seen.has(l.href)) { seen.add(l.href); out.push(l); }
  return out.slice(0, 4);
}

/* ---------- shared head + chrome ---------- */
function head({ title, desc, url, ogImage, extraLd }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#0b1120" />
<meta name="color-scheme" content="dark" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="CoinGyaan" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${ogImage || SITE + "/assets/images/social/universal-share.png"}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@coin_gyaan" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${ogImage || SITE + "/assets/images/social/universal-share.png"}" />
${extraLd ? `<script type="application/ld+json">\n${JSON.stringify(extraLd, null, 2)}\n</script>` : ""}
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
<div id="site-nav"></div>`;
}
const FOOT_ARTICLE = `<div id="site-footer"></div>
<script src="/assets/js/nav.js"></script>
<script src="/assets/js/footer.js"></script>
<script defer src="/assets/js/news-article.js"></script>
<script defer src="/assets/js/news-intel.js"></script>
</body>
</html>
`;
const FOOT_LIST = `<div id="site-footer"></div>
<script src="/assets/js/nav.js"></script>
<script src="/assets/js/footer.js"></script>
</body>
</html>
`;

/* article listing card (used on index/category/tag pages) */
function listCard(a) {
  const cat = catBySlug[a.category] || NEWS_CATEGORIES[0];
  const cover = coverFor(a);
  return `<a class="nl-card" href="/news/${a.slug}/">
    <span class="nl-cover">${cover.svg}</span>
    <span class="nl-body">
      <span class="nl-cat" style="color:${cat.accent}">${esc(cat.name)}</span>
      <span class="nl-title">${esc(a.title)}</span>
      <span class="nl-meta">${esc(authorOf(a).name)} &#183; ${fmtDate(a.date)}</span>
    </span>
  </a>`;
}
function listPage({ title, desc, url, heading, sub, articles, crumbLabel }) {
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name: "News", item: SITE + "/news/" },
    ...(crumbLabel ? [{ "@type": "ListItem", position: 3, name: crumbLabel, item: url }] : []),
  ] };
  const grid = articles.length
    ? `<div class="nl-grid">${articles.map(listCard).join("")}</div>`
    : `<div class="nl-empty"><p>No articles yet.</p><p class="nl-empty-sub">CoinGyaan Intelligence on this topic is coming soon. In the meantime, explore our live market intelligence.</p><a class="nl-empty-cta" href="/intelligence/">Explore Intelligence &#8594;</a></div>`;
  return head({ title, desc, url, extraLd: ld }) + `
<main class="wrap nl">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/news/">News</a>${crumbLabel ? `<span>/</span><span>${esc(crumbLabel)}</span>` : ""}</nav>
  <span class="page-eyebrow">News</span>
  <h1>${esc(heading)}</h1>
  <p class="page-lead">${esc(sub)}</p>
  ${grid}
</main>
` + FOOT_LIST;
}

/* ---------- article page ---------- */
function articleHtml(article) {
  const cat = catBySlug[article.category] || NEWS_CATEGORIES[0];
  const url = `${SITE}/news/${article.slug}/`;
  const cover = coverFor(article);
  const ogImage = cover.auto ? `${url}cover.png` : `${SITE}${article.cover}`;
  const body = fs.readFileSync(path.join(ROOT, "news/_content", article.slug + ".html"), "utf8");
  const au = authorOf(article);

  const tagChips = article.tags.map((t) => tagBySlug[t] ? `<a class="art-tag" href="/news/tag/${t}/">${esc(tagBySlug[t].name)}</a>` : "").join("");

  const intel = relatedIntel(article);
  const intelHtml = intel.length ? `
  <aside class="art-intel">
    <h2>Related Intelligence</h2>
    <div class="art-intel-cards">${intel.map((l) => `<a class="art-intel-card" href="${l.href}"${l.api ? ` data-intel-api="${l.api}" data-intel-kind="${l.kind}"` : ""}>
      <span class="art-intel-name">${esc(l.label)}</span>
      <span class="art-intel-val"${l.api ? ' data-intel-val' : ""}>${l.api ? "Loading" : esc(l.blurb)}</span>
      <span class="art-intel-blurb">${esc(l.blurb)}</span>
    </a>`).join("")}</div>
  </aside>` : "";

  const rel = relatedArticles(article);
  const relHtml = rel.length ? `
  <section class="art-related">
    <h2>Related analysis</h2>
    <div class="art-rel-grid">${rel.map((a) => { const rc = catBySlug[a.category] || cat; return `<a class="art-rel-card" href="/news/${a.slug}/"><span class="art-rel-cat" style="color:${rc.accent}">${esc(rc.name)}</span><span class="art-rel-title">${esc(a.title)}</span></a>`; }).join("")}</div>
  </section>` : "";

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", "@id": url + "#article", headline: article.title, description: article.excerpt,
      datePublished: article.date, dateModified: article.updated || article.date,
      author: { "@type": "Person", name: au.name }, publisher: { "@type": "Organization", name: "CoinGyaan", logo: { "@type": "ImageObject", url: SITE + "/assets/images/favicon/coingyaan-android-icon-512x512.png" } },
      image: ogImage, mainEntityOfPage: { "@id": url + "#webpage" }, articleSection: cat.name, keywords: article.tags.map((t) => (tagBySlug[t] || {}).name || t).join(", "), inLanguage: "en-US" },
    { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "News", item: SITE + "/news/" },
      { "@type": "ListItem", position: 3, name: cat.name, item: `${SITE}/news/${cat.slug}/` },
      { "@type": "ListItem", position: 4, name: article.title, item: url },
    ] },
  ] };

  return head({ title: `${article.title} | CoinGyaan`, desc: article.excerpt, url, ogImage, extraLd: null })
    .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />')
    + `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>` + `
<main class="wrap art">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/news/">News</a><span>/</span><a href="/news/${cat.slug}/">${esc(cat.name)}</a></nav>
  <article class="art-body">
    <header class="art-head">
      <a class="art-cat" href="/news/${cat.slug}/" style="color:${cat.accent}">${esc(cat.name)}</a>
      <h1>${esc(article.title)}</h1>
      <div class="art-byline"><span class="art-author">${esc(au.name)}</span><span class="art-dot">&#183;</span><time datetime="${article.date}">${fmtDate(article.date)}</time><span class="art-dot">&#183;</span><span>${article.readMins || 4} min read</span></div>
    </header>
    <figure class="art-cover">${cover.svg}</figure>
    <div class="art-content">
${body}
    </div>
    <div class="art-tags">${tagChips}</div>
${intelHtml}
  </article>
${relHtml}
</main>
` + FOOT_ARTICLE;
}

/* ---------- run ---------- */
let n = 0;
for (const article of originals) {
  const dir = path.join(ROOT, "news", article.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), articleHtml(article));
  const cover = coverFor(article);
  if (cover.auto) fs.writeFileSync(path.join(dir, "cover.svg"), cover.svg);
  n++; console.log("article  /news/" + article.slug + "/");
}
/* index */
fs.mkdirSync(path.join(ROOT, "news"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "news", "index.html"), listPage({
  title: "News & Intelligence | CoinGyaan", desc: "Original CoinGyaan Intelligence and the latest crypto analysis. We explain why the market moved.",
  url: SITE + "/news/", heading: "News & Intelligence", sub: "Original analysis from the CoinGyaan desk. We explain why the market moved, our live Intelligence explains what it is doing now.",
  articles: originals, crumbLabel: null,
}));
console.log("index    /news/");
/* categories */
for (const c of NEWS_CATEGORIES) {
  const dir = path.join(ROOT, "news", c.slug); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), listPage({
    title: `${c.name} News & Analysis | CoinGyaan`, desc: `${c.blurb} CoinGyaan Intelligence and analysis on ${c.name}.`,
    url: `${SITE}/news/${c.slug}/`, heading: c.name, sub: c.blurb,
    articles: originals.filter((a) => a.category === c.slug), crumbLabel: c.name,
  }));
  console.log("category /news/" + c.slug + "/");
}
/* tags */
for (const t of NEWS_TAGS) {
  const dir = path.join(ROOT, "news", "tag", t.slug); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), listPage({
    title: `${t.name} | CoinGyaan News & Intelligence`, desc: `All CoinGyaan analysis and headlines tagged ${t.name}.`,
    url: `${SITE}/news/tag/${t.slug}/`, heading: t.name, sub: `Every CoinGyaan Intelligence article and headline tagged ${t.name}.`,
    articles: originals.filter((a) => a.tags.includes(t.slug)), crumbLabel: t.name,
  }));
}
/* author pages */
const authorArticles = {};
for (const a of originals) { (authorArticles[a.author || "coingyaan-team"] ||= []).push(a); }
for (const key of Object.keys(NEWS_AUTHORS)) {
  const au = NEWS_AUTHORS[key];
  const dir = path.join(ROOT, "news", "author", key); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), listPage({
    title: `${au.name} | CoinGyaan`, desc: `Articles and analysis by ${au.name}, ${au.title}.`,
    url: `${SITE}/news/author/${key}/`, heading: au.name, sub: au.title,
    articles: authorArticles[key] || [], crumbLabel: au.name,
  }));
}
console.log(Object.keys(NEWS_AUTHORS).length + " author pages");

/* sitemap-news.xml */
const now = new Date().toISOString().slice(0, 10);
const smUrls = [
  `${SITE}/news/`,
  ...NEWS_CATEGORIES.map((c) => `${SITE}/news/${c.slug}/`),
  ...NEWS_TAGS.map((t) => `${SITE}/news/tag/${t.slug}/`),
  ...Object.keys(NEWS_AUTHORS).map((k) => `${SITE}/news/author/${k}/`),
  ...originals.map((a) => `${SITE}/news/${a.slug}/`),
];
fs.writeFileSync(path.join(ROOT, "sitemap-news.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  smUrls.map((u) => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`);
console.log("sitemap-news.xml (" + smUrls.length + " urls)");

/* RSS feed */
fs.mkdirSync(path.join(ROOT, "news"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "news", "rss.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n` +
  `<title>CoinGyaan Intelligence</title>\n<link>${SITE}/news/</link>\n<description>Original crypto market intelligence from CoinGyaan.</description>\n<language>en-us</language>\n` +
  originals.slice(0, 30).map((a) => {
    const cat = catBySlug[a.category] || NEWS_CATEGORIES[0];
    return `<item>\n  <title>${esc(a.title)}</title>\n  <link>${SITE}/news/${a.slug}/</link>\n  <guid>${SITE}/news/${a.slug}/</guid>\n  <category>${esc(cat.name)}</category>\n  <pubDate>${new Date(a.date + "T09:00:00Z").toUTCString()}</pubDate>\n  <description>${esc(a.excerpt)}</description>\n</item>`;
  }).join("\n") +
  `\n</channel></rss>\n`);
console.log("news/rss.xml");

/* search index */
fs.writeFileSync(path.join(ROOT, "news", "search-index.json"), JSON.stringify(originals.map((a) => ({
  slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.category, tags: a.tags, date: a.date,
  author: authorOf(a).name, url: `/news/${a.slug}/`,
})), null, 0));
console.log("news/search-index.json");

/* homepage feed injection (build-time, between markers) */
const HOME = path.join(ROOT, "index.html");
if (fs.existsSync(HOME)) {
  let html = fs.readFileSync(HOME, "utf8");
  const START = "<!-- NEWS-FEED:START -->", END = "<!-- NEWS-FEED:END -->";
  if (html.includes(START) && html.includes(END)) {
    const cards = originals.slice(0, 6).map((a) => {
      const cat = catBySlug[a.category] || NEWS_CATEGORIES[0];
      const logo = a.coverTag ? logoInner(a.coverTag) : null;
      const accent = (a.coverTag && tagBySlug[a.coverTag] && tagBySlug[a.coverTag].accent) || cat.accent;
      const isAsset = !!(logo && tagBySlug[a.coverTag]);
      const thumb = uniquifyIds(homeThumb({ accent, catIcon: cat.icon, logo, label: isAsset ? tagBySlug[a.coverTag].name : cat.name, showLabel: isAsset }));
      return `<a class="ecard" href="/news/${a.slug}/">
        <span class="ethumb ethumb--brand">${thumb}</span>
        <span class="ebody">
          <span class="ecat" style="color:${cat.accent};border-color:${cat.accent}40;background:${cat.accent}14">${esc(cat.name)}</span>
          <span class="etitle">${esc(a.title)}</span>
          <span class="eexc">${esc(a.excerpt)}</span>
          <span class="emeta">${esc(authorOf(a).name)} &middot; ${a.readMins || 4} min read</span>
        </span>
      </a>`;
    }).join("\n");
    const inner = originals.length
      ? `<div class="efeed">\n${cards}\n</div>`
      : `<div class="nl-empty" style="margin-top:8px"><p>No articles published yet.</p><p class="nl-empty-sub">CoinGyaan Intelligence articles will appear here as they publish.</p><a class="nl-empty-cta" href="/intelligence/">Explore live Intelligence &#8594;</a></div>`;
    html = html.replace(new RegExp(START + "[\\s\\S]*?" + END), START + "\n" + inner + "\n" + END);
    fs.writeFileSync(HOME, html);
    console.log("homepage feed injected (" + Math.min(originals.length, 6) + " cards)");
  } else {
    console.log("homepage: NEWS-FEED markers not found, skipped");
  }
}

console.log(NEWS_TAGS.length + " tag pages, " + NEWS_CATEGORIES.length + " category pages, " + n + " article(s)");
