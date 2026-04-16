// ============================================
// COINGYAAN - SENTIMENT ANALYZER V5
// Signals: Institutional Momentum (BTC) / BTC Dominance Direction (alts)
//          Volume Surge, Fear and Greed, RSI 14, Price vs 200 MA
// Weighted Market Condition Score 0 to 100
// Zone: Accumulation / Caution / Optimistic / Overheated
// Confidence: how many signals agree
// Binance API for RSI, 200 MA, Volume (free, no key)
// Alternative.me for Fear and Greed
// CoinGecko for coin lookup and price
// ============================================

const SENTIMENT_CG_API      = 'https://api.coingecko.com/api/v3';
const SENTIMENT_FNG_API     = 'https://api.alternative.me/fng/';
const BINANCE_API           = 'https://api.binance.com/api/v3';

// ── Helpers ───────────────────────────────────
function delay(ms)     { return new Promise(r => setTimeout(r, ms)); }
function isBTC(id)     { return id === 'bitcoin' || id === 'btc'; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
function sentimentEmoji(s) {
  if (s === 'bullish') return '🟢';
  if (s === 'bearish') return '🔴';
  return '🟡';
}

// ── Coin lookup ───────────────────────────────
async function getCryptoId(coinName) {
  try {
    const res  = await fetch(`${SENTIMENT_CG_API}/search?query=${encodeURIComponent(coinName)}`);
    const data = await res.json();
    if (data.coins && data.coins.length > 0) return data.coins[0].id;
    return coinName.toLowerCase();
  } catch(e) { return coinName.toLowerCase(); }
}

// ── Binance symbol from CoinGecko id ─────────
function toBinanceSymbol(coinId) {
  const map = {
    'bitcoin':        'BTCUSDT',
    'ethereum':       'ETHUSDT',
    'solana':         'SOLUSDT',
    'binancecoin':    'BNBUSDT',
    'ripple':         'XRPUSDT',
    'cardano':        'ADAUSDT',
    'dogecoin':       'DOGEUSDT',
    'avalanche-2':    'AVAXUSDT',
    'chainlink':      'LINKUSDT',
    'polkadot':       'DOTUSDT',
    'tron':           'TRXUSDT',
    'shiba-inu':      'SHIBUSDT',
    'litecoin':       'LTCUSDT',
    'uniswap':        'UNIUSDT',
    'stellar':        'XLMUSDT',
    'near':           'NEARUSDT',
    'aptos':          'APTUSDT',
    'arbitrum':       'ARBUSDT',
    'optimism':       'OPUSDT',
    'sui':            'SUIUSDT',
    'render-token':   'RENDERUSDT',
    'injective-protocol': 'INJUSDT',
    'internet-computer': 'ICPUSDT',
    'filecoin':       'FILUSDT',
    'aave':           'AAVEUSDT',
    'cosmos':         'ATOMUSDT',
    'hedera-hashgraph': 'HBARUSDT',
    'pepe':           'PEPEUSDT',
    'worldcoin-wld':  'WLDUSDT'
  };
  return map[coinId] || (coinId.replace(/-/g, '').toUpperCase() + 'USDT');
}

// ── Binance klines (200 daily candles) ────────
async function getBinanceKlines(symbol, limit = 200) {
  try {
    const res  = await fetch(`${BINANCE_API}/klines?symbol=${symbol}&interval=1d&limit=${limit}`);
    if (!res.ok) throw new Error('Binance klines failed');
    const data = await res.json();
    // Returns: [openTime, open, high, low, close, volume, ...]
    return data;
  } catch(e) {
    console.log('Binance klines error:', e.message);
    return null;
  }
}

// ── Binance 24h ticker ────────────────────────
async function getBinanceTicker(symbol) {
  try {
    const res  = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`);
    if (!res.ok) throw new Error('Binance ticker failed');
    return await res.json();
  } catch(e) {
    console.log('Binance ticker error:', e.message);
    return null;
  }
}

// ── RSI 14 from klines ────────────────────────
function calculateRSI(klines, period = 14) {
  if (!klines || klines.length < period + 2) return null;
  const closes = klines.map(k => parseFloat(k[4]));
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

// ── 200 Day Moving Average ────────────────────
function calculate200MA(klines) {
  if (!klines || klines.length < 200) return null;
  const closes = klines.slice(-200).map(k => parseFloat(k[4]));
  return closes.reduce((a, b) => a + b, 0) / 200;
}

// ── Volume Surge (24h vs 7d avg) ─────────────
function calculateVolumeSurge(klines, ticker) {
  if (!klines || klines.length < 8) return null;
  // 7 day average volume from klines
  const last7 = klines.slice(-8, -1);
  const avgVol = last7.reduce((a, k) => a + parseFloat(k[5]), 0) / 7;
  const vol24h = ticker ? parseFloat(ticker.volume) : parseFloat(klines[klines.length - 1][5]);
  if (!avgVol || avgVol === 0) return null;
  return ((vol24h - avgVol) / avgVol) * 100; // % above or below average
}

// ── BTC Dominance direction ───────────────────
async function getBtcDominanceDirection() {
  try {
    // Use window cached value from features.js if available
    if (window._cgBtcDom) {
      return { current: window._cgBtcDom, direction: 'stable' };
    }
    const res  = await fetch(`${SENTIMENT_CG_API}/global`);
    const data = await res.json();
    const dom  = data?.data?.market_cap_percentage?.btc || null;
    return dom ? { current: dom, direction: 'stable' } : null;
  } catch(e) { return null; }
}

// ── Price data from CoinGecko ─────────────────
async function getCGPriceData(cryptoId) {
  try {
    const res  = await fetch(
      `${SENTIMENT_CG_API}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );
    const data = await res.json();
    if (data && data[cryptoId]) {
      return {
        price:     data[cryptoId].usd,
        change24h: data[cryptoId].usd_24h_change || 0,
        volume24h: data[cryptoId].usd_24h_vol || 0
      };
    }
    return null;
  } catch(e) { return null; }
}

