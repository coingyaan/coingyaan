(function() {

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
        <div class="brand-text"><strong>CoinGyaan</strong></div>
      </a>
      <nav class="header-nav">
        <a href="/bitcoin.html" style="color:#f59e0b;">Bitcoin Guide</a>
        <div class="nav-dropdown" id="navDropdown">
          <span class="nav-dropdown-trigger" id="navDropdownTrigger" onclick="toggleNavDropdown(event)">Tools &#9662;</span>
          <div class="nav-dropdown-menu" id="navDropdownMenu">
            <a href="/bitcoin-sentiment-today.html">Crypto Sentiment Checker</a>
            <a href="/fear-greed-index-today.html">Fear &amp; Greed Index</a>
            <a href="/airdrop-rescue">Airdrop Rescue Tool</a>
          </div>
        </div>
        <a href="/play">Play</a>
        <a href="/guides.html">Guides</a>
        <a href="/contact.html">Contact</a>
      </nav>
      <img src="/assets/images/logo/owl-mascot.png" alt="CoinGyaan Mascot" class="owl-mascot" title="CoinGyaan Owl 🦉" loading="eager" />
    </div>
  </div>
</header>`;

  var NAV_CSS = `
  <style id="site-nav-css">
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
      z-index: 999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .nav-dropdown-menu.open { display: block; }
    .nav-dropdown-menu a {
      display: block;
      padding: 10px 14px;
      font-size: 13px;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .nav-dropdown-menu a:hover { background: #1e293b; color: #f59e0b; }
    @media (max-width: 768px) {
      .nav-dropdown-menu { left: auto; right: 0; transform: none; }
    }
    @media (max-width: 480px) {
      .header-nav { gap: 8px; margin-left: 8px; }
      .header-nav > a { font-size: 12px; }
      .nav-dropdown-trigger { font-size: 12px; }
    }
  </style>`;

  // Inject CSS into head
  if (!document.getElementById('site-nav-css')) {
    document.head.insertAdjacentHTML('beforeend', NAV_CSS);
  }

  // Inject nav into placeholder
  var placeholder = document.getElementById('site-nav');
  if (placeholder) {
    placeholder.outerHTML = NAV_HTML;
  }

  // Dropdown click toggle
  window.toggleNavDropdown = function(e) {
    e.stopPropagation();
    var menu    = document.getElementById('navDropdownMenu');
    var trigger = document.getElementById('navDropdownTrigger');
    if (!menu) return;
    var isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    trigger.classList.toggle('open', !isOpen);
  };

  // Close dropdown when clicking anywhere outside
  document.addEventListener('click', function() {
    var menu    = document.getElementById('navDropdownMenu');
    var trigger = document.getElementById('navDropdownTrigger');
    if (menu)    menu.classList.remove('open');
    if (trigger) trigger.classList.remove('open');
  });

})();
