/* ============================================================================
   CoinGyaan Version 2 SEO templates. Single source of truth for page SEO.
   buildHead(path, overrides) returns the full technical head (title, meta,
   canonical, Open Graph, Twitter, JSON-LD). Clean URLs only. Pass
   { noindex:true } for placeholder pages. Same file powers the CMS later.
   ============================================================================ */

export const SITE = {
  name: 'CoinGyaan', origin: 'https://coingyaan.com', locale: 'en_US', inLanguage: 'en-US',
  twitter: '@coin_gyaan',
  logo: 'https://coingyaan.com/assets/images/brand/logo.png?v=3',
  ogImage: 'https://coingyaan.com/assets/images/brand/universal-share-v1.png',
  ogImageAlt: 'CoinGyaan Crypto Intelligence',
  founder: 'Monesh Kumar', foundingDate: '2017',
  sameAs: ['https://twitter.com/coin_gyaan', 'https://t.me/coingyaan'],
};
export const DEFAULTS = { ogType: 'website', robots: 'index, follow, max-image-preview:large, max-snippet:-1' };

export const ROUTES = {
  '/': { title: 'Crypto Intelligence Platform | Bitcoin Market Outlook Today | CoinGyaan',
    description: 'CoinGyaan is a crypto intelligence platform providing Bitcoin market outlook, Fear & Greed Index, funding rate, open interest, ETF flows, market dashboards and crypto news to help investors make smarter decisions.',
    pageType: 'WebPage', breadcrumb: [] },

  '/intelligence/': { title: 'Crypto Market Intelligence | Bitcoin Outlook, Sentiment & Signals | CoinGyaan',
    description: 'Proprietary CoinGyaan intelligence products including the Bitcoin Market Outlook, Fear & Greed Index, funding rate, open interest and ETF flows.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }] },
  '/bitcoin-outlook/': { title: 'Bitcoin Market Outlook Today | BTC Analysis & Market Direction | CoinGyaan',
    description: "Today's Bitcoin market outlook with upside probability, market direction, confidence and market condition from CoinGyaan proprietary intelligence signals.",
    pageType: 'WebPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }, { name: 'Bitcoin Outlook', path: '/bitcoin-outlook/' }], faq: true },
  '/fear-greed-index/': { title: 'Crypto Fear & Greed Index Today | Live Market Sentiment | CoinGyaan',
    description: "Live crypto Fear & Greed Index with current market sentiment, a gauge reading and the drivers behind today's score.",
    pageType: 'WebPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }, { name: 'Fear & Greed Index', path: '/fear-greed-index/' }], faq: true },
  '/funding-rate/': { title: 'Bitcoin Funding Rate Today | Long vs Short Positioning | CoinGyaan',
    description: 'Bitcoin funding rate today with long versus short positioning, market bias and what current leverage implies about the move.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }, { name: 'Funding Rate', path: '/funding-rate/' }] },
  '/open-interest/': { title: 'Bitcoin Open Interest Today | Crypto Derivatives Intelligence | CoinGyaan',
    description: 'Bitcoin open interest today with 24 hour change and derivatives market activity to gauge capital entering the market.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }, { name: 'Open Interest', path: '/open-interest/' }] },
  '/etf-flows/': { title: 'Bitcoin ETF Flows Today | Institutional Crypto Investment | CoinGyaan',
    description: 'Bitcoin ETF flows today tracking institutional capital entering and leaving spot Bitcoin ETFs.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Intelligence', path: '/intelligence/' }, { name: 'ETF Flows', path: '/etf-flows/' }] },

  '/markets/': { title: 'Crypto Market Dashboards | Bitcoin, Ethereum, Solana & Altcoins | CoinGyaan',
    description: 'Market intelligence dashboards for Bitcoin, Ethereum, Solana, altcoins and stablecoins with outlook, metrics, analysis and news.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }] },
  '/markets/bitcoin/': { title: 'Bitcoin Market Dashboard | Outlook, Metrics & News | CoinGyaan',
    description: 'Bitcoin market dashboard with outlook, metrics, analysis and the latest Bitcoin news in one intelligence view.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }, { name: 'Bitcoin', path: '/markets/bitcoin/' }] },
  '/markets/ethereum/': { title: 'Ethereum Market Dashboard | Analysis, Metrics & News | CoinGyaan',
    description: 'Ethereum market dashboard with analysis, metrics and the latest Ethereum news in one intelligence view.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }, { name: 'Ethereum', path: '/markets/ethereum/' }] },
  '/markets/solana/': { title: 'Solana Market Dashboard | Analysis, Metrics & News | CoinGyaan',
    description: 'Solana market dashboard with analysis, metrics and the latest Solana news in one intelligence view.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }, { name: 'Solana', path: '/markets/solana/' }] },
  '/markets/altcoins/': { title: 'Altcoin Market Dashboard | Altcoin Season, Metrics & Analysis | CoinGyaan',
    description: 'Altcoin market dashboard with the Altcoin Season Index, dominance, sector rotation and altcoin analysis.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }, { name: 'Altcoins', path: '/markets/altcoins/' }] },
  '/markets/stablecoins/': { title: 'Stablecoin Market Dashboard | Supply, Liquidity & Intelligence | CoinGyaan',
    description: 'Stablecoin market dashboard tracking supply, dominance, liquidity and depeg risk across major stablecoins.',
    pageType: 'WebPage', breadcrumb: [{ name: 'Markets', path: '/markets/' }, { name: 'Stablecoins', path: '/markets/stablecoins/' }] },

  '/news/': { title: 'Crypto News | Blockchain, AI Agents, DeFi & Regulation | CoinGyaan',
    description: 'Fact first crypto news and analysis across blockchain, AI agents, DeFi, regulation and official press releases.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }] },
  '/news/blockchain/': { title: 'Blockchain News | Layer 1, Layer 2 & Ecosystem Updates | CoinGyaan',
    description: 'Blockchain news covering Layer 1 and Layer 2 networks, ecosystems and protocol upgrades.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }, { name: 'Blockchain', path: '/news/blockchain/' }] },
  '/news/ai-agents/': { title: 'AI Agent News | Onchain AI & Autonomous Crypto Agents | CoinGyaan',
    description: 'AI agent news covering onchain AI, autonomous agents and the ERC-8004 identity standard.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }, { name: 'AI Agents', path: '/news/ai-agents/' }] },
  '/news/defi/': { title: 'DeFi News | Decentralized Finance Market Updates | CoinGyaan',
    description: 'DeFi news covering lending, liquidity, yield and decentralized exchanges.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }, { name: 'DeFi', path: '/news/defi/' }] },
  '/news/regulation/': { title: 'Crypto Regulation News | Global Digital Asset Policy | CoinGyaan',
    description: 'Crypto regulation news covering global digital asset policy, the SEC and MiCA.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }, { name: 'Regulation', path: '/news/regulation/' }] },
  '/news/press-releases/': { title: 'Crypto Press Releases | Official Project Announcements | CoinGyaan',
    description: 'Official crypto project announcements and press releases.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'News', path: '/news/' }, { name: 'Press Releases', path: '/news/press-releases/' }] },

  '/about/': { title: 'About CoinGyaan | Crypto Intelligence Platform',
    description: 'About CoinGyaan, our mission, editorial standards, methodology and data sources behind our crypto intelligence.',
    pageType: 'CollectionPage', breadcrumb: [{ name: 'About', path: '/about/' }] },
  '/about/our-mission/': { title: 'Our Mission | CoinGyaan',
    description: 'The CoinGyaan mission to help investors make smarter decisions through crypto intelligence.',
    pageType: 'WebPage', breadcrumb: [{ name: 'About', path: '/about/' }, { name: 'Our Mission', path: '/about/our-mission/' }] },
  '/about/editorial-policy/': { title: 'Editorial Policy | CoinGyaan',
    description: 'How CoinGyaan researches, writes and reviews its crypto intelligence and news.',
    pageType: 'WebPage', breadcrumb: [{ name: 'About', path: '/about/' }, { name: 'Editorial Policy', path: '/about/editorial-policy/' }] },
  '/about/methodology/': { title: 'Methodology | CoinGyaan',
    description: 'The methodology behind CoinGyaan intelligence products including the Bitcoin Market Outlook.',
    pageType: 'WebPage', breadcrumb: [{ name: 'About', path: '/about/' }, { name: 'Methodology', path: '/about/methodology/' }] },
  '/about/data-sources/': { title: 'Data Sources | CoinGyaan',
    description: 'The market data sources and providers behind CoinGyaan intelligence.',
    pageType: 'WebPage', breadcrumb: [{ name: 'About', path: '/about/' }, { name: 'Data Sources', path: '/about/data-sources/' }] },
  '/about/contact/': { title: 'Contact CoinGyaan',
    description: 'Contact CoinGyaan for media, partnerships and general enquiries.',
    pageType: 'WebPage', breadcrumb: [{ name: 'About', path: '/about/' }, { name: 'Contact', path: '/about/contact/' }] },
};

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => SITE.origin + (p || '/');

function orgNode() {
  return { '@type': 'Organization', '@id': SITE.origin + '/#organization', name: SITE.name,
    url: SITE.origin + '/', logo: { '@type': 'ImageObject', url: SITE.logo, width: 512, height: 512 },
    foundingDate: SITE.foundingDate, founder: { '@type': 'Person', name: SITE.founder }, sameAs: SITE.sameAs };
}
function siteNode() {
  return { '@type': 'WebSite', '@id': SITE.origin + '/#website', url: SITE.origin + '/', name: SITE.name,
    description: 'Crypto Intelligence for Smarter Decisions', publisher: { '@id': SITE.origin + '/#organization' },
    inLanguage: SITE.inLanguage, potentialAction: { '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: SITE.origin + '/search?q={search_term_string}' },
      'query-input': 'required name=search_term_string' } };
}
function crumbNode(canonical, trail) {
  const items = [{ name: 'Home', item: SITE.origin + '/' }].concat((trail || []).map((c) => ({ name: c.name, item: abs(c.path) })));
  return { '@type': 'BreadcrumbList', '@id': canonical + '#breadcrumb',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.item })) };
}
function articleNode(canonical, a) {
  return { '@type': 'Article', '@id': canonical + '#article', headline: a.headline, image: a.image ? [a.image] : [SITE.ogImage],
    datePublished: a.datePublished, dateModified: a.dateModified || a.datePublished,
    author: { '@type': a.authorType || 'Organization', name: a.author || SITE.name },
    publisher: { '@id': SITE.origin + '/#organization' }, articleSection: a.section, mainEntityOfPage: canonical, inLanguage: SITE.inLanguage };
}
function faqNode(canonical, faqs) {
  return { '@type': 'FAQPage', '@id': canonical + '#faq',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

export function buildHead(path, overrides) {
  const o = overrides || {};
  const r = ROUTES[path] || {};
  const title = o.title || r.title || SITE.name;
  const description = o.description || r.description || '';
  const canonical = abs(o.canonicalPath || path || '/');
  const ogType = o.ogType || (o.article ? 'article' : DEFAULTS.ogType);
  const image = o.image || SITE.ogImage;
  const pageType = o.pageType || r.pageType || 'WebPage';
  const robots = o.noindex ? 'noindex, follow' : DEFAULTS.robots;

  const graph = [orgNode(), siteNode()];
  const primary = { '@type': pageType, '@id': canonical + '#webpage', url: canonical, name: title,
    description: description, isPartOf: { '@id': SITE.origin + '/#website' }, inLanguage: SITE.inLanguage };
  const trail = o.breadcrumb || r.breadcrumb || [];
  if (trail.length) primary.breadcrumb = { '@id': canonical + '#breadcrumb' };
  graph.push(primary);
  if (trail.length) graph.push(crumbNode(canonical, trail));
  if (o.article) graph.push(articleNode(canonical, o.article));
  if (o.faqs && o.faqs.length) graph.push(faqNode(canonical, o.faqs));

  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);

  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="${robots}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="${SITE.name}" />
<meta property="og:locale" content="${SITE.locale}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(SITE.ogImageAlt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="${SITE.twitter}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${image}" />
<script type="application/ld+json">
${jsonld}
</script>`;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { SITE, DEFAULTS, ROUTES, buildHead }; }
