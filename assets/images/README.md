# CoinGyaan Image Assets

Single source of truth for every image. Four folders, one purpose each. No
duplicates: an image lives in exactly one folder.

- `brand/`         Permanent brand assets only (logo, hero, universal share). Versioned.
- `articles/`      One generated thumbnail per article: `{slug}.svg` and `{slug}.png`.
- `intelligence/`  Reusable educational diagrams shared across articles.
- `social/`        Reusable social templates (OG default, LinkedIn, X).
- `favicon/`       Site favicons and touch icons (standard, kept separate).

## Naming
Lowercase, hyphenated, descriptive: `funding-rate.png`, `fear-greed.svg`,
`stablecoin-liquidity.png`. Never `FundingRate.png`, `Funding_Rate.png`,
`Image1.png`, or `final-final.png`.

## Versioning (brand assets)
Brand assets carry a version suffix so a redesign never overwrites the live
asset: `hero-v1.png`, `universal-share-v1.png`. Introduce `-v2` during
development, test, then switch references. Keeps a clean rollback path.