// ── Fear and Greed ────────────────────────────
async function getFearGreed() {
  try {
    const res  = await fetch(SENTIMENT_FNG_API);
    const data = await res.json();
    return data?.data?.[0] ? parseInt(data.data[0].value) : 50;
  } catch(e) {
    const fgEl = document.getElementById('fgScore');
    if (fgEl && fgEl.textContent !== '--') {
      const v = parseInt(fgEl.textContent);
      if (!isNaN(v)) return v;
    }
    return 50;
  }
}

// ── Signal analyzers ──────────────────────────
function analyzeRSI(rsi) {
  if (rsi === null) return { signal: 'neutral', score: 50 };
  if (rsi <= 30) return { signal: 'bullish', score: 80 };
  if (rsi <= 45) return { signal: 'bullish', score: 60 };
  if (rsi >= 70) return { signal: 'bearish', score: 20 };
  if (rsi >= 55) return { signal: 'bearish', score: 40 };
  return { signal: 'neutral', score: 50 };
}

function analyze200MA(currentPrice, ma200) {
  if (!currentPrice || !ma200) return { signal: 'neutral', score: 50 };
  const pctAbove = ((currentPrice - ma200) / ma200) * 100;
  if (pctAbove > 10)  return { signal: 'bullish', score: 80 };
  if (pctAbove > 0)   return { signal: 'bullish', score: 60 };
  if (pctAbove < -10) return { signal: 'bearish', score: 20 };
  if (pctAbove < 0)   return { signal: 'bearish', score: 40 };
  return { signal: 'neutral', score: 50 };
}

function analyzeVolumeSurge(surgePct) {
  if (surgePct === null) return { signal: 'neutral', score: 50 };
  if (surgePct > 50)  return { signal: 'bullish', score: 80 };
  if (surgePct > 20)  return { signal: 'bullish', score: 65 };
  if (surgePct < -30) return { signal: 'bearish', score: 30 };
  if (surgePct < -10) return { signal: 'bearish', score: 40 };
  return { signal: 'neutral', score: 50 };
}

