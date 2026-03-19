// ============================================
// COINGYAAN — SENTIMENT ANALYZER V4
// Display: Signal rows with emoji + badge + value
// Signals: ETF Flow (BTC) / BTC Dominance (alts)
//          Price 24h, Fear & Greed, RSI
// No overall verdict — user decides
// ============================================

const SENTIMENT_COINGECKO_API = 'https://api.coingecko.com/api/v3';
const SENTIMENT_FNG_API       = 'https://api.alternative.me/fng/';

// ── Coin lookup ───────────────────────────────
async function getCryptoId(coinName) {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/search?query=${encodeURIComponent(coinName)}`);
    const data = await res.json();
    if (data.coins && data.coins.length > 0) return data.coins[0].id;
    return coinName.toLowerCase();
  } catch(e) { return coinName.toLowerCase(); }
}

// ── Price data ────────────────────────────────
async function getCryptoPrices(cryptoId) {
  try {
    const res  = await fetch(
      `${SENTIMENT_COINGECKO_API}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );
    const data = await res.json();
    if (data && data[cryptoId]) {
      const price     = data[cryptoId].usd;
      const change24h = data[cryptoId].usd_24h_change || 0;
      let   volume24h = data[cryptoId].usd_24h_vol;
      if (!volume24h) {
        try {
          const mRes  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/markets?vs_currency=usd&ids=${cryptoId}&per_page=1`);
          const mData = await mRes.json();
          if (mData && mData[0]) volume24h = mData[0].total_volume || 0;
        } catch(e) { volume24h = 0; }
      }
      return { price, change24h, volume24h };
    }
    return null;
  } catch(e) { return null; }
}

// ── OHLC for RSI ─────────────────────────────
async function getOHLC(cryptoId) {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/${cryptoId}/ohlc?vs_currency=usd&days=14`);
    const data = await res.json();
    if (Array.isArray(data) && data.length >= 15) return data;
    const chartRes  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/${cryptoId}/market_chart?vs_currency=usd&days=14&interval=daily`);
    const chartData = await chartRes.json();
    if (chartData && chartData.prices && chartData.prices.length >= 15) {
      return chartData.prices.map(p => [p[0], p[1], p[1], p[1], p[1]]);
    }
    return [];
  } catch(e) { return []; }
}

// ── Fear and Greed ────────────────────────────
async function getSentimentFearGreed() {
  try {
    const res  = await fetch(SENTIMENT_FNG_API);
    const data = await res.json();
    return data?.data?.[0] ? parseInt(data.data[0].value) : 50;
  } catch(e) {
    const fgScore = document.getElementById('fgScore');
    if (fgScore && fgScore.textContent !== '--') {
      const v = parseInt(fgScore.textContent);
      if (!isNaN(v)) return v;
    }
    return 50;
  }
}

// ── BTC ETF Flow ──────────────────────────────
async function getEtfFlow() {
  try {
    const res  = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://farside.co.uk/bitcoin-etf/'));
    const data = await res.json();
    const html = data.contents || '';
    const totalPattern = /Total[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match, lastTotal = null;
    while ((match = totalPattern.exec(html)) !== null) {
      const raw = match[1].replace(/<[^>]+>/g, '').trim().replace(/,/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val)) lastTotal = val;
    }
    if (lastTotal === null) {
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      for (let i = Math.max(0, rows.length - 5); i < rows.length; i++) {
        const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        for (let j = cells.length - 1; j >= 0; j--) {
          const raw = cells[j].replace(/<[^>]+>/g, '').trim().replace(/,/g, '');
          const val = parseFloat(raw);
          if (!isNaN(val) && Math.abs(val) < 5000) { lastTotal = val; break; }
        }
        if (lastTotal !== null) break;
      }
    }
    console.log('ETF Flow:', lastTotal);
    return lastTotal;
  } catch(e) {
    console.log('ETF flow failed:', e.message);
    return null;
  }
}

// ── BTC 7d performance (ETF fallback) ─────────
async function getBtcPerformance() {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily`);
    const data = await res.json();
    if (data && data.prices && data.prices.length >= 2) {
      const start = data.prices[0][1];
      const end   = data.prices[data.prices.length - 1][1];
      return ((end - start) / start) * 100;
    }
    return null;
  } catch(e) { return null; }
}

