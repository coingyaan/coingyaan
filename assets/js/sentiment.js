// ============================================
// COINGYAAN - SENTIMENT ANALYZER (FINAL - WITH CACHE BUSTING)
// ============================================

const SENTIMENT_COINGECKO_API = 'https://api.coingecko.com/api/v3';
const SENTIMENT_NEWS_API = 'https://min-api.cryptocompare.com/data/v2/news/';
const SENTIMENT_FNG_API = 'https://api.alternative.me/fng/';

async function getCryptoId(coinName) {
    try {
        console.log('🔎 Searching CoinGecko for:', coinName);
        const response = await fetch(
            `${SENTIMENT_COINGECKO_API}/search?query=${encodeURIComponent(coinName)}`
        );
        const data = await response.json();
        if (data.coins && data.coins.length > 0) {
            const match = data.coins[0];
            console.log('✅ Found coin:', match.name, '| ID:', match.id);
            return match.id;
        }
        console.warn('⚠️ No coin found for:', coinName, '— using raw name');
        return coinName.toLowerCase();
    } catch (error) {
        console.error('❌ Coin search failed:', error);
        return coinName.toLowerCase();
    }
}

async function getCryptoPrices(cryptoId) {
    try {
        console.log('💰 Fetching price for:', cryptoId);
        const response = await fetch(
            `${SENTIMENT_COINGECKO_API}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();
        console.log('📊 Price data:', data);
        
        if (data && data[cryptoId]) {
            return {
                price: data[cryptoId].usd,
                change24h: data[cryptoId].usd_24h_change || 0
            };
        }
        return null;
    } catch (error) {
        console.error('❌ Error fetching prices:', error);
        return null;
    }
}

async function getCryptoNews(limit = 20) {
    try {
        console.log('📰 Fetching crypto news...');
        const response = await fetch(`${SENTIMENT_NEWS_API}?lang=EN&sortOrder=latest`);
        const data = await response.json();
        console.log('📝 News data received:', data.Data?.length, 'articles');
        
        if (data && data.Data) {
            return data.Data.slice(0, limit).map(item => ({
                title: item.title,
                body: item.body,
                url: item.url
            }));
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching news:', error);
        return [];
    }
}

async function getSentimentFearGreed() {
    try {
        const response = await fetch(SENTIMENT_FNG_API);
        const data = await response.json();
        return data?.data?.[0] ? parseInt(data.data[0].value) : 50;
    } catch (error) {
        console.error('❌ Error fetching F&G for sentiment:', error);
        
        const fgScore = document.getElementById('fgScore');
        if (fgScore && fgScore.textContent && fgScore.textContent !== '--') {
            const value = parseInt(fgScore.textContent);
            if (!isNaN(value)) {
                console.log('ℹ️ Using F&G from page:', value);
                return value;
            }
        }
        
        return 50;
    }
}

function analyzeNewsBias(news, cryptoName) {
    const positiveKeywords = ['surge', 'rally', 'bullish', 'gains', 'up', 'rise', 'soar', 'adoption', 'partnership', 'upgrade', 'milestone', 'breakthrough', 'institutional', 'approval', 'record', 'high', 'moon', 'pump', 'positive', 'growth'];
    
    const negativeKeywords = ['crash', 'plunge', 'bearish', 'falls', 'down', 'drop', 'dump', 'hack', 'scam', 'sec', 'regulation', 'ban', 'lawsuit', 'fraud', 'concerns', 'warning', 'risk', 'selloff', 'decline', 'slump'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    news.forEach(article => {
        const text = (article.title + ' ' + article.body).toLowerCase();
        
        if (text.includes(cryptoName.toLowerCase())) {
            positiveKeywords.forEach(word => {
                if (text.includes(word)) positiveScore++;
            });
            negativeKeywords.forEach(word => {
                if (text.includes(word)) negativeScore++;
            });
        }
    });
    
    if (positiveScore === 0 && negativeScore === 0) {
        news.slice(0, 10).forEach(article => {
            const text = (article.title + ' ' + article.body).toLowerCase();
            positiveKeywords.forEach(word => {
                if (text.includes(word)) positiveScore += 0.5;
            });
            negativeKeywords.forEach(word => {
                if (text.includes(word)) negativeScore += 0.5;
            });
        });
    }
    
    if (positiveScore > negativeScore + 2) return 'bullish';
    if (negativeScore > positiveScore + 2) return 'bearish';
    return 'neutral';
}

function analyzePriceContext(priceData) {
    if (!priceData) return 'neutral';
    const change = priceData.change24h;
    if (change > 3) return 'bullish';
    if (change < -3) return 'bearish';
    return 'neutral';
}

function analyzeCommunityMood(fngValue) {
    if (fngValue >= 60) return 'bullish';
    if (fngValue <= 40) return 'bearish';
    return 'neutral';
}

async function calculateSentiment(cryptoName) {
    console.log('🔍 Calculating sentiment for:', cryptoName);
    
    const normalizedName = cryptoName.toLowerCase().trim();
    const cryptoId = await getCryptoId(normalizedName);
    
    console.log('🎯 Using crypto ID:', cryptoId);
    
    const [priceData, news, fngValue] = await Promise.all([
        getCryptoPrices(cryptoId),
        getCryptoNews(20),
        getSentimentFearGreed()
    ]);
    
    console.log('📊 All data fetched:', { priceData, newsCount: news.length, fngValue });
    
    const newsBias = analyzeNewsBias(news, cryptoName);
    const priceContext = analyzePriceContext(priceData);
    const communityMood = analyzeCommunityMood(fngValue);
    
    console.log('📈 Signals:', { newsBias, priceContext, communityMood });
    
    const signals = [newsBias, priceContext, communityMood];
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;
    
    let overall = 'neutral';
    if (bullishCount >= 2) overall = 'bullish';
    else if (bearishCount >= 2) overall = 'bearish';
    
    const explanations = [];
    
    if (newsBias === 'bullish') {
        explanations.push(`Recent news shows positive sentiment for ${cryptoName}`);
    } else if (newsBias === 'bearish') {
        explanations.push(`News indicates concerns around ${cryptoName}`);
    } else {
        explanations.push(`News coverage for ${cryptoName} is balanced`);
    }
    
    if (priceData) {
        const change = priceData.change24h.toFixed(2);
        const sign = change >= 0 ? '+' : '';
        if (priceContext === 'bullish') {
            explanations.push(`Price up ${sign}${change}% in 24 hours`);
        } else if (priceContext === 'bearish') {
            explanations.push(`Price down ${change}% in 24 hours`);
        } else {
            explanations.push(`Price stable at ${sign}${change}% in 24 hours`);
        }
    } else {
        explanations.push(`Price data unavailable for ${cryptoName}`);
    }
    
    if (communityMood === 'bullish') {
        explanations.push(`Market Fear & Greed (${fngValue}) shows optimism`);
    } else if (communityMood === 'bearish') {
        explanations.push(`Market Fear & Greed (${fngValue}) shows fear`);
    } else {
        explanations.push(`Market sentiment (F&G: ${fngValue}) is neutral`);
    }
    
    return {
        crypto: cryptoName,
        overall,
        signals: { news: newsBias, price: priceContext, mood: communityMood },
        explanations,
        data: { price: priceData?.price, change24h: priceData?.change24h, fng: fngValue },
        timestamp: new Date()
    };
}

function displaySentiment(data) {
    console.log('🎨 Displaying sentiment:', data);
    
    const assetTitle = document.getElementById('assetTitle');
    if (assetTitle) assetTitle.textContent = data.crypto;
    
    const overallEl = document.getElementById('overallSentiment');
    if (overallEl) {
        overallEl.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);
        overallEl.className = 'badge ' + data.overall;
    }
    
    const newsSignal = document.getElementById('newsSignal');
    if (newsSignal) {
        newsSignal.textContent = data.signals.news.charAt(0).toUpperCase() + data.signals.news.slice(1);
        newsSignal.className = 'badge ' + data.signals.news;
    }
    
    const priceSignal = document.getElementById('priceSignal');
    if (priceSignal) {
        priceSignal.textContent = data.signals.price.charAt(0).toUpperCase() + data.signals.price.slice(1);
        priceSignal.className = 'badge ' + data.signals.price;
    }
    
    const moodSignal = document.getElementById('moodSignal');
    if (moodSignal) {
        moodSignal.textContent = data.signals.mood.charAt(0).toUpperCase() + data.signals.mood.slice(1);
        moodSignal.className = 'badge ' + data.signals.mood;
    }
    
    const reasonsList = document.getElementById('sentimentReasons');
    if (reasonsList) {
        reasonsList.innerHTML = data.explanations.map(exp => `<li>${exp}</li>`).join('');
    }
    
    const resultCard = document.getElementById('sentimentResult');
    if (resultCard) {
        resultCard.classList.remove('hidden');
        console.log('✅ Showing result card');
    }
    
    console.log('🎉 Display complete!');
}

async function checkSentiment() {
    console.log('🚀 checkSentiment() called');
    
    const input = document.getElementById('assetInput');
    const cryptoName = input ? input.value.trim() : '';
    
    console.log('📝 Input value:', cryptoName);
    
    if (!cryptoName) {
        alert('Please enter a cryptocurrency name');
        return;
    }
    
    const btn = document.getElementById('checkSentimentBtn');
    const originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Analyzing...';
    const resultCard = document.getElementById('sentimentResult');
    if (resultCard) resultCard.classList.add('hidden');
    
    try {
        const sentiment = await calculateSentiment(cryptoName);
        displaySentiment(sentiment);
    } catch (error) {
        console.error('❌ Error in checkSentiment:', error);
        alert('Error analyzing sentiment. Please try again.');
    } finally {
        if (btn) btn.textContent = originalText;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Sentiment analyzer loaded');
    
    const btn = document.getElementById('checkSentimentBtn');
    if (btn) {
        btn.addEventListener('click', checkSentiment);
        console.log('✅ Button click handler attached');
    } else {
        console.error('❌ Could not find #checkSentimentBtn');
    }
    
    const input = document.getElementById('assetInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkSentiment();
            }
        });
        console.log('✅ Enter key handler attached');
    }
});

window.checkSentiment = checkSentiment;
console.log('✅ sentiment.js loaded successfully');