function analyzeFearGreed(fng) {
  if (fng >= 75) return { signal: 'bearish', score: 20 };
  if (fng >= 55) return { signal: 'bullish', score: 65 };
  if (fng <= 25) return { signal: 'bullish', score: 75 };
  if (fng <= 45) return { signal: 'bearish', score: 40 };
  return { signal: 'neutral', score: 50 };
}

function analyzeInstitutionalMomentum(ticker, klines) {
  // For BTC: volume surge + price direction combined
  if (!ticker) return { signal: 'neutral', score: 50 };
  const priceChange = parseFloat(ticker.priceChangePercent || 0);
  const volSurge    = parseFloat(ticker.volume || 0);
  if (priceChange > 3)  return { signal: 'bullish', score: 75 };
  if (priceChange > 1)  return { signal: 'bullish', score: 60 };
  if (priceChange < -3) return { signal: 'bearish', score: 25 };
  if (priceChange < -1) return { signal: 'bearish', score: 40 };
  return { signal: 'neutral', score: 50 };
}

function analyzeBtcDominance(dom) {
  if (!dom) return { signal: 'neutral', score: 50 };
  const current = dom.current;
  if (current < 48) return { signal: 'bullish', score: 70 }; // low dom = good for alts
  if (current > 60) return { signal: 'bearish', score: 30 }; // high dom = bad for alts
  return { signal: 'neutral', score: 50 };
}

// ── Weighted Market Condition Score ───────────
// Weights: RSI 25%, 200MA 20%, Volume 20%, FnG 25%, Signal1 10%
function calculateMarketScore(signals) {
  const weights = [0.25, 0.20, 0.20, 0.25, 0.10];
  let total = 0;
  signals.forEach((s, i) => {
    total += (s.score || 50) * (weights[i] || 0.1);
  });
  return Math.round(total);
}

// ── Zone from score ───────────────────────────
function getZone(score) {
  if (score <= 30) return { label: 'Accumulation Zone', class: 'zone-accumulation', action: 'Market is in fear. Historically a time patient buyers look for entries.' };
  if (score <= 50) return { label: 'Caution Zone',      class: 'zone-caution',      action: 'Mixed signals. Wait for clearer direction before acting.' };
  if (score <= 70) return { label: 'Optimistic Zone',   class: 'zone-optimistic',   action: 'Positive momentum building. Trend favours buyers but stay cautious.' };
  return                  { label: 'Overheated Zone',   class: 'zone-overheated',   action: 'Market running hot. High risk of short term correction. Manage positions carefully.' };
}

// ── Confidence from signal agreement ─────────
function getConfidence(signals) {
  const bullish = signals.filter(s => s.signal === 'bullish').length;
  const bearish = signals.filter(s => s.signal === 'bearish').length;
  const dominant = Math.max(bullish, bearish);
  const total    = signals.length;
  const pct      = Math.round((dominant / total) * 100);
  let label;
  if (pct >= 80) label = 'Very High';
  else if (pct >= 60) label = 'High';
  else if (pct >= 40) label = 'Moderate';
  else label = 'Low';
  return { pct, label, bullish, bearish, total };
}

