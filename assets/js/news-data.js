/* CoinGyaan · News + Intelligence data layer (source of truth).
   One entry per article. The generator (build_news.py) bakes real HTML pages,
   index, category and tag pages, and internal links from this file.

   Content types:
     type: "original"  → CoinGyaan Intelligence, SEO asset, lives at /news/{slug}/
     type: "external"  → aggregated headline, metadata only, links out (added later)

   Publishing an original article:
     1. Add an entry to ARTICLES below (newest first).
     2. Put the body HTML in news/_content/{slug}.html
     3. Run the generator.
*/

/* Primary editorial categories (locked). slug drives /news/{category}/ pages.
   accent + icon drive the V7 SVG cover identity. */
var NEWS_CATEGORIES = [
  { slug: "blockchain", name: "Blockchain", accent: "#f59e0b", icon: "blocks", blurb: "Protocol level analysis across the major chains." },
  { slug: "ai-agents", name: "AI Agents", accent: "#a855f7", icon: "agent", blurb: "Autonomous agents, on chain AI and the agent economy." },
  { slug: "defi", name: "DeFi", accent: "#16c784", icon: "defi", blurb: "Liquidity, yield, lending and decentralized markets." },
  { slug: "regulation", name: "Regulation", accent: "#eab308", icon: "gavel", blurb: "Policy, rulings and the shifting legal landscape." },
  { slug: "press-releases", name: "Press Releases", accent: "#60a5fa", icon: "mic", blurb: "Announcements and official statements." },
];

/* Tag registry. Tags are specific and drive cross site relationships.
   accent optional (used for asset tags to tint covers when an article is
   asset specific). */
var NEWS_TAGS = [
  { slug: "bitcoin", name: "Bitcoin", accent: "#f59e0b", icon: "bitcoin" },
  { slug: "ethereum", name: "Ethereum", accent: "#60a5fa", icon: "ethereum" },
  { slug: "solana", name: "Solana", accent: "#14f195" },
  { slug: "base", name: "Base", accent: "#0052ff" },
  { slug: "layer-2", name: "Layer 2" },
  { slug: "funding-rate", name: "Funding Rate" },
  { slug: "open-interest", name: "Open Interest" },
  { slug: "fear-greed", name: "Fear & Greed" },
  { slug: "etf", name: "ETF" },
  { slug: "stablecoins", name: "Stablecoins" },
  { slug: "altcoins", name: "Altcoins" },
  { slug: "market-outlook", name: "Market Outlook" },
  { slug: "gas", name: "Gas" },
  { slug: "tvl", name: "TVL" },
  { slug: "blackrock", name: "BlackRock" },
  { slug: "sec", name: "SEC" },
  { slug: "coinbase", name: "Coinbase" },
];

/* Map an article to the live Intelligence products + market hubs it relates to,
   by tag. Used to surface "Related Intelligence" and to link articles back to
   products. Keyed by tag slug. */
var NEWS_INTEL_LINKS = {
  "bitcoin": [{ label: "Bitcoin Outlook", href: "/bitcoin-outlook/" }, { label: "Bitcoin Market Hub", href: "/markets/bitcoin/" }],
  "ethereum": [{ label: "Ethereum Market Hub", href: "/markets/ethereum/" }],
  "solana": [{ label: "Solana Market Hub", href: "/markets/solana/" }],
  "funding-rate": [{ label: "Funding Rate", href: "/funding-rate/" }],
  "open-interest": [{ label: "Open Interest", href: "/open-interest/" }],
  "fear-greed": [{ label: "Fear & Greed Index", href: "/fear-greed-index/" }],
  "altcoins": [{ label: "Altcoins Hub", href: "/markets/altcoins/" }],
  "stablecoins": [{ label: "Stablecoins Hub", href: "/markets/stablecoins/" }],
};

/* Articles, newest first. Dates are ISO (YYYY-MM-DD). */
var NEWS_ARTICLES = [
  {
    type: "original",
    slug: "why-bitcoin-outlook-turned-bullish-after-funding-improved",
    title: "Why Bitcoin Turned Bullish After Funding Improved",
    category: "blockchain",
    tags: ["bitcoin", "funding-rate", "market-outlook", "open-interest"],
    date: "2026-07-19",
    updated: "2026-07-19",
    author: "CoinGyaan Intelligence",
    readMins: 5,
    excerpt: "Bitcoin's short term outlook shifted as perpetual funding moved back to positive and open interest firmed. Here is what changed in the derivatives market and what it means for the next 24 hours.",
    cover: "auto", // "auto" = generated SVG from category/tag; or a path to an image
    coverTag: "bitcoin", // which tag identity tints the cover
    featured: true,
  },
];

/* Expose for both browser (window) and the Node generator (module.exports). */
if (typeof window !== "undefined") {
  window.NEWS_CATEGORIES = NEWS_CATEGORIES;
  window.NEWS_TAGS = NEWS_TAGS;
  window.NEWS_INTEL_LINKS = NEWS_INTEL_LINKS;
  window.NEWS_ARTICLES = NEWS_ARTICLES;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NEWS_CATEGORIES, NEWS_TAGS, NEWS_INTEL_LINKS, NEWS_ARTICLES };
}
