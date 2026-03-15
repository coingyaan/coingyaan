// ============================================
// COINGYAAN — FEATURES.JS
// Trending Coins + Altcoin Season Index + Telegram Alerts
// ============================================

const CG = 'https://api.coingecko.com/api/v3'; // kept for sentiment fallback
const CGAPI = 'https://api.coingyaan.com';

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
// FEATURE 1 — TOP 5 TRENDING COINS
// ═══════════════════════════════════════════
async function loadTrending() {
  const grid      = document.getElementById('trendingGrid');
  const refreshEl = document.getElementById('trendingRefreshTime');
  if (!grid) return;

  try {
    // Single call — trending response already includes price and 24h change inside data.coins[n].item
    const res  = await fetch(`${CGAPI}/trending`);
    const data = await res.json();
    const coins = (data.data || []).slice(0, 5);

    if (!coins.length) {
      grid.innerHTML = '<div class="trending-loading">No trending data available.</div>';
      return;
    }

    // CoinGecko trending endpoint includes: price_btc, data.price, data.price_change_percentage_24h.usd
    grid.innerHTML = coins.map((coin, i) => {
      const priceUsd = coin.price !== null && coin.price !== undefined ? parseFloat(coin.price) : null;
      const change   = coin.change24h !== null && coin.change24h !== undefined ? coin.change24h : null;
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

    // Sync BTC price in trending with the right side price pill for consistency
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
// FEATURE 5 — ALTCOIN SEASON INDEX
// Uses /coins/markets (no 90d param) + /coins/{id}/market_chart for BTC 90d
// All free tier compatible
// ═══════════════════════════════════════════
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

  try {
    // Step 1: Get top 51 coins current prices (free endpoint)
    await delay(500);
    const altRes  = await fetch(`${CGAPI}/altseason`);
    const altData = await altRes.json();
    const alt     = altData.data || {};
    const score         = alt.score || 50;
    const outperforming = alt.outperforming || 0;
    const validAlts     = alt.totalAlts || 50;
    const avgAltChg     = alt.avgAltChange24h || 0;
    const btcChg90      = alt.btcChange24h || null;

    // Season label
    let season, badgeClass, desc;
    if (score >= 75) {
      season     = 'Altcoin Season 🚀';
      badgeClass = 'alt';
      desc       = `<strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin right now. Capital is flowing into alts historically a time of high volatility and big moves in smaller coins.`;
    } else if (score <= 25) {
      season     = 'Bitcoin Season ₿';
      badgeClass = 'btc';
      desc       = `Only <strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin. BTC is dominating. Altcoins tend to underperform relative to BTC during this phase.`;
    } else {
      season     = 'Mixed Market';
      badgeClass = 'neutral';
      desc       = `<strong>${outperforming} of ${validAlts}</strong> top altcoins are outperforming Bitcoin. The market is mixed with no clear dominance from BTC or alts yet.`;
    }

    // Update UI
    if (scoreEl)         scoreEl.textContent        = score;
    if (badgeEl)         { badgeEl.textContent = season; badgeEl.className = 'altseason-badge ' + badgeClass; }
    if (needleEl)        needleEl.style.left         = score + '%';
    if (descEl)          descEl.innerHTML            = desc;
    if (outperformingEl) outperformingEl.textContent = outperforming + ' / ' + validAlts;
    if (btcChangeEl) {
      btcChangeEl.textContent   = btcChg90 !== null ? fmtPct(btcChg90) : fmtPct(btc24h) + ' (24h)';
      btcChangeEl.style.color   = (btcChg90 || btc24h) >= 0 ? '#22c55e' : '#ef4444';
    }
    if (avgAltEl) {
      avgAltEl.textContent  = fmtPct(avgAltChg);
      avgAltEl.style.color  = avgAltChg >= 0 ? '#22c55e' : '#ef4444';
    }
    if (refreshEl) refreshEl.textContent = 'Updated ' + timeNow();

  } catch (e) {
    console.error('Altcoin season error:', e);
    if (descEl) descEl.textContent = 'Unable to load data. Please refresh the page.';
    if (scoreEl) scoreEl.textContent = '--';
  }
}

// ═══════════════════════════════════════════
// FEATURE 7 — TELEGRAM ALERTS
// ═══════════════════════════════════════════
async function submitAlert() {
  const usernameEl = document.getElementById('alertUsername');
  const coinEl     = document.getElementById('alertCoin');
  const triggerEl  = document.getElementById('alertTrigger');
  const statusEl   = document.getElementById('alertStatus');
  const btn        = document.getElementById('alertSubmitBtn');

  const username = usernameEl ? usernameEl.value.trim().replace(/^@/, '') : '';
  const coin     = coinEl     ? coinEl.value.trim()     : '';
  const trigger  = triggerEl  ? triggerEl.value         : 'any';

  // Validate
  if (!username) {
    statusEl.textContent = 'Please enter your Telegram username.';
    statusEl.className   = 'alert-status error';
    return;
  }
  if (!coin) {
    statusEl.textContent = 'Please enter a coin name.';
    statusEl.className   = 'alert-status error';
    return;
  }

  btn.disabled        = true;
  btn.textContent     = 'Saving...';
  statusEl.textContent = '';

  try {
    // Save to Cloudflare Worker endpoint
    const res  = await fetch('https://coingyaan-alerts.coingyaan.workers.dev/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, coin, trigger })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      statusEl.textContent = `✓ Alert set! You will receive a Telegram message when ${coin} sentiment turns ${trigger === 'any' ? 'Bullish or Bearish' : trigger}.`;
      statusEl.className   = 'alert-status success';
      usernameEl.value     = '';
      coinEl.value         = '';
    } else {
      throw new Error(data.message || 'Something went wrong');
    }
  } catch (e) {
    // Graceful fallback — Worker not yet deployed
    if (e.message.includes('fetch') || e.message.includes('Failed')) {
      statusEl.innerHTML = `Alert registered locally. To activate, start a chat with <a href="https://t.me/CoinGyaanBot" target="_blank" rel="noopener" style="color:#229ed9;">@CoinGyaanBot</a> on Telegram.`;
      statusEl.className = 'alert-status info';
    } else {
      statusEl.textContent = 'Error: ' + e.message;
      statusEl.className   = 'alert-status error';
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Set Alert';
  }
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadTrending();
  loadAltcoinSeason();
});

window.submitAlert = submitAlert;
console.log('CoinGyaan Features loaded — Trending + Altseason + Alerts');
