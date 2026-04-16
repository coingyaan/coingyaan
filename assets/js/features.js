// ============================================
// COINGYAAN - FEATURES.JS
// Trending Coins + Altcoin Season Index + Stablecoin Dominance
// ============================================

const CG      = 'https://api.coingecko.com/api/v3';
const BINANCE = 'https://api.binance.com/api/v3';

// ── Helpers ───────────────────────────────────────────────────
function fmtPrice(p) {
  if (!p && p !== 0) return '--';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + p.toFixed(2);
  return '$' + p.toFixed(6);
}

function fmtPct(v) {
  if (v === null || v === undefined) return '--';
  const sign = v >= 0 ? '+' : '';
  return sign + v.toFixed(2) + '%';
}

function timeNow() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════
// FEATURE 1 - TOP 5 TRENDING COINS
// ═══════════════════════════════════════════
async function loadTrending() {
  const grid      = document.getElementById('trendingGrid');
  const refreshEl = document.getElementById('trendingRefreshTime');
  if (!grid) return;

  try {
    const res  = await fetch(`${CG}/search/trending`);
    const data = await res.json();
    const coins = (data.coins || []).slice(0, 5).map(c => c.item);

    if (!coins.length) {
      grid.innerHTML = '<div class="trending-loading">No trending data available.</div>';
      return;
    }

    grid.innerHTML = coins.map((coin, i) => {
      const priceUsd = coin.data && coin.data.price          ? parseFloat(coin.data.price) : null;
      const change   = coin.data && coin.data.price_change_percentage_24h
                       ? coin.data.price_change_percentage_24h.usd
                       : null;
      const isUp     = change === null ? true : change >= 0;
      return `
        <div class="trending-coin">
          <div class="trending-rank">#${i + 1} Trending</div>
          <div class="trending-name">${coin.name}</div>
          <div class="trending-symbol">${coin.symbol.toUpperCase()}</div>
          <div class="trending-price">${fmtPrice(priceUsd)}</div>
          <div class="trending-change ${isUp ? 'up' : 'down'}">${change !== null ? fmtPct(change) : '--'}</div>
        </div>`;
    }).join('');

    setTimeout(() => {
      const btcPillEl = document.getElementById('btcPrice');
      if (btcPillEl && btcPillEl.textContent !== '$--') {
        grid.querySelectorAll('.trending-name').forEach((el, i) => {
          if (el.textContent === 'Bitcoin') {
            const priceEl = grid.querySelectorAll('.trending-price')[i];
            if (priceEl) priceEl.textContent = btcPillEl.textContent;
          }
        });
      }
    }, 2000);

    if (refreshEl) refreshEl.textContent = 'Updated ' + timeNow();

  } catch (e) {
    console.error('Trending error:', e);
    grid.innerHTML = '<div class="trending-loading">Unable to load trending data.</div>';
  }
}

// ═══════════════════════════════════════════
// FEATURE 5 - ALTCOIN SEASON INDEX
// Primary: Binance /ticker/24hr (1200 req/min, no key)
// Fallback: CoinGecko /coins/markets
// ═══════════════════════════════════════════

// Top altcoins to track on Binance - excludes stablecoins
const ALT_SYMBOLS = [
  'ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT',
  'AVAXUSDT','DOTUSDT','LINKUSDT','LTCUSDT','NEARUSDT',
  'UNIUSDT','ATOMUSDT','XLMUSDT','ALGOUSDT','VETUSDT',
  'FILUSDT','ICPUSDT','AAVEUSDT','SHIBUSDT','DOGEUSDT',
  'MATICUSDT','APTUSDT','ARBUSDT','OPUSDT','SUIUSDT',
  'INJUSDT','RENDERUSDT','WLDUSDT','HBARUSDT','SANDUSDT',
  'MANAUSDT','APEUSDT','GRTUSDT','RUNEUSDT','LDOUSDT',
  'STXUSDT','EGLDUSDT','FLOWUSDT','KSMUSDT','XTZUSDT',
  'BATUSDT','ZECUSDT','DASHUSDT','WAVESUSDT','ONTUSDT',
  'ZILUSDT','ANKRUSDT','IOTAUSDT','NMRUSDT','CRVUSDT'
];

