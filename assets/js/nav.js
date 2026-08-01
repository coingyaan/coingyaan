(function () {
  'use strict';

  /* ==========================================================================
     CoinGyaan Version 2 shared navigation. Single source of truth.

     Every page renders this header by placing <div id="site-nav"></div> near
     the top of <body> and loading this file. Desktop matches Homepage v7.
     Mobile uses a premium slide-in menu. Styling: /assets/css/coingyaan.css.
     Clean URLs only, no .html.
     ========================================================================== */

  var LOGO = 'https://coingyaan.com/assets/images/brand/coingyaan-mark.png';

  var NAV = [
    { label: 'Home', href: '/' },
    { label: 'Intelligence', key: 'i', items: [
      { label: 'Bitcoin Outlook',        href: '/bitcoin-outlook/' },
      { label: 'Fear &amp; Greed Index', href: '/fear-greed-index/' },
      { label: 'Funding Rate',           href: '/funding-rate/' },
      { label: 'Open Interest',          href: '/open-interest/' },
      { label: 'ETF Flows',              href: '/etf-flows/' }
    ] },
    { label: 'Markets', key: 'm', items: [
      { label: 'Bitcoin',     href: '/markets/bitcoin/', gold: true },
      { label: 'Ethereum',    href: '/markets/ethereum/' },
      { label: 'Solana',      href: '/markets/solana/' },
      { label: 'Altcoins',    href: '/markets/altcoins/' },
      { label: 'Stablecoins', href: '/markets/stablecoins/' }
    ] },
    { label: 'News', key: 'n', items: [
      { label: 'Blockchain',     href: '/news/blockchain/' },
      { label: 'AI Agents',      href: '/news/ai-agents/' },
      { label: 'DeFi',           href: '/news/defi/' },
      { label: 'Regulation',     href: '/news/regulation/' },
      { label: 'Press Releases', href: '/news/press-releases/' }
    ] },
    { label: 'About', key: 'a', items: [
      { label: 'Our Mission',      href: '/about/mission/' },
      { label: 'Editorial Policy', href: '/about/editorial-policy/' },
      { label: 'Methodology',      href: '/about/methodology/' },
      { label: 'Data Sources',     href: '/about/data-sources/' },
      { label: 'Contact',          href: '/about/contact/' }
    ] }
  ];

  var here = location.pathname.replace(/index\.html$/, '');
  if (here.length > 1) here = here.replace(/\/?$/, '/');
  function isCur(href) { return href !== '/' ? here.indexOf(href) === 0 : here === '/'; }
  function ac(href) { return isCur(href) ? ' aria-current="page"' : ''; }
  function link(sub) { return '<a href="' + sub.href + '"' + (sub.gold ? ' class="gold"' : '') + ac(sub.href) + '>' + sub.label + '</a>'; }

  function desktopNav() {
    return NAV.map(function (item) {
      if (!item.items) return '<a href="' + item.href + '"' + ac(item.href) + '>' + item.label + '</a>';
      return '<div class="dd"><span class="dd-trigger" data-dd="' + item.key + '" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">' + item.label + ' &#9662;</span>' +
             '<div class="dd-menu" data-menu="' + item.key + '">' + item.items.map(link).join('') + '</div></div>';
    }).join('');
  }

  function mobileGroups() {
    return NAV.map(function (item) {
      if (!item.items) return '<div class="mnav-group"><a class="mnav-solo" href="' + item.href + '"' + ac(item.href) + '>' + item.label + '</a></div>';
      return '<div class="mnav-group"><h6>' + item.label + '</h6>' + item.items.map(link).join('') + '</div>';
    }).join('');
  }

  var HEADER =
    '<header>' +
      '<div class="wrap hbar">' +
        '<a href="/" class="brand">' +
          '<img src="' + LOGO + '" alt="CoinGyaan" width="30" height="30" />' +
          '<span class="brand-txt"><strong>Coin<span>Gyaan</span></strong><span class="brand-tag">Crypto Intelligence</span></span>' +
        '</a>' +
        '<nav class="nav" aria-label="Primary">' + desktopNav() + '</nav>' +
        '<div class="hright">' +
          '<div class="search"><svg class="ico ico-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search" aria-label="Search" /></div>' +
          '<span class="pill-soon" title="Layeron coming soon"><span class="pill-soon-n">Layeron</span><span class="pill-soon-b">Coming Soon</span></span>' +
          '<button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>' +
        '</div>' +
      '</div>' +
    '</header>';

  var PANEL =
    '<div class="mnav-backdrop" id="mnavBackdrop"></div>' +
    '<aside class="mnav" id="mnav" aria-hidden="true" aria-label="Menu">' +
      '<div class="mnav-top">' +
        '<a href="/" class="brand"><img src="' + LOGO + '" alt="CoinGyaan" width="28" height="28" /><span class="brand-txt"><strong>Coin<span>Gyaan</span></strong></span></a>' +
        '<button class="mnav-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>' +
      '<div class="mnav-search"><svg class="ico ico-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search CoinGyaan" aria-label="Search" /></div>' +
      '<nav class="mnav-links" aria-label="Mobile">' + mobileGroups() + '</nav>' +
      '<div class="mnav-foot"><span class="pill-soon" title="Layeron coming soon"><span class="pill-soon-n">Layeron</span><span class="pill-soon-b">Coming Soon</span></span></div>' +
    '</aside>';

  var slot = document.getElementById('site-nav');
  if (slot) slot.outerHTML = HEADER;
  document.body.insertAdjacentHTML('beforeend', PANEL);

  /* Move desktop dropdown menus OUT of the header. The header uses
     backdrop-filter, which in Chromium clips its subtree to the header box and
     was cutting the menus off. Portaling them to <body> removes that clip.
     They are position:fixed and placed under their trigger by positionMenu(). */
  var ddMenus = Array.prototype.slice.call(document.querySelectorAll('header .dd-menu'));
  ddMenus.forEach(function (m) { document.body.appendChild(m); });

  function positionMenu(menu) {
    var trigger = document.querySelector('.dd-trigger[data-dd="' + menu.getAttribute('data-menu') + '"]');
    if (!trigger) return;
    var r = trigger.getBoundingClientRect();
    // Measure the menu without showing it, so we can clamp to the viewport.
    var prevVis = menu.style.visibility, prevDisp = menu.style.display;
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    var mw = menu.offsetWidth;
    menu.style.visibility = prevVis;
    menu.style.display = prevDisp;
    var half = mw / 2;
    var left = r.left + r.width / 2;
    // Keep fully on-screen horizontally.
    if (left - half < 10) left = half + 10;
    if (left + half > window.innerWidth - 10) left = window.innerWidth - 10 - half;
    // Always directly below the trigger (never above / never clipped at top).
    var top = r.bottom + 10;
    menu.style.left = Math.round(left) + 'px';
    menu.style.top = Math.round(top) + 'px';
  }
  function closeAllMenus() {
    document.querySelectorAll('.dd-menu.on').forEach(function (m) { m.classList.remove('on'); });
    document.querySelectorAll('.dd-trigger').forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
  }
  // Menus are anchored to the viewport; if the user scrolls, close them cleanly.
  window.addEventListener('scroll', closeAllMenus, { passive: true });
  window.addEventListener('resize', closeAllMenus);

  var panel = document.getElementById('mnav');
  var backdrop = document.getElementById('mnavBackdrop');
  var root = document.documentElement;

  function openMenu() {
    panel.classList.add('on'); backdrop.classList.add('on');
    panel.setAttribute('aria-hidden', 'false'); root.classList.add('mnav-open');
    var b = document.querySelector('.nav-burger'); if (b) b.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    panel.classList.remove('on'); backdrop.classList.remove('on');
    panel.setAttribute('aria-hidden', 'true'); root.classList.remove('mnav-open');
    var b = document.querySelector('.nav-burger'); if (b) b.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    // Desktop dropdowns
    var trigger = e.target.closest('.dd-trigger');
    document.querySelectorAll('.dd-menu').forEach(function (m) {
      if (!trigger || m.getAttribute('data-menu') !== trigger.getAttribute('data-dd')) m.classList.remove('on');
    });
    document.querySelectorAll('.dd-trigger').forEach(function (t) { if (t !== trigger) t.setAttribute('aria-expanded', 'false'); });
    if (trigger) {
      e.stopPropagation();
      var menu = document.querySelector('[data-menu="' + trigger.getAttribute('data-dd') + '"]');
      if (menu) {
        if (!menu.classList.contains('on')) positionMenu(menu);
        trigger.setAttribute('aria-expanded', menu.classList.toggle('on') ? 'true' : 'false');
      }
      return;
    }
    // Mobile menu open / close
    if (e.target.closest('.nav-burger')) { e.stopPropagation(); openMenu(); return; }
    if (e.target.closest('.mnav-close') || e.target.closest('.mnav-backdrop')) { closeMenu(); return; }
    if (e.target.closest('.mnav a')) { closeMenu(); }
  });

  document.addEventListener('keydown', function (e) {
    var trigger = e.target.closest && e.target.closest('.dd-trigger');
    if (trigger && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); trigger.click(); }
    if (e.key === 'Escape') {
      document.querySelectorAll('.dd-menu.on').forEach(function (m) { m.classList.remove('on'); });
      closeMenu();
    }
  });
})();
