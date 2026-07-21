# CoinGyaan Publishing Guide

How to write and publish a new Intelligence article on your own, straight from
GitHub, with no build tools on your computer and no help from Claude.

You edit two files (sometimes three), push to GitHub, and a GitHub Action bakes
everything: the article page, homepage card, category page, tag pages, related
sections, Open Graph image, sitemap, RSS and search index. Then Cloudflare
deploys it.

---

## The one rule

You only ever edit these things by hand:

1. `assets/js/news-data.js`  → add one article entry
2. `news/_content/{slug}.html` → the article body
3. `assets/logos/{tag}.svg`  → only if the article's asset has no logo yet

You never edit the generated pages under `/news/{slug}/`. The Action writes
those. If you edit them by hand they get overwritten.

---

## Step 1 — Add the article entry

Open `assets/js/news-data.js`. Find `var NEWS_ARTICLES = [`. Add a new object
at the TOP of the list (newest first). Copy this template and fill it in:

```js
{
  type: "original",
  slug: "how-fear-and-greed-impacts-bitcoin",   // becomes /news/how-fear-and-greed-impacts-bitcoin/
  title: "How Fear and Greed Impacts Short Term Bitcoin Price Direction",
  category: "blockchain",         // one of: blockchain, ai-agents, defi, regulation, press-releases
  tags: ["bitcoin", "fear-greed", "market-outlook"],  // any slugs from NEWS_TAGS
  date: "2026-07-22",             // YYYY-MM-DD
  updated: "2026-07-22",
  author: "monesh-kumar",         // one of: coingyaan-team, monesh-kumar, mangal-mishra, koh-larn
  readMins: 6,
  excerpt: "A short two sentence summary. This shows on the cards, the listing pages and as the meta description.",
  cover: "auto",                  // always "auto" — the thumbnail is generated
  coverTag: "bitcoin",            // which asset logo sits on the thumbnail (a tag slug with a logo)
  featured: true,
},
```

Rules that matter:

- `slug` must be unique, lowercase, words separated by hyphens. It is the URL.
- `category` must be exactly one of the five category slugs above.
- `tags` control where the article surfaces. Use asset tags (bitcoin, ethereum,
  solana, base, ...) and concept tags (funding-rate, open-interest, fear-greed,
  etf, market-outlook, stablecoins, ...). See the `NEWS_TAGS` list in the same
  file for every available slug.
- `coverTag` decides the logo on the thumbnail. It should be an asset tag that
  has a logo file in `assets/logos/`. If it does not, do Step 3 first.
- Keep `cover: "auto"`. Do not point it at an image; the system makes the image.

Do not put a comma before "and" or "or" in the title or excerpt. No dashes in
the visible text.

---

## Step 2 — Write the article body

Create a new file at `news/_content/{slug}.html` where `{slug}` is exactly the
slug from Step 1. This file is ONLY the article body, no head, no title (the
title comes from the data entry). Use normal HTML tags.

Minimum useful body:

```html
<p class="art-lead">Your opening paragraph. This is the standout intro line.</p>

<h2>A section heading</h2>
<p>Normal paragraph text. Write as many h2 sections and paragraphs as you like.</p>

<h2>Another section</h2>
<p>More analysis.</p>
```

Optional building blocks you can drop in anywhere:

Key takeaways box:

```html
<div class="art-key">
  <h3>Key takeaways</h3>
  <ul>
    <li>First point.</li>
    <li>Second point.</li>
  </ul>
</div>
```

A live signal box (pulls the real number from your engines at page load). Use
`bitcoin-outlook`, `eth-outlook` or `sol-outlook`:

```html
<div class="art-live" data-signal="bitcoin-outlook">
  <div class="art-live-hd"><span class="art-live-dot"></span>Live Bitcoin Outlook</div>
  <div class="art-live-body">
    <div class="art-live-big"><span data-cg="al-upside">--</span><b>%</b><span class="art-live-cap">upside over 24h</span></div>
    <div class="art-live-meta"><span data-cg="al-direction">Reading</span> &#183; <span data-cg="al-condition">market</span></div>
  </div>
  <a class="art-live-cta" href="/bitcoin-outlook/">Open the full Bitcoin Outlook &#8594;</a>
</div>
```

A disclaimer note:

```html
<div class="art-note">
  <strong>How to read this</strong>
  <p>CoinGyaan provides market intelligence and educational analysis. Nothing here is financial advice.</p>
</div>
```

---

## Step 3 — Add an asset logo (only if it is missing)

If your `coverTag` asset has no logo yet, the thumbnail falls back to a neutral
placeholder. To use the official logo:

1. Download the official SVG from the project's brand kit or GitHub.
2. Save it as `assets/logos/{tag}.svg` (for example `assets/logos/sui.svg`).
   The filename must match the tag slug.
3. If the tag does not exist yet, add it to `NEWS_TAGS` in `news-data.js`:
   `{ slug: "sui", name: "Sui", accent: "#4da2ff" },`

Never redraw a logo. Only use the official file. See
`assets/logos/README.md` for the full asset standard.

---

## Step 4 — Push to GitHub

Commit the files you changed and push to `main`. On GitHub's website you can
edit and commit files directly in the browser if you prefer.

The `Build News` Action runs automatically, regenerates everything, and commits
the result. Cloudflare then deploys. Give it two or three minutes.

You can watch it under the repo's Actions tab. If it is green, your article is
live at `/news/{slug}/` and appears on the homepage, its category page, each of
its tag pages, search, RSS and the sitemap.

---

## If you ever want to build locally instead of using the Action

You need Node and Python once:

```
npm --version        # if missing, install Node from nodejs.org
python3 --version    # if missing, install Python from python.org
pip install cairosvg
```

Then from the repo root:

```
node build_news.mjs
python3 build_og.py
git add -A
git commit -m "Publish: {slug}"
git push
```

That produces the exact same result as the Action.

---

## Quick checklist before you push

- New entry added at the top of `NEWS_ARTICLES`, unique slug.
- `news/_content/{slug}.html` exists and matches the slug.
- `category` is one of the five valid slugs.
- `coverTag` points at an asset that has a logo (or you added the logo).
- No dashes in the title or excerpt. No comma before "and" or "or".
- Pushed to `main`. Actions tab shows green.

That is the whole process. Two files, one push.
