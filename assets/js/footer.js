(function () {
  'use strict';

  /* ==========================================================================
     CoinGyaan Version 2 shared footer.

     Single source of truth for the site footer. Every page renders this exact
     footer by placing <div id="site-footer"></div> before the closing scripts
     and loading this file. Change it here once and it updates everywhere.

     Visual design is Homepage v7. Styling lives in /assets/css/coingyaan.css.
     Clean URLs only, no .html.
     ========================================================================== */

  var LOGO = 'https://coingyaan.com/assets/images/brand/coingyaan-mark.png';
  var YEAR = new Date().getFullYear();

  var FOOTER =
    '<footer>' +
      '<div class="wrap">' +
        '<div class="f-grid">' +
          '<div class="f-about">' +
            '<a href="/" class="brand">' +
              '<img src="' + LOGO + '" alt="CoinGyaan" width="30" height="30" loading="lazy" decoding="async" />' +
              '<span class="brand-txt"><strong>Coin<span>Gyaan</span></strong><span class="brand-tag">Crypto Intelligence</span></span>' +
            '</a>' +
            '<p>Helping investors make smarter crypto decisions through real time intelligence, data driven insights and original market analysis.</p>' +
          '</div>' +
          '<div class="f-col"><h5>Intelligence</h5>' +
            '<a href="/bitcoin-outlook/">Bitcoin Outlook</a>' +
            '<a href="/fear-greed-index/">Fear &amp; Greed Index</a>' +
            '<a href="/funding-rate/">Funding Rate</a>' +
            '<a href="/etf-flows/">ETF Flows</a>' +
          '</div>' +
          '<div class="f-col"><h5>Markets</h5>' +
            '<a href="/markets/bitcoin/">Bitcoin</a>' +
            '<a href="/markets/ethereum/">Ethereum</a>' +
            '<a href="/markets/solana/">Solana</a>' +
            '<a href="/markets/altcoins/">Altcoins</a>' +
          '</div>' +
          '<div class="f-col"><h5>News</h5>' +
            '<a href="/news/blockchain/">Blockchain</a>' +
            '<a href="/news/ai-agents/">AI Agents</a>' +
            '<a href="/news/defi/">DeFi</a>' +
            '<a href="/news/press-releases/">Press Releases</a>' +
          '</div>' +
          '<div class="f-col"><h5>About</h5>' +
            '<a href="/about/our-mission/">Our Mission</a>' +
            '<a href="/about/editorial-policy/">Editorial Policy</a>' +
            '<a href="/about/methodology/">Methodology</a>' +
            '<a href="/about/contact/">Contact</a>' +
          '</div>' +
        '</div>' +
        '<div class="f-bot">' +
          '<div>' +
            '<p>&copy; ' + YEAR + ' CoinGyaan. All Rights Reserved.</p>' +
            '<p style="margin-top:5px">Real time market data provided by CoinGecko and Binance.</p>' +
          '</div>' +
          '<div style="display:flex;gap:20px;align-items:center">' +
            '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
              '<a href="/privacy/" style="font-size:11.5px;color:var(--dimmer)">Privacy Policy</a>' +
              '<a href="/terms/" style="font-size:11.5px;color:var(--dimmer)">Terms of Use</a>' +
              '<a href="/disclaimer/" style="font-size:11.5px;color:var(--dimmer)">Disclaimer</a>' +
              '<a href="/cookie-policy/" style="font-size:11.5px;color:var(--dimmer)">Cookie Policy</a>' +
              '<a href="/media-kit/" style="font-size:11.5px;color:var(--dimmer)">Media Kit</a>' +
            '</div>' +
            '<div class="f-social">' +
              '<a href="https://twitter.com/coin_gyaan" title="X" target="_blank" rel="noopener"><svg class="ico ico-sm" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1-5.7 6.1H1.6l7.5-8.6L1.2 3h6.6l4.5 5.6zm-1.1 16.1h1.8L7.7 4.8H5.8z"/></svg></a>' +
              '<a href="https://t.me/coingyaan" title="Telegram" target="_blank" rel="noopener"><svg class="ico ico-sm" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.9 4.3l-3 14.2c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.1 12.5 1.5 11c-1-.3-1-1 .2-1.5l19-7.3c.8-.3 1.5.2 1.2 2.1z"/></svg></a>' +
              '<a href="https://www.linkedin.com/company/coingyaan" title="LinkedIn" target="_blank" rel="noopener"><svg class="ico ico-sm" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.5c0-1.3 0-3-1.9-3s-2.15 1.4-2.15 2.9V21H9z"/></svg></a>' +
              '<a href="/about/contact/" title="Contact"><svg class="ico ico-sm" viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 7l9 6 9-6"/></svg></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</footer>';

  var slot = document.getElementById('site-footer');
  if (slot) { slot.outerHTML = FOOTER; }
})();
