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
  { slug: "bitcoin", name: "Bitcoin", accent: "#f7931a", icon: "bitcoin" },
  { slug: "ethereum", name: "Ethereum", accent: "#627eea", icon: "ethereum" },
  { slug: "solana", name: "Solana", accent: "#14f195" },
  { slug: "base", name: "Base", accent: "#0052ff" },
  { slug: "arbitrum", name: "Arbitrum", accent: "#28a0f0" },
  { slug: "optimism", name: "Optimism", accent: "#ff0420" },
  { slug: "linea", name: "Linea", accent: "#61dfff" },
  { slug: "metamask", name: "MetaMask", accent: "#e2761b" },
  { slug: "bnb", name: "BNB", accent: "#f3ba2f" },
  { slug: "xrp", name: "XRP", accent: "#23292f" },
  { slug: "polygon", name: "Polygon", accent: "#8247e5" },
  { slug: "avalanche", name: "Avalanche", accent: "#e84142" },
  { slug: "sui", name: "Sui", accent: "#4da2ff" },
  { slug: "aptos", name: "Aptos", accent: "#06f7c9" },
  { slug: "chainlink", name: "Chainlink", accent: "#375bd2" },
  { slug: "circle", name: "Circle", accent: "#4b9ce8" },
  { slug: "hyperliquid", name: "Hyperliquid", accent: "#97fce4" },
  { slug: "robinhood-chain", name: "Robinhood Chain", accent: "#ccff00" },
  { slug: "morph", name: "Morph", accent: "#00d95f" },
  { slug: "miden", name: "Miden", accent: "#b18cff" },
  { slug: "seismic", name: "Seismic", accent: "#ff7a59" },
  { slug: "ritual", name: "Ritual", accent: "#e8e8e8" },
  { slug: "1money", name: "1Money", accent: "#5aa9ff" },
  { slug: "rise", name: "Rise", accent: "#39e6b0" },
  { slug: "void", name: "VOID", accent: "#c7cfdd" },
  { slug: "arc", name: "Arc", accent: "#f59e0b" },
  { slug: "giwa", name: "GIWA", accent: "#6db3ff" },
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
  { slug: "bitcoin-etf", name: "Bitcoin ETF" },
  { slug: "ibit", name: "IBIT" },
  { slug: "institutional-investors", name: "Institutional Investors" },
  { slug: "sec", name: "SEC" },
  { slug: "coinbase", name: "Coinbase" },
];

/* Author registry. Articles reference an author by key; byline shows the name.
   Room for profile pages later at /news/author/{key}/ without changing URLs. */
var NEWS_AUTHORS = {
  "coingyaan-team": { name: "CoinGyaan Team", title: "CoinGyaan Intelligence Desk" },
  "monesh-kumar": { name: "Monesh Kumar", title: "Founder, CoinGyaan" },
  "mangal-mishra": { name: "Mangal Mishra", title: "Markets Analyst" },
  "koh-larn": { name: "Koh Larn", title: "Research" },
};

/* Live Intelligence products, keyed by tag. Each has an API endpoint so the
   Related Intelligence cards can pull a live value, plus a static blurb used
   as fallback and as the card subtitle. field/render describe what to show. */
var NEWS_INTEL_LINKS = {
  "bitcoin": [
    { label: "Bitcoin Outlook", href: "/bitcoin-outlook/", api: "/api/bitcoin-outlook", kind: "outlook", blurb: "24 hour probability read on Bitcoin's direction" },
    { label: "Bitcoin Market Hub", href: "/markets/bitcoin/", api: null, kind: "hub", blurb: "Everything on Bitcoin in one view" },
  ],
  "ethereum": [
    { label: "Ethereum Market Hub", href: "/markets/ethereum/", api: "/api/eth-outlook", kind: "outlook", blurb: "Outlook, gas, TVL and DeFi dominance" },
  ],
  "solana": [
    { label: "Solana Market Hub", href: "/markets/solana/", api: "/api/sol-outlook", kind: "outlook", blurb: "Outlook, price and derivatives for Solana" },
  ],
  "funding-rate": [
    { label: "Funding Rate", href: "/funding-rate/", api: "/api/funding-rate", kind: "funding", blurb: "Live perpetual funding and market bias" },
  ],
  "open-interest": [
    { label: "Open Interest", href: "/open-interest/", api: "/api/open-interest", kind: "oi", blurb: "Aggregate open interest and activity" },
  ],
  "fear-greed": [
    { label: "Fear & Greed Index", href: "/fear-greed-index/", api: "/api/fear-greed", kind: "fng", blurb: "Live market sentiment reading" },
  ],
  "altcoins": [
    { label: "Altcoins Hub", href: "/markets/altcoins/", api: "/api/altcoins", kind: "altcoins", blurb: "Altcoin season and dominance" },
  ],
  "stablecoins": [
    { label: "Stablecoins Hub", href: "/markets/stablecoins/", api: "/api/stablecoins", kind: "stablecoins", blurb: "Supply trend and liquidity outlook" },
  ],
  "etf": [
    { label: "Bitcoin Market Hub", href: "/markets/bitcoin/", api: null, kind: "hub", blurb: "ETF context inside the Bitcoin hub" },
  ],
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
    author: "monesh-kumar",
    readMins: 5,
    excerpt: "Bitcoin's short term outlook shifted as perpetual funding moved back to positive and open interest firmed. Here is what changed in the derivatives market and what it means for the next 24 hours.",
    cover: "auto", // "auto" = generated SVG from category/tag; or a path to an image
    coverTag: "bitcoin", // which tag identity tints the cover
    featured: true,
  },
  {
    type: "original",
    slug: "bitcoin-etf-inflows-blackrock-ibit-institutional-demand",
    title: "Bitcoin ETF Inflows Extend Winning Streak as BlackRock's IBIT Leads Institutional Demand",
    category: "blockchain",
    tags: ["bitcoin", "bitcoin-etf", "etf", "blackrock", "ibit", "institutional-investors"],
    date: "2026-07-24",
    updated: "2026-07-24",
    author: "monesh-kumar",
    readMins: 8,
    excerpt: "Bitcoin ETF inflows continued as BlackRock's IBIT remained the largest driver of institutional demand. Here is what Bitcoin ETF today data, ETF holdings and recent outflows mean for investors.",
    cover: "auto",
    coverTag: "bitcoin",
    featured: false,
  },
];

/* Expose for both browser (window) and the Node generator (module.exports). */
if (typeof window !== "undefined") {
  window.NEWS_CATEGORIES = NEWS_CATEGORIES;
  window.NEWS_TAGS = NEWS_TAGS;
  window.NEWS_AUTHORS = NEWS_AUTHORS;
  window.NEWS_INTEL_LINKS = NEWS_INTEL_LINKS;
  window.NEWS_ARTICLES = NEWS_ARTICLES;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NEWS_CATEGORIES, NEWS_TAGS, NEWS_AUTHORS, NEWS_INTEL_LINKS, NEWS_ARTICLES };
}
