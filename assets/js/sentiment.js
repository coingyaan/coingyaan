// ============================================
// COINGYAAN — SENTIMENT ANALYZER V3
// Signals: ETF Flow (BTC) / BTC Dominance (alts)
//          Price 24h, Fear and Greed, RSI
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
      return {
        price:     data[cryptoId].usd,
        change24h: data[cryptoId].usd_24h_change || 0,
        volume24h: data[cryptoId].usd_24h_vol    || 0
      };
    }
    return null;
  } catch(e) { return null; }
}

// ── OHLC for RSI ──────────────────────────────
async function getOHLC(cryptoId) {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/${cryptoId}/ohlc?vs_currency=usd&days=14`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
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

// ── BTC ETF Flow (farside.co.uk) ──────────────
async function getEtfFlow() {
  try {
    // Use a CORS proxy to fetch farside data
    const res  = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://farside.co.uk/bitcoin-etf/'));
    const data = await res.json();
    const html = data.contents || '';

    // Find the last table row with ETF total flow data
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    let totalFlow = null;

    for (let i = rows.length - 1; i >= 0; i--) {
      const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length >= 10) {
        const lastCell = cells[cells.length - 1].replace(/<[^>]+>/g, '').trim();
        const val = parseFloat(lastCell.replace(/,/g, ''));
        if (!isNaN(val)) {
          totalFlow = val;
          break;
        }
      }
    }

    console.log('ETF Flow fetched:', totalFlow);
    return totalFlow;
  } catch(e) {
    console.log('ETF flow fetch failed:', e.message);
    return null;
  }
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
    if (diff >= 0) gains  += diff;
    else           losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff <  0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round(100 - (100 / (1 + avgGain / avgLoss)));
}

// ── Sparkline ─────────────────────────────────
function drawSparkline(ohlcData, overallSentiment) {
  const canvas = document.getElementById('sentimentSparkline');
  if (!canvas || !ohlcData || ohlcData.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth || 300;
  const H   = 60;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const closes = ohlcData.map(c => c[4]);
  const minP   = Math.min(...closes);
  const maxP   = Math.max(...closes);
  const range  = maxP - minP || 1;
  const points = closes.map((p, i) => ({
    x: (i / (closes.length - 1)) * W,
    y: H - ((p - minP) / range) * (H - 8) - 4
  }));
  const lineColor = overallSentiment === 'bullish' ? '#22c55e'
                  : overallSentiment === 'bearish' ? '#ef4444'
                  : '#f59e0b';
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
  if (flow > 0)  return 'bullish';
  if (flow < 0)  return 'bearish';
  return 'neutral';
}

function analyzeBtcDominance(dominance) {
  if (dominance === null) return 'neutral';
  if (dominance < 52)  return 'bullish';  // BTC losing dominance = good for alts
  if (dominance > 58)  return 'bearish';  // BTC gaining dominance = bad for alts
  return 'neutral';
}

function analyzePriceContext(priceData) {
  if (!priceData) return 'neutral';
  if (priceData.change24h >  3) return 'bullish';
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
function formatPrice(p) {
  if (!p) return '--';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + p.toFixed(2);
  return '$' + p.toFixed(6);
}

function formatVolume(v) {
  if (!v) return '--';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + v.toLocaleString();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function isBitcoin(cryptoId) {
  return cryptoId === 'bitcoin' || cryptoId === 'btc';
}

// ── Main sentiment calculation ────────────────
async function calculateSentiment(cryptoName) {
  const cryptoId = await getCryptoId(cryptoName.toLowerCase().trim());
  const isBTC    = isBitcoin(cryptoId);

  const priceData = await getCryptoPrices(cryptoId);
  await delay(600);
  const ohlcData  = await getOHLC(cryptoId);
  await delay(400);

  const [fngValue, signal1Data] = await Promise.all([
    getSentimentFearGreed(),
    isBTC ? getEtfFlow() : getBtcDominance()
  ]);

  const rsiValue        = calculateRSI(ohlcData);
  const priceContext    = analyzePriceContext(priceData);
  const communityMood   = analyzeCommunityMood(fngValue);
  const rsiSignal       = analyzeRSI(rsiValue);

  let signal1, signal1Label, signal1Value;
  if (isBTC) {
    signal1       = analyzeEtfFlow(signal1Data);
    signal1Label  = 'ETF Flow';
    signal1Value  = signal1Data !== null
      ? (signal1Data > 0 ? '+$' + signal1Data.toFixed(0) + 'M' : '-$' + Math.abs(signal1Data).toFixed(0) + 'M')
      : 'No data';
  } else {
    signal1       = analyzeBtcDominance(signal1Data);
    signal1Label  = 'BTC Dominance';
    signal1Value  = signal1Data !== null ? signal1Data.toFixed(1) + '%' : 'No data';
  }

  const signals      = [signal1, priceContext, communityMood, rsiSignal];
  const bullishCount = signals.filter(s => s === 'bullish').length;
  const bearishCount = signals.filter(s => s === 'bearish').length;
  let overall = 'neutral';
  if (bullishCount >= 2) overall = 'bullish';
  if (bearishCount >= 2) overall = 'bearish';

  // Explanations
  const explanations = [];
  if (isBTC) {
    if (signal1 === 'bullish')      explanations.push(`Bitcoin ETF recorded net inflows of ${signal1Value} — institutional buying`);
    else if (signal1 === 'bearish') explanations.push(`Bitcoin ETF recorded net outflows of ${signal1Value} — institutional selling`);
    else                            explanations.push(`Bitcoin ETF flow data unavailable or neutral today`);
  } else {
    if (signal1 === 'bullish')      explanations.push(`BTC dominance at ${signal1Value} — capital rotating into altcoins`);
    else if (signal1 === 'bearish') explanations.push(`BTC dominance at ${signal1Value} — capital moving toward Bitcoin`);
    else                            explanations.push(`BTC dominance at ${signal1Value} — market is balanced between BTC and alts`);
  }

  if (priceData) {
    const ch   = priceData.change24h.toFixed(2);
    const sign = ch >= 0 ? '+' : '';
    if (priceContext === 'bullish')      explanations.push(`Strong 24h price gain of ${sign}${ch}%`);
    else if (priceContext === 'bearish') explanations.push(`Price dropped ${ch}% in the last 24 hours`);
    else                                explanations.push(`Price is stable at ${sign}${ch}% over 24 hours`);
  }

  if (communityMood === 'bullish')      explanations.push(`Fear and Greed Index (${fngValue}) shows market optimism`);
  else if (communityMood === 'bearish') explanations.push(`Fear and Greed Index (${fngValue}) shows market fear`);
  else                                  explanations.push(`Market sentiment (F&G: ${fngValue}) is neutral`);

  if (rsiValue !== null) {
    if (rsiSignal === 'bullish')      explanations.push(`RSI at ${rsiValue} — coin may be oversold and due for a bounce`);
    else if (rsiSignal === 'bearish') explanations.push(`RSI at ${rsiValue} — coin may be overbought, caution advised`);
    else                              explanations.push(`RSI at ${rsiValue} — no extreme momentum signal`);
  }

  return {
    crypto: cryptoName, cryptoId, overall, isBTC,
    signal1Label, signal1Value,
    signals: { news: signal1, price: priceContext, mood: communityMood, rsi: rsiSignal },
    explanations,
    data: { price: priceData?.price, change24h: priceData?.change24h, volume24h: priceData?.volume24h, fng: fngValue, rsi: rsiValue },
    ohlcData,
    timestamp: new Date()
  };
}

// ── Display ───────────────────────────────────
function displaySentiment(data) {
  const assetTitle = document.getElementById('assetTitle');
  if (assetTitle) assetTitle.textContent = data.crypto;

  const overallEl = document.getElementById('overallSentiment');
  if (overallEl) {
    overallEl.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);
    overallEl.className   = 'badge ' + data.overall;
  }

  // Update dynamic signal label
  const newsLabelEl = document.getElementById('newsSignalLabel');
  if (newsLabelEl) newsLabelEl.textContent = data.signal1Label;

  [['newsSignal', data.signals.news], ['priceSignal', data.signals.price], ['moodSignal', data.signals.mood]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val.charAt(0).toUpperCase() + val.slice(1); el.className = 'badge ' + val; }
  });

  const v2Price  = document.getElementById('v2Price');
  const v2Change = document.getElementById('v2Change');
  const v2Volume = document.getElementById('v2Volume');
  if (v2Price)  v2Price.textContent = formatPrice(data.data.price);
  if (v2Change && data.data.change24h !== undefined) {
    const ch = data.data.change24h.toFixed(2);
    v2Change.textContent = (data.data.change24h >= 0 ? '+' : '') + ch + '%';
    v2Change.className   = 'sentiment-stat-value ' + (data.data.change24h >= 0 ? 'up' : 'down');
  }
  if (v2Volume) v2Volume.textContent = formatVolume(data.data.volume24h);

  if (data.ohlcData && data.ohlcData.length > 0) setTimeout(() => drawSparkline(data.ohlcData, data.overall), 100);

  const rsiValue  = document.getElementById('rsiValue');
  const rsiFill   = document.getElementById('rsiFill');
  const rsiSignal = document.getElementById('rsiSignal');
  if (data.data.rsi !== null && data.data.rsi !== undefined) {
    if (rsiValue) rsiValue.textContent = data.data.rsi;
    if (rsiFill) {
      rsiFill.style.width      = data.data.rsi + '%';
      rsiFill.style.background = data.data.rsi <= 30 ? '#22c55e' : data.data.rsi >= 70 ? '#ef4444' : '#f59e0b';
    }
    if (rsiSignal) {
      if (data.data.rsi <= 30)      { rsiSignal.textContent = 'Oversold';   rsiSignal.className = 'rsi-signal rsi-oversold'; }
      else if (data.data.rsi >= 70) { rsiSignal.textContent = 'Overbought'; rsiSignal.className = 'rsi-signal rsi-overbought'; }
      else                          { rsiSignal.textContent = 'Neutral';    rsiSignal.className = 'rsi-signal rsi-neutral'; }
    }
  } else {
    if (rsiValue)  rsiValue.textContent  = 'N/A';
    if (rsiSignal) rsiSignal.textContent = 'N/A';
  }

  const reasonsList = document.getElementById('sentimentReasons');
  if (reasonsList) reasonsList.innerHTML = data.explanations.map(e => `<li>${e}</li>`).join('');

  const resultCard = document.getElementById('sentimentResult');
  if (resultCard) resultCard.classList.remove('hidden');
}

// ── Check button ──────────────────────────────
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
console.log('CoinGyaan Sentiment V3 loaded');