async function loadAltcoinSeasonBinance() {
  // Fetch BTC 24h change from Binance
  const btcRes  = await fetch(`${BINANCE}/ticker/24hr?symbol=BTCUSDT`);
  if (!btcRes.ok) throw new Error('Binance BTC ticker failed');
  const btcData = await btcRes.json();
  const btc24h  = parseFloat(btcData.priceChangePercent);

  // Fetch all symbols in one call using mini ticker
  const allRes  = await fetch(`${BINANCE}/ticker/24hr`);
  if (!allRes.ok) throw new Error('Binance all tickers failed');
  const allTickers = await allRes.json();

  // Filter to our altcoin list
  const altMap = {};
  allTickers.forEach(t => { altMap[t.symbol] = t; });

  let outperforming = 0;
  let totalAltChg   = 0;
  let validAlts     = 0;

  ALT_SYMBOLS.forEach(sym => {
    const ticker = altMap[sym];
    if (!ticker) return;
    const chg = parseFloat(ticker.priceChangePercent);
    if (!isNaN(chg)) {
      totalAltChg += chg;
      validAlts++;
      if (chg > btc24h) outperforming++;
    }
  });

  if (validAlts === 0) throw new Error('No valid alt data');

  const avgAltChg = totalAltChg / validAlts;
  const score     = Math.round((outperforming / validAlts) * 100);

  return { score, outperforming, validAlts, avgAltChg, btc24h };
}

async function loadAltcoinSeasonCG() {
  // CoinGecko fallback
  await delay(1000);
  const marketsRes = await fetch(
    `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=51&page=1&sparkline=false`
  );
  if (!marketsRes.ok) throw new Error('CoinGecko markets failed');
  const markets = await marketsRes.json();
  if (!markets || !markets.length) throw new Error('No market data');

  const btcCurrent = markets.find(c => c.id === 'bitcoin');
  const btc24h     = btcCurrent ? btcCurrent.price_change_percentage_24h : 0;
  const alts       = markets.filter(c => c.id !== 'bitcoin').slice(0, 50);

  let outperforming = 0, totalAltChg = 0, validAlts = 0;
  alts.forEach(alt => {
    const chg = alt.price_change_percentage_24h;
    if (chg !== null && chg !== undefined) {
      totalAltChg += chg;
      validAlts++;
      if (chg > btc24h) outperforming++;
    }
  });

  const avgAltChg = validAlts > 0 ? totalAltChg / validAlts : 0;
  const score     = validAlts > 0 ? Math.round((outperforming / validAlts) * 100) : 50;

  return { score, outperforming, validAlts, avgAltChg, btc24h };
}

async function loadAltcoinSeason() {
  const scoreEl         = document.getElementById('altseasonScore');
  const badgeEl         = document.getElementById('altseasonBadge');
  const needleEl        = document.getElementById('altseasonNeedle');
  const descEl          = document.getElementById('altseasonDesc');
  const outperformingEl = document.getElementById('altseasonOutperforming');
  const btcChangeEl     = document.getElementById('altseasonBtcChange');
  const avgAltEl        = document.getElementById('altseasonAvgAlt');
  const refreshEl       = document.getElementById('altseasonRefreshTime');
  if (!scoreEl) return;

  let result = null;

  // Try Binance first - fast and no rate limits
  try {
    result = await loadAltcoinSeasonBinance();
    console.log('Altcoin season: Binance OK');
  } catch (e) {
    console.warn('Binance altcoin season failed, trying CoinGecko:', e.message);
    try {
      result = await loadAltcoinSeasonCG();
      console.log('Altcoin season: CoinGecko fallback OK');
    } catch (e2) {
      console.error('Both altcoin season sources failed:', e2.message);
    }
  }

  if (!result) {
    if (descEl)    descEl.textContent   = 'Unable to load data. Please refresh the page.';
    if (scoreEl)   scoreEl.textContent  = '--';
    if (badgeEl)   { badgeEl.textContent = 'Error'; badgeEl.className = 'altseason-badge neutral'; }
    if (refreshEl) refreshEl.textContent = 'Failed to load';
    return;
  }

  const { score, outperforming, validAlts, avgAltChg, btc24h } = result;

  // Season label
  let season, badgeClass, desc;
  if (score >= 75) {
    season     = 'Altcoin Season \uD83D\uDE80';
    badgeClass = 'alt';
    desc       = `<strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin right now. Capital is flowing into alts historically a time of high volatility and big moves in smaller coins.`;
  } else if (score <= 25) {
    season     = 'Bitcoin Season \u20BF';
    badgeClass = 'btc';
    desc       = `Only <strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin. BTC is dominating. Altcoins tend to underperform relative to BTC during this phase.`;
  } else {
    season     = 'Mixed Market';
    badgeClass = 'neutral';
    desc       = `<strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin. The market is mixed with no clear dominance from BTC or alts yet.`;
  }

  // Update UI - identical to original
  if (scoreEl)         scoreEl.textContent        = score;
  if (badgeEl)         { badgeEl.textContent = season; badgeEl.className = 'altseason-badge ' + badgeClass; }
  if (needleEl)        needleEl.style.left         = score + '%';
  if (descEl)          descEl.innerHTML            = desc;
  if (outperformingEl) outperformingEl.textContent = outperforming + ' / ' + validAlts;
  if (btcChangeEl) {
    btcChangeEl.textContent = fmtPct(btc24h) + ' (24h)';
    btcChangeEl.style.color = btc24h >= 0 ? '#22c55e' : '#ef4444';
  }
  if (avgAltEl) {
    avgAltEl.textContent = fmtPct(avgAltChg);
    avgAltEl.style.color = avgAltChg >= 0 ? '#22c55e' : '#ef4444';
  }
  if (refreshEl) refreshEl.textContent = 'Updated ' + timeNow();
}

