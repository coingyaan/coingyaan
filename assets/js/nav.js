(function() {

  /* =========================================================================
     CoinGyaan navigation for the Crypto Intelligence Platform
     Home | Intelligence | Markets | Learn | News | About

     Studio, App and the old Tools dropdown are de-listed here. Their pages are
     NOT deleted and keep working at their existing URLs; they are simply no
     longer discoverable from the site navigation. They move to Layeron in Phase 2.

     The full architecture is listed here (shell first, content second). Pages that do
     not have real content yet carry <meta name="robots" content="noindex"> so Google and
     AdSense never see a thin page. Remove that one line as each page is filled in.
     ========================================================================= */

  var NAV = [
    { label: 'Home', href: '/' },
    { label: 'Intelligence', items: [
        { label: 'Bitcoin Outlook',        href: '/bitcoin-sentiment-today.html' },
        { label: 'Fear &amp; Greed Index', href: '/fear-greed-index-today.html' },
        { label: 'Funding Rate',           href: '/intelligence/funding-rate.html' },
        { label: 'Open Interest',          href: '/intelligence/open-interest.html' }
      ] },
    { label: 'Markets', items: [
        { label: 'Bitcoin',  href: '/bitcoin.html', accent: true },
        { label: 'Ethereum', href: '/markets/ethereum.html' },
        { label: 'Altcoins', href: '/markets/altcoins.html' }
      ] },
    { label: 'Learn', items: [
        { label: 'Bitcoin Basics',   href: '/learn/bitcoin-basics.html' },
        { label: 'Trading',          href: '/learn/trading.html' },
        { label: 'Onchain Analysis', href: '/learn/onchain-analysis.html' },
        { label: 'Security',         href: '/learn/security.html' }
      ] },
    { label: 'News', items: [
        { label: 'Bitcoin',        href: '/news/bitcoin.html' },
        { label: 'Ethereum',       href: '/news/ethereum.html' },
        { label: 'Altcoins',       href: '/news/altcoins.html' },
        { label: 'Market Updates', href: '/news/market-updates.html' }
      ] },
    { label: 'About', items: [
        { label: 'About CoinGyaan',  href: '/about.html' },
        { label: 'Editorial Policy', href: '/editorial-policy.html' },
        { label: 'Methodology',      href: '/methodology.html' },
        { label: 'Data Sources',     href: '/data-sources.html' },
        { label: 'Contact Us',       href: '/contact.html' }
      ] }
  ];

  function buildNav() {
    return NAV.map(function(item, i) {
      if (item.items) {
        var id = 'nd' + i;
        var links = item.items.map(function(sub) {
          return '<a href="' + sub.href + '"' + (sub.accent ? ' class="nav-accent"' : '') + '>' + sub.label + '</a>';
        }).join('');
        return '<div class="nav-dropdown" data-nav="' + id + '">' +
                 '<span class="nav-dropdown-trigger" data-trigger="' + id + '">' + item.label + ' &#9662;</span>' +
                 '<div class="nav-dropdown-menu" data-menu="' + id + '">' + links + '</div>' +
               '</div>';
      }
      return '<a href="' + item.href + '">' + item.label + '</a>';
    }).join('');
  }

  var NAV_HTML = `
<div class="top-market-bar" id="topMarketBar">
  <div class="top-bar-track" id="topBarTrack"></div>
  <span class="top-bar-updated" id="topBarUpdated"></span>
</div>
<header>
  <div class="container">
    <div class="header-bar">
      <a href="/" class="brand">
        <img src="/assets/images/logo/coingyaan-logo-transparent.png" alt="CoinGyaan" loading="eager" />
        <div class="brand-text"><strong>CoinGyaan</strong><span class="brand-tag">Crypto Intelligence</span></div>
      </a>
      <nav class="header-nav">${buildNav()}</nav>
    </div>
  </div>
</header>`;

  var NAV_CSS = `
  <style id="site-nav-css">
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-tag { font-size: 10.5px; font-weight: 500; color: #64748b; letter-spacing: 0.04em; }
    .nav-dropdown { position: relative; display: inline-flex; align-items: center; }
    .nav-dropdown-trigger {
      font-size: 14px;
      font-weight: 500;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 0;
      user-select: none;
      white-space: nowrap;
      transition: color 0.2s;
    }
    .nav-dropdown-trigger:hover { color: #e2e8f0; }
    .nav-dropdown-trigger.open { color: #f59e0b; }
    .nav-dropdown-menu {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #0d1526;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 6px;
      min-width: 210px;
      z-index: 999999;
      box-shadow: 0 12px 32px rgba(0,0,0,.45);
    }
    .nav-dropdown-menu.open { display: block; }
    .nav-dropdown-menu a {
      display: block;
      padding: 9px 12px;
      font-size: 13.5px;
      color: #94a3b8;
      border-radius: 7px;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .nav-dropdown-menu a:hover { background: #16203a; color: #e2e8f0; }
    .nav-dropdown-menu a.nav-accent { color: #f59e0b; }
    @media (max-width: 860px) {
      .nav-dropdown-menu { left: 0; transform: none; }
    }
  </style>`;

  // Inject CSS into head
  if (!document.getElementById('site-nav-css')) {
    document.head.insertAdjacentHTML('beforeend', NAV_CSS);
  }

  // Inject Cointraffic unified script (loads once per page)
  if (!document.getElementById('ct-unified')) {
    var ctScript = document.createElement('script');
    ctScript.async = true;
    ctScript.id = 'ct-unified';
    ctScript.src = 'https://appsha-pnd.ctengine.io/js/script.js?wkey=EjA8CfgEz1';
    document.head.appendChild(ctScript);
  }

  // Inject nav into placeholder
  var placeholder = document.getElementById('site-nav');
  if (placeholder) {
    placeholder.outerHTML = NAV_HTML;
  }

  // Dropdowns: supports any number of menus.
  function closeAll(except) {
    document.querySelectorAll('.nav-dropdown-menu').forEach(function(m) {
      if (m.getAttribute('data-menu') !== except) m.classList.remove('open');
    });
    document.querySelectorAll('.nav-dropdown-trigger').forEach(function(t) {
      if (t.getAttribute('data-trigger') !== except) t.classList.remove('open');
    });
  }

  document.addEventListener('click', function(e) {
    var trigger = e.target.closest('.nav-dropdown-trigger');
    if (!trigger) { closeAll(null); return; }
    e.stopPropagation();
    var id = trigger.getAttribute('data-trigger');
    var menu = document.querySelector('[data-menu="' + id + '"]');
    if (!menu) return;
    var isOpen = menu.classList.contains('open');
    closeAll(id);
    menu.classList.toggle('open', !isOpen);
    trigger.classList.toggle('open', !isOpen);
  });

  // Kept for any page still calling the old handler inline.
  window.toggleNavDropdown = function(e) { if (e && e.stopPropagation) e.stopPropagation(); };

})();