// ── Today's Insight templates ─────────────────
function getTodaysInsight(score, fng, rsi, volSurge) {
  if (score <= 25) {
    return 'Extreme fear is dominating the market. Historically these conditions have preceded recovery phases for patient investors. This is not a signal to act rashly but to observe carefully.';
  }
  if (score <= 40) {
    if (rsi && rsi < 35) return 'RSI is approaching oversold territory while sentiment remains cautious. Markets often find support around these levels. Worth watching closely.';
    return 'The market is in a cautious phase. Volume and momentum are subdued. Waiting for confirmation of direction is the prudent approach here.';
  }
  if (score <= 55) {
    return 'Market signals are mixed with no clear dominant direction. This often happens before a significant move. Observing volume and price action closely will give early clues.';
  }
  if (score <= 70) {
    if (volSurge && volSurge > 30) return 'Positive sentiment is being backed by above average volume. This combination historically strengthens the case for continued upward momentum.';
    return 'Sentiment is tilting positive and momentum is building. The trend favours buyers but confirmation from volume would strengthen the case further.';
  }
  return 'Market conditions are showing signs of overheating. When greed dominates and RSI is elevated, the probability of short term pullbacks increases. Risk management is important here.';
}

// ── Sparkline ─────────────────────────────────
function drawSparkline(klines, trend) {
  const canvas = document.getElementById('sentimentSparkline');
  if (!canvas || !klines || klines.length === 0) return;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.offsetWidth || 300;
  const H    = 60;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const closes = klines.slice(-14).map(k => parseFloat(k[4]));
  const minP   = Math.min(...closes);
  const maxP   = Math.max(...closes);
  const range  = maxP - minP || 1;
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

// ── Main calculation ──────────────────────────
async function calculateSentiment(cryptoName) {
  const cryptoId     = await getCryptoId(cryptoName.toLowerCase().trim());
  const isBtc        = isBTC(cryptoId);
  const binanceSymbol = toBinanceSymbol(cryptoId);

  // Parallel: CoinGecko price + Binance klines + Fear and Greed
  const [priceData, klines, fng] = await Promise.all([
    getCGPriceData(cryptoId),
    getBinanceKlines(binanceSymbol, 210),
    getFearGreed()
  ]);

  // Binance 24h ticker for volume surge
  const ticker = await getBinanceTicker(binanceSymbol);

  // BTC dominance direction for altcoins
  let domData = null;
  if (!isBtc) {
    await delay(400);
    domData = await getBtcDominanceDirection();
  }

  // Calculate technical values
  const rsi       = calculateRSI(klines);
  const ma200     = calculate200MA(klines);
  const volSurge  = calculateVolumeSurge(klines, ticker);

  // Current price (prefer Binance ticker, fallback to CoinGecko)
  const currentPrice = ticker
    ? parseFloat(ticker.lastPrice)
    : (priceData ? priceData.price : null);

  // ── Build 5 signals ──
  let signals = [];

  // Signal 1: RSI 14 (weight 25%)
  const rsiAnalysis = analyzeRSI(rsi);
  signals.push({
    label:   'RSI (14)',
    signal:  rsiAnalysis.signal,
    score:   rsiAnalysis.score,
    value:   rsi !== null ? String(rsi) : 'N/A'
  });

  // Signal 2: Price vs 200 MA (weight 20%)
  const maAnalysis = analyze200MA(currentPrice, ma200);
  const maDiff     = (currentPrice && ma200)
    ? ((currentPrice - ma200) / ma200 * 100).toFixed(1)
    : null;
  signals.push({
    label:  'vs 200 MA',
    signal: maAnalysis.signal,
    score:  maAnalysis.score,
    value:  maDiff !== null
      ? (parseFloat(maDiff) >= 0 ? '+' : '') + maDiff + '% vs MA'
      : 'N/A'
  });

  // Signal 3: Volume Surge (weight 20%)
  const volAnalysis = analyzeVolumeSurge(volSurge);
  signals.push({
    label:  'Volume',
    signal: volAnalysis.signal,
    score:  volAnalysis.score,
    value:  volSurge !== null
      ? (volSurge >= 0 ? '+' : '') + volSurge.toFixed(0) + '% vs avg'
      : 'N/A'
  });

  // Signal 4: Fear and Greed (weight 25%)
  const fngAnalysis = analyzeFearGreed(fng);
  signals.push({
    label:  'Fear and Greed',
    signal: fngAnalysis.signal,
    score:  fngAnalysis.score,
    value:  'Index: ' + fng
  });

  // Signal 5: Institutional Momentum (BTC) or BTC Dominance (alts) (weight 10%)
  if (isBtc) {
    const instAnalysis = analyzeInstitutionalMomentum(ticker, klines);
    const priceChg     = ticker ? parseFloat(ticker.priceChangePercent).toFixed(2) : null;
    signals.push({
      label:  'Inst. Momentum',
      signal: instAnalysis.signal,
      score:  instAnalysis.score,
      value:  priceChg !== null ? (parseFloat(priceChg) >= 0 ? '+' : '') + priceChg + '% 24h' : 'N/A'
    });
  } else {
    const domAnalysis = analyzeBtcDominance(domData);
    signals.push({
      label:  'BTC Dominance',
      signal: domAnalysis.signal,
      score:  domAnalysis.score,
      value:  domData ? domData.current.toFixed(1) + '%' : 'N/A'
    });
  }

  // ── Market Condition Score ──
  const marketScore  = calculateMarketScore(signals);
  const zone         = getZone(marketScore);
  const confidence   = getConfidence(signals);
  const insight      = getTodaysInsight(marketScore, fng, rsi, volSurge);

  // Sparkline trend
  const sparkTrend = currentPrice && priceData
    ? (priceData.change24h > 0 ? 'up' : priceData.change24h < 0 ? 'down' : 'neutral')
    : 'neutral';

  return {
    crypto: cryptoName,
    cryptoId,
    isBtc,
    signals,
    marketScore,
    zone,
    confidence,
    insight,
    data: {
      price:     currentPrice || priceData?.price,
      change24h: priceData?.change24h,
      volume24h: priceData?.volume24h,
      rsi,
      ma200,
      volSurge
    },
    klines,
    sparkTrend
  };
}

// ── Display ───────────────────────────────────
function displaySentiment(data) {
  // Asset title
  const assetTitle = document.getElementById('assetTitle');
  if (assetTitle) assetTitle.textContent = data.crypto;

  // Signal rows (existing UI unchanged)
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

  // Market Condition Score block
  const scoreBlock = document.getElementById('marketScoreBlock');
  if (scoreBlock) {
    const zone = data.zone;
    const conf = data.confidence;
    const dominant = conf.bullish >= conf.bearish ? 'bullish' : 'bearish';
    scoreBlock.innerHTML = `
      <div class="market-score-wrap">
        <div class="market-score-number ${dominant}">${data.marketScore}<span style="font-size:13px;color:#64748b;">/100</span></div>
        <div class="market-score-label ${zone.class}">${zone.label}</div>
        <div class="market-score-confidence">
          ${conf.label} Confidence &nbsp;|&nbsp; ${conf.bullish} of ${conf.total} signals bullish
        </div>
        <div class="market-score-action">${zone.action}</div>
      </div>
    `;
  }

  // Today's Insight block
  const insightBlock = document.getElementById('todaysInsight');
  if (insightBlock) {
    insightBlock.innerHTML = `
      <div class="insight-wrap">
        <div class="insight-label">Today's Market Insight</div>
        <div class="insight-text">${data.insight}</div>
      </div>
    `;
  }

  // Price stats row
  const v2Price  = document.getElementById('v2Price');
  const v2Change = document.getElementById('v2Change');
  const v2Volume = document.getElementById('v2Volume');
  if (v2Price)  v2Price.textContent  = formatPrice(data.data.price);
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
  if (data.klines && data.klines.length > 0) {
    setTimeout(() => drawSparkline(data.klines, data.sparkTrend), 100);
  }

  // RSI bar
  const rsiValueEl  = document.getElementById('rsiValue');
  const rsiFill     = document.getElementById('rsiFill');
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

  // Last updated
  const lastUpdatedEl = document.getElementById('sentimentLastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // Show result card
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
  if (input) input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); checkSentiment(); }
  });
});

window.checkSentiment = checkSentiment;
console.log('CoinGyaan Sentiment V5 loaded');