// ═══════════════════════════════════════════
// FEATURE 8 - STABLECOIN DOMINANCE
// Uses /global endpoint - free no key needed
// ═══════════════════════════════════════════
async function loadStablecoinDominance() {
  const usdtEl       = document.getElementById('stableUsdtPct');
  const usdcEl       = document.getElementById('stableUsdcPct');
  const combinedEl   = document.getElementById('stableCombinedPct');
  const mcapEl       = document.getElementById('stableMcap');
  const signalEl     = document.getElementById('stableSignal');
  const signalDescEl = document.getElementById('stableSignalDesc');
  const barFillEl    = document.getElementById('stableBarFill');
  const barPctEl     = document.getElementById('stableBarPct');
  const refreshEl    = document.getElementById('stableRefreshTime');
  if (!combinedEl) return;

  try {
    await delay(4500);
    const res  = await fetch('https://api.coingecko.com/api/v3/global');
    const data = await res.json();
    const pct  = data.data.market_cap_percentage || {};

    const usdtPct      = pct.usdt || 0;
    const usdcPct      = pct.usdc || 0;
    const combined     = usdtPct + usdcPct;
    const totalMcapUsd = data.data.total_market_cap.usd || 0;
    const stableMcap   = (combined / 100) * totalMcapUsd;

    function fmtMcap(v) {
      if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
      if (v >= 1e9)  return '$' + (v / 1e9).toFixed(1) + 'B';
      return '$' + (v / 1e6).toFixed(0) + 'M';
    }

    let signal, signalClass, signalDesc;
    if (combined > 9) {
      signal      = 'Extreme Fear';
      signalClass = 'stable-signal-fear';
      signalDesc  = 'Stablecoin dominance is very high. Traders are heavily positioned in cash waiting for better entry points.';
    } else if (combined > 7) {
      signal      = 'Fear';
      signalClass = 'stable-signal-fear';
      signalDesc  = 'Rising stablecoin dominance signals risk-off sentiment. Capital is moving to safety.';
    } else if (combined > 5) {
      signal      = 'Neutral';
      signalClass = 'stable-signal-neutral';
      signalDesc  = 'Stablecoin dominance is in the normal range. Market is balanced between cash and crypto.';
    } else {
      signal      = 'Greed';
      signalClass = 'stable-signal-greed';
      signalDesc  = 'Low stablecoin dominance means capital is deployed in crypto. Risk appetite is high.';
    }

    if (usdtEl)       usdtEl.textContent     = usdtPct.toFixed(1) + '%';
    if (usdcEl)       usdcEl.textContent     = usdcPct.toFixed(1) + '%';
    if (combinedEl)   combinedEl.textContent = combined.toFixed(1) + '%';
    if (mcapEl)       mcapEl.textContent     = fmtMcap(stableMcap);
    if (signalEl)     { signalEl.textContent = signal; signalEl.className = 'stable-signal-badge ' + signalClass; }
    if (signalDescEl) signalDescEl.textContent = signalDesc;
    if (barFillEl)    barFillEl.style.width  = Math.min(combined * 5, 100) + '%';
    if (barPctEl)     barPctEl.textContent   = combined.toFixed(1) + '%';
    if (refreshEl)    refreshEl.textContent  = 'Updated ' + timeNow();

  } catch (e) {
    console.error('Stablecoin dominance error:', e.message || e);
    if (combinedEl) combinedEl.textContent = '--';
    if (signalEl)   signalEl.textContent   = 'Error';
    if (refreshEl)  refreshEl.textContent  = 'Failed to load';
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadTrending();
  loadAltcoinSeason();
  loadStablecoinDominance();
});

console.log('CoinGyaan Features loaded - Trending + Altseason (Binance) + Stablecoin');
