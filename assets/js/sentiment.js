// ============================================
// COINGYAAN — SENTIMENT ANALYZER V2
// Upgrades: 7-day sparkline, RSI, volume, news headlines
// ============================================

const SENTIMENT_COINGECKO_API = 'https://api.coingecko.com/api/v3';
const SENTIMENT_NEWS_API      = 'https://api.coingecko.com/api/v3/news';
const SENTIMENT_FNG_API       = 'https://api.alternative.me/fng/';

async function getCryptoId(coinName) {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/search?query=${encodeURIComponent(coinName)}`);
    const data = await res.json();
    if (data.coins && data.coins.length > 0) return data.coins[0].id;
    return coinName.toLowerCase();
  } catch (e) { return coinName.toLowerCase(); }
}

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
  } catch (e) { return null; }
}

async function getOHLC(cryptoId) {
  try {
    const res  = await fetch(`${SENTIMENT_COINGECKO_API}/coins/${cryptoId}/ohlc?vs_currency=usd&days=14`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return [];
  } catch (e) { return []; }
}

async function getCryptoNews(coinName, limit = 20) {
  try {
    const res  = await fetch(`${SENTIMENT_NEWS_API}?page=1`);
    const data = await res.json();
    // CoinGecko news format: { data: [...] }
    if (data && data.data && data.data.length) {
      return data.data.slice(0, limit).map(item => ({
        title:       item.title,
        body:        item.description || '',
        url:         item.url || '',
        publishedOn: item.updated_at || Math.floor(Date.now() / 1000),
        source:      item.author || 'CoinGecko'
      }));
    }
    return [];
  } catch (e) { return []; }
}

async function getSentimentFearGreed() {
  try {
    const res  = await fetch(SENTIMENT_FNG_API);
    const data = await res.json();
    return data?.data?.[0] ? parseInt(data.data[0].value) : 50;
  } catch (e) {
    const fgScore = document.getElementById('fgScore');
    if (fgScore && fgScore.textContent !== '--') {
      const v = parseInt(fgScore.textContent);
      if (!isNaN(v)) return v;
    }
    return 50;
  }
}

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

function analyzeNewsBias(news, cryptoName) {
  const pos = ['surge','rally','bullish','gains','up','rise','soar','adoption','partnership','upgrade','milestone','breakthrough','institutional','approval','record','high','moon','pump','positive','growth'];
  const neg = ['crash','plunge','bearish','falls','down','drop','dump','hack','scam','sec','regulation','ban','lawsuit','fraud','concerns','warning','risk','selloff','decline','slump'];
  let posScore = 0, negScore = 0;
  news.forEach(article => {
    const text = (article.title + ' ' + article.body).toLowerCase();
    if (text.includes(cryptoName.toLowerCase())) {
      pos.forEach(w => { if (text.includes(w)) posScore++; });
      neg.forEach(w => { if (text.includes(w)) negScore++; });
    }
  });
  if (posScore === 0 && negScore === 0) {
    news.slice(0, 10).forEach(article => {
      const text = (article.title + ' ' + article.body).toLowerCase();
      pos.forEach(w => { if (text.includes(w)) posScore += 0.5; });
      neg.forEach(w => { if (text.includes(w)) negScore += 0.5; });
    });
  }
  if (posScore > negScore + 2) return 'bullish';
  if (negScore > posScore + 2) return 'bearish';
  return 'neutral';
}

function analyzePriceContext(priceData) {
  if (!priceData) return 'neutral';
  if (priceData.change24h >  3) return 'bullish';
  if (priceData.change24h < -3) return 'bearish';
  return 'neutral';
}

function analyzeCommunityMood(fng) {
  if (fng >= 60) return 'bullish';
  if (fng <= 40) return 'bearish';
  return 'neutral';
}

function analyzeRSI(rsi) {
  if (rsi === null) return 'neutral';
  if (rsi <= 30) return 'bullish';
  if (rsi >= 70) return 'bearish';
  return 'neutral';
}

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

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() / 1000) - timestamp);
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function filterNewsForCoin(news, coinName) {
  const name     = coinName.toLowerCase();
  const relevant = news.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(name));
  return relevant.length >= 2 ? relevant.slice(0, 3) : news.slice(0, 3);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function calculateSentiment(cryptoName) {
  const cryptoId = await getCryptoId(cryptoName.toLowerCase().trim());

  // Sequence CoinGecko calls with small delays to avoid mobile rate limiting
  const priceData = await getCryptoPrices(cryptoId);
  await delay(600);
  const ohlcData  = await getOHLC(cryptoId);
  await delay(400);

  // News and FNG can fire together — different APIs
  const [news, fngValue] = await Promise.all([
    getCryptoNews(cryptoName, 20),
    getSentimentFearGreed()
  ]);
  const rsiValue      = calculateRSI(ohlcData);
  const newsBias      = analyzeNewsBias(news, cryptoName);
  const priceContext  = analyzePriceContext(priceData);
  const communityMood = analyzeCommunityMood(fngValue);
  const rsiSignal     = analyzeRSI(rsiValue);
  const signals       = [newsBias, priceContext, communityMood, rsiSignal];
  const bullishCount  = signals.filter(s => s === 'bullish').length;
  const bearishCount  = signals.filter(s => s === 'bearish').length;
  let overall = 'neutral';
  if (bullishCount >= 2) overall = 'bullish';
  if (bearishCount >= 2) overall = 'bearish';
  const explanations = [];
  if (newsBias === 'bullish') explanations.push(`Recent news shows positive momentum for ${cryptoName}`);
  else if (newsBias === 'bearish') explanations.push(`News indicates concerns around ${cryptoName}`);
  else explanations.push(`News coverage for ${cryptoName} is balanced`);
  if (priceData) {
    const ch = priceData.change24h.toFixed(2);
    const sign = ch >= 0 ? '+' : '';
    if (priceContext === 'bullish') explanations.push(`Strong 24h price gain of ${sign}${ch}%`);
    else if (priceContext === 'bearish') explanations.push(`Price dropped ${ch}% in the last 24 hours`);
    else explanations.push(`Price is stable at ${sign}${ch}% over 24 hours`);
  }
  if (communityMood === 'bullish') explanations.push(`Fear and Greed Index (${fngValue}) shows market optimism`);
  else if (communityMood === 'bearish') explanations.push(`Fear and Greed Index (${fngValue}) shows market fear`);
  else explanations.push(`Market sentiment (F&G: ${fngValue}) is neutral`);
  if (rsiValue !== null) {
    if (rsiSignal === 'bullish') explanations.push(`RSI at ${rsiValue} — coin may be oversold and due for a bounce`);
    else if (rsiSignal === 'bearish') explanations.push(`RSI at ${rsiValue} — coin may be overbought, caution advised`);
    else explanations.push(`RSI at ${rsiValue} — no extreme momentum signal`);
  }
  return {
    crypto: cryptoName, cryptoId, overall,
    signals: { news: newsBias, price: priceContext, mood: communityMood, rsi: rsiSignal },
    explanations,
    data: { price: priceData?.price, change24h: priceData?.change24h, volume24h: priceData?.volume24h, fng: fngValue, rsi: rsiValue },
    ohlcData,
    news: filterNewsForCoin(news, cryptoName),
    timestamp: new Date()
  };
}

function displaySentiment(data) {
  const assetTitle = document.getElementById('assetTitle');
  if (assetTitle) assetTitle.textContent = data.crypto;

  const overallEl = document.getElementById('overallSentiment');
  if (overallEl) {
    overallEl.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);
    overallEl.className   = 'badge ' + data.overall;
  }

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
    if (rsiFill)  {
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

  const newsWrap = document.getElementById('sentimentNewsItems');
  if (newsWrap) {
    if (data.news && data.news.length > 0) {
      newsWrap.innerHTML = data.news.map(n => `
        <a href="${n.url}" class="sentiment-news-item" target="_blank" rel="noopener noreferrer">
          <div class="sentiment-news-title">${n.title}</div>
          <div class="sentiment-news-time">${n.source ? n.source + ' · ' : ''}${timeAgo(n.publishedOn)}</div>
        </a>`).join('');
    } else {
      newsWrap.innerHTML = '<div class="sentiment-loading">No recent news found.</div>';
    }
  }

  const resultCard = document.getElementById('sentimentResult');
  if (resultCard) resultCard.classList.remove('hidden');
}

async function checkSentiment() {
  const input      = document.getElementById('assetInput');
  const cryptoName = input ? input.value.trim() : '';
  if (!cryptoName) { alert('Please enter a cryptocurrency name'); return; }

  const btn          = document.getElementById('checkSentimentBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) btn.textContent = 'Analyzing...';

  const resultCard = document.getElementById('sentimentResult');
  if (resultCard) resultCard.classList.add('hidden');

  const newsWrap = document.getElementById('sentimentNewsItems');
  if (newsWrap) newsWrap.innerHTML = '<div class="sentiment-loading">Loading news...</div>';

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
console.log('CoinGyaan Sentiment V2 loaded');
