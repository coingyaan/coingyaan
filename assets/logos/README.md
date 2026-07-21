# CoinGyaan News Asset Standard

This folder is the single source of truth for logos used on article thumbnails.
The generator (`build_news.mjs`) only ever pulls the SVG from here and drops it
into the thumbnail template. It never draws or recreates a logo.

## Rules

1. Do not generate or redraw cryptocurrency, blockchain, or CoinGyaan logos.
2. Always use the official SVG from the project's official brand kit or GitHub.
3. One file per asset, named by its tag slug: `bitcoin.svg`, `ethereum.svg`,
   `solana.svg`, `base.svg`, `arbitrum.svg`, `sui.svg`, `aptos.svg`, and so on.
4. The tag slug in `assets/js/news-data.js` must match the filename.

## How to add or replace a logo

1. Download the official SVG from the project brand kit.
2. Save it here as `{tag}.svg` (overwrite the placeholder if one exists).
3. Tell Claude to rebuild, or run: `node build_news.mjs && python3 build_og.py`

That is the only step. The thumbnail, hero, homepage card, listing thumbnails,
Open Graph image and Twitter image all update automatically from that one file.

## Placeholders

Files that start with an HTML comment `<!-- PLACEHOLDER ... -->` are neutral
lettermarks, NOT official logos. They exist so the system never renders a fake
brand. Replace each with the official SVG when available.

## CoinGyaan branding

Drop the official CoinGyaan mark here as `coingyaan.svg` and it will appear
subtly on every thumbnail. Until then a small text wordmark is used (never a
redrawn icon). Provide a vector SVG (a clean single-color version works best on
the dark thumbnail background).

## Thumbnail = one master asset

Every article has exactly one generated thumbnail. It is the master asset used
everywhere: homepage card, news page, category and tag pages, search results,
article hero, Open Graph image, Twitter image. There is no separate hero graphic.
Only the logo, glow color and accent change between assets; the background,
grid and layout stay identical.