// ── BTC Dominance ─────────────────────────────
async function getBtcDominance() {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/global`);
    const data = await res.json();
    return data?.data?.market_cap_percentage?.btc || null;
  } catch(e) { return null; }
}

// ── RSI calculation ───────────────────────────
function calculateRSI(ohlcData, period = 14) {
  if (!ohlcData || ohlcData.length < period + 1) return null;
  const closes = ohlcData.map(c => c[4]);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round(100 - (100 / (1 + avgGain / avgLoss)));
}

// ── Sparkline ─────────────────────────────────
function drawSparkline(ohlcData, trend) {
  const canvas = document.getElementById('sentimentSparkline');
  if (!canvas || !ohlcData || ohlcData.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300;
  const H = 60;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const closes = ohlcData.map(c => c[4]);
  const minP = Math.min(...closes);
  const maxP = Math.max(...closes);
  const range = maxP - minP || 1;
  const points = closes.map((p, i) => ({
    x: (i / (closes.length - 1)) * W,
    y: H - ((p - minP) / range) * (H - 8) - 4
  }));
  const lineColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#f59e0b';
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, lineColor + '33');
  grad.addColorStop(1, lineColor + '00');
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.stroke();
}

// ── Signal analyzers ──────────────────────────
function analyzeEtfFlow(flow) {
  if (flow === null) return 'neutral';
  if (flow > 100)  return 'bullish';
  if (flow < -100) return 'bearish';
  return 'neutral';
}
function analyzeBtcPerformance(perf) {
  if (perf === null) return 'neutral';
  if (perf > 5)  return 'bullish';
  if (perf < -5) return 'bearish';
  return 'neutral';
}
function analyzeBtcDominance(dom) {
  if (dom === null) return 'neutral';
  if (dom < 48) return 'bullish';
  if (dom > 60) return 'bearish';
  return 'neutral';
}
function analyzePriceContext(priceData) {
  if (!priceData) return 'neutral';
  if (priceData.change24h > 3)  return 'bullish';
  if (priceData.change24h < -3) return 'bearish';
  return 'neutral';
}
function analyzeCommunityMood(fng) {
  if (fng >= 55) return 'bullish';
  if (fng <= 45) return 'bearish';
  return 'neutral';
}
function analyzeRSI(rsi) {
  if (rsi === null) return 'neutral';
  if (rsi <= 30) return 'bullish';
  if (rsi >= 70) return 'bearish';
  return 'neutral';
}

// ── Helpers ───────────────────────────────────
function sentimentEmoji(s) {
  if (s === 'bullish') return '🟢';
  if (s === 'bearish') return '🔴';
  return '🟡';
}
function formatPrice(p) {
  if (!p && p !== 0) return 'N/A';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + p.toFixed(2);
  return '$' + p.toFixed(6);
}
function formatVolume(v) {
  if (!v && v !== 0) return 'N/A';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v > 0)    return '$' + v.toLocaleString();
  return 'N/A';
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function delay(ms)     { return new Promise(r => setTimeout(r, ms)); }
function isBitcoin(id) { return id === 'bitcoin' || id === 'btc'; }

// ── Main calculation ──────────────────────────
async function calculateSentiment(cryptoName) {
  const cryptoId = await getCryptoId(cryptoName.toLowerCase().trim());
  const isBTC    = isBitcoin(cryptoId);

  const priceData = await getCryptoPrices(cryptoId);
  await delay(400);
  const ohlcData  = await getOHLC(cryptoId);
  await delay(300);

  const [fngValue, signal1Raw] = await Promise.all([
    getSentimentFearGreed(),
    isBTC ? getEtfFlow() : getBtcDominance()
  ]);

  let etfFallback = null;
  if (isBTC && signal1Raw === null) {
    etfFallback = await getBtcPerformance();
  }

  const rsiValue = calculateRSI(ohlcData);

  // Signal 1
  let s1Signal, s1Label, s1Value;
  if (isBTC) {
    if (signal1Raw !== null) {
      s1Signal = analyzeEtfFlow(signal1Raw);
      s1Label  = 'ETF Flow';
      s1Value  = signal1Raw >= 0
        ? '+$' + signal1Raw.toFixed(0) + 'M inflow'
        : '-$' + Math.abs(signal1Raw).toFixed(0) + 'M outflow';
    } else if (etfFallback !== null) {
      s1Signal = analyzeBtcPerformance(etfFallback);
      s1Label  = 'BTC 7d Trend';
      s1Value  = (etfFallback >= 0 ? '+' : '') + etfFallback.toFixed(1) + '%';
    } else {
      s1Signal = 'neutral';
      s1Label  = 'ETF Flow';
      s1Value  = 'Unavailable';
    }
  } else {
    s1Signal = analyzeBtcDominance(signal1Raw);
    s1Label  = 'BTC Dominance';
    s1Value  = signal1Raw !== null ? signal1Raw.toFixed(1) + '%' : 'N/A';
  }

  // Signal 2: price context
  const priceSignal = analyzePriceContext(priceData);
  let priceValue = 'N/A';
  if (priceData && priceData.change24h !== undefined) {
    priceValue = (priceData.change24h >= 0 ? '+' : '') + priceData.change24h.toFixed(2) + '% 24h';
  }

  // Signal 3: Fear & Greed
  const fngSignal  = analyzeCommunityMood(fngValue);
  const fngDisplay = 'Index: ' + fngValue;

  // Signal 4: RSI
  const rsiSignal  = analyzeRSI(rsiValue);
  const rsiDisplay = rsiValue !== null ? String(rsiValue) : 'N/A';

  const sparkTrend = priceData && priceData.change24h > 0 ? 'up'
                   : priceData && priceData.change24h < 0 ? 'down' : 'neutral';

  return {
    crypto: cryptoName, cryptoId, isBTC,
    signals: [
      { label: s1Label,          signal: s1Signal,    value: s1Value    },
      { label: 'Price Context',  signal: priceSignal, value: priceValue },
      { label: 'Fear & Greed',   signal: fngSignal,   value: fngDisplay },
      { label: 'RSI (14)',       signal: rsiSignal,   value: rsiDisplay }
    ],
    data: {
      price:     priceData?.price,
      change24h: priceData?.change24h,
      volume24h: priceData?.volume24h,
      rsi:       rsiValue
    },
    ohlcData,
    sparkTrend
  };
}

// ── Display ───────────────────────────────────
function displaySentiment(data) {
  const assetTitle = document.getElementById('assetTitle');
  if (assetTitle) assetTitle.textContent = data.crypto;

  // Signal rows
  const signalRows = document.getElementById('signalRows');
  if (signalRows) {
    signalRows.innerHTML = data.signals.map(s => `
      <div class="signal-row">
        <span class="signal-label">${s.label}</span>
        <span class="badge ${s.signal}">${sentimentEmoji(s.signal)} ${capitalize(s.signal)}</span>
        <span class="signal-value">${s.value}</span>
      </div>
    `).join('');
  }

  // Price stats row
  const v2Price  = document.getElementById('v2Price');
  const v2Change = document.getElementById('v2Change');
  const v2Volume = document.getElementById('v2Volume');
  if (v2Price) v2Price.textContent = formatPrice(data.data.price);
  if (v2Change) {
    if (data.data.change24h !== null && data.data.change24h !== undefined) {
      v2Change.textContent = (data.data.change24h >= 0 ? '+' : '') + data.data.change24h.toFixed(2) + '%';
      v2Change.className   = 'sentiment-stat-value ' + (data.data.change24h >= 0 ? 'up' : 'down');
    } else {
      v2Change.textContent = 'N/A';
      v2Change.className   = 'sentiment-stat-value';
    }
  }
  if (v2Volume) v2Volume.textContent = formatVolume(data.data.volume24h);

  // Sparkline
  if (data.ohlcData && data.ohlcData.length > 0) {
    setTimeout(() => drawSparkline(data.ohlcData, data.sparkTrend), 100);
  }

  // RSI bar
  const rsiValueEl = document.getElementById('rsiValue');
  const rsiFill    = document.getElementById('rsiFill');
  const rsiSignalEl = document.getElementById('rsiSignal');
  if (data.data.rsi !== null && data.data.rsi !== undefined) {
    if (rsiValueEl) rsiValueEl.textContent = data.data.rsi;
    if (rsiFill) {
      rsiFill.style.width      = data.data.rsi + '%';
      rsiFill.style.background = data.data.rsi <= 30 ? '#22c55e' : data.data.rsi >= 70 ? '#ef4444' : '#f59e0b';
    }
    if (rsiSignalEl) {
      if (data.data.rsi <= 30)      { rsiSignalEl.textContent = 'Oversold';   rsiSignalEl.className = 'rsi-signal rsi-oversold'; }
      else if (data.data.rsi >= 70) { rsiSignalEl.textContent = 'Overbought'; rsiSignalEl.className = 'rsi-signal rsi-overbought'; }
      else                          { rsiSignalEl.textContent = 'Neutral';    rsiSignalEl.className = 'rsi-signal rsi-neutral'; }
    }
  } else {
    if (rsiValueEl)  rsiValueEl.textContent  = 'N/A';
    if (rsiSignalEl) { rsiSignalEl.textContent = 'N/A'; rsiSignalEl.className = 'rsi-signal rsi-neutral'; }
  }

  const resultCard = document.getElementById('sentimentResult');
  if (resultCard) resultCard.classList.remove('hidden');
}

// ── Button handler ────────────────────────────
async function checkSentiment() {
  const input      = document.getElementById('assetInput');
  const cryptoName = input ? input.value.trim() : '';
  if (!cryptoName) { alert('Please enter a cryptocurrency name'); return; }

  const btn          = document.getElementById('checkSentimentBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) btn.textContent = 'Analyzing...';

  const resultCard = document.getElementById('sentimentResult');
  if (resultCard) resultCard.classList.add('hidden');

  try {
    const sentiment = await calculateSentiment(cryptoName);
    displaySentiment(sentiment);
  } catch (error) {
    console.error('Sentiment error:', error);
    alert('Error analyzing sentiment. Please try again.');
  } finally {
    if (btn) btn.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('checkSentimentBtn');
  if (btn) btn.addEventListener('click', checkSentiment);
  const input = document.getElementById('assetInput');
  if (input) input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); checkSentiment(); }
  });
});

window.checkSentiment = checkSentiment;
console.log('CoinGyaan Sentiment V4 loaded');
