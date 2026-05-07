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
      z-index: 999999;
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

    /* Cointraffic auto-injected ad slots */
    .ct-auto-slot {
      width: 100%;
      text-align: center;
      overflow: hidden;
    }
    .ct-auto-slot-top    { margin: 20px 0 8px; }
    .ct-auto-slot-mid    { margin: 28px 0 8px; }
    .ct-auto-slot-bottom { background: #0a0f1e; padding: 20px 0; margin: 0; }
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

  // ── AUTO AD INJECTION ──────────────────────────────────────────────────────
  // Automatically injects 3 Cointraffic ad slots on every page:
  //   Slot 1 (728x90)  — top of <main>, before first child
  //   Slot 2 (300x250) — after the 3rd direct child of <main>
  //   Slot 3 (320x50)  — before site-footer
  // Pages that already have manual CT spans are unaffected (Cointraffic
  // renders whichever span it finds; duplicates are handled by their script).
  // ──────────────────────────────────────────────────────────────────────────
  function injectAds() {
    var main = document.querySelector('main.container');
    if (!main) return;

    // ── SLOT 1: TOP 728x90 ──
    if (!document.getElementById('ct-auto-top')) {
      var top = document.createElement('div');
      top.id = 'ct-auto-top';
      top.className = 'ct-auto-slot ct-auto-slot-top';
      top.innerHTML = '<span id="ct_cuRrRAK61gI"></span>';
      main.insertBefore(top, main.firstChild);
    }

    // ── SLOT 2: MID 300x250 ──
    // Insert after 3rd direct child of main (skips top ad + hero + first tool)
    if (!document.getElementById('ct-auto-mid')) {
      var children = Array.prototype.slice.call(main.children);
      // Find a good anchor: after tool-grid or after 4th child, whichever exists
      var anchor = null;
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        if (el.classList && (
          el.classList.contains('tool-grid') ||
          el.classList.contains('altseason-section') ||
          el.classList.contains('stable-section')
        )) {
          anchor = el;
          break;
        }
      }
      // Fallback: use 4th child
      if (!anchor && children.length >= 4) anchor = children[3];

      if (anchor && anchor.nextSibling) {
        var mid = document.createElement('div');
        mid.id = 'ct-auto-mid';
        mid.className = 'ct-auto-slot ct-auto-slot-mid';
        mid.innerHTML = '<span id="ct_cD4ETRsSqTF"></span>';
        main.insertBefore(mid, anchor.nextSibling);
      }
    }

    // ── SLOT 3: BOTTOM 320x50 — before footer ──
    if (!document.getElementById('ct-auto-bottom')) {
      var footer = document.getElementById('site-footer');
      if (footer) {
        var bottom = document.createElement('div');
        bottom.id = 'ct-auto-bottom';
        bottom.className = 'ct-auto-slot ct-auto-slot-bottom';
        bottom.innerHTML = '<span id="ct_cYDPldEah4d"></span>';
        footer.parentNode.insertBefore(bottom, footer);
      }
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAds);
  } else {
    injectAds();
  }
  // ──────────────────────────────────────────────────────────────────────────

})();
