// ============================================
// COINGYAAN - SENTIMENT ANALYZER
// Matches HTML IDs: assetInput, checkSentimentBtn, sentimentResult, etc.
// ============================================

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CRYPTO_NEWS_API = 'https://min-api.cryptocompare.com/data/v2/news/';
const FNG_API = 'https://api.alternative.me/fng/';

const CRYPTO_IDS = {
    'bitcoin': 'bitcoin', 'btc': 'bitcoin',
    'ethereum': 'ethereum', 'eth': 'ethereum',
    'solana': 'solana', 'sol': 'solana',
    'bnb': 'binancecoin', 'binance': 'binancecoin',
    'cardano': 'cardano', 'ada': 'cardano',
    'ripple': 'ripple', 'xrp': 'ripple',
    'dogecoin': 'dogecoin', 'doge': 'dogecoin',
    'polkadot': 'polkadot', 'dot': 'polkadot'
};

// Get crypto prices
async function getCryptoPrices(cryptoId) {
    try {
        console.log('Fetching price for:', cryptoId);
        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();
        console.log('Price data:', data);
        
        if (data && data[cryptoId]) {
            return {
                price: data[cryptoId].usd,
                change24h: data[cryptoId].usd_24h_change || 0
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return null;
    }
}

// Get crypto news
async function getCryptoNews(limit = 20) {
    try {
        console.log('Fetching crypto news...');
        const response = await fetch(`${CRYPTO_NEWS_API}?lang=EN&sortOrder=latest`);
        const data = await response.json();
        console.log('News data received:', data.Data?.length, 'articles');
        
        if (data && data.Data) {
            return data.Data.slice(0, limit).map(item => ({
                title: item.title,
                body: item.body,
                url: item.url
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

// Get Fear & Greed
async function getFearGreed() {
    try {
        const response = await fetch(FNG_API);
        const data = await response.json();
        return data?.data?.[0] ? parseInt(data.data[0].value) : 50;
    } catch (error) {
        console.error('Error fetching F&G:', error);
        return 50;
    }
}

// Analyze news sentiment
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

// Analyze price context
function analyzePriceContext(priceData) {
    if (!priceData) return 'neutral';
    const change = priceData.change24h;
    if (change > 3) return 'bullish';
    if (change < -3) return 'bearish';
    return 'neutral';
}

// Analyze community mood
function analyzeCommunityMood(fngValue) {
    if (fngValue >= 60) return 'bullish';
    if (fngValue <= 40) return 'bearish';
    return 'neutral';
}

// Main sentiment calculation
async function calculateSentiment(cryptoName) {
    console.log('Calculating sentiment for:', cryptoName);
    
    const normalizedName = cryptoName.toLowerCase().trim();
    const cryptoId = CRYPTO_IDS[normalizedName] || normalizedName;
    
    console.log('Using crypto ID:', cryptoId);
    
    const [priceData, news, fngValue] = await Promise.all([
        getCryptoPrices(cryptoId),
        getCryptoNews(20),
        getFearGreed()
    ]);
    
    console.log('All data fetched:', { priceData, newsCount: news.length, fngValue });
    
    const newsBias = analyzeNewsBias(news, cryptoName);
    const priceContext = analyzePriceContext(priceData);
    const communityMood = analyzeCommunityMood(fngValue);
    
    console.log('Signals:', { newsBias, priceContext, communityMood });
    
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

// Display results (YOUR HTML STRUCTURE)
function displaySentiment(data) {
    console.log('Displaying sentiment:', data);
    
    // Update asset title (YOUR ID: assetTitle)
    const assetTitle = document.getElementById('assetTitle');
    if (assetTitle) assetTitle.textContent = data.crypto;
    
    // Update overall sentiment (YOUR ID: overallSentiment)
    const overallEl = document.getElementById('overallSentiment');
    if (overallEl) {
        overallEl.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);
        overallEl.className = 'badge ' + data.overall;
    }
    
    // Update individual signals (YOUR IDs: newsSignal, priceSignal, moodSignal)
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
    
    // Update explanations (YOUR ID: sentimentReasons)
    const reasonsList = document.getElementById('sentimentReasons');
    if (reasonsList) {
        reasonsList.innerHTML = data.explanations.map(exp => `<li>${exp}</li>`).join('');
    }
    
    // Show result card (YOUR ID: sentimentResult)
    const resultCard = document.getElementById('sentimentResult');
    if (resultCard) {
        resultCard.classList.remove('hidden');
        console.log('Showing result card');
    }
    
    console.log('✅ Display complete');
}

// Main check function (called by YOUR button: checkSentimentBtn)
async function checkSentiment() {
    console.log('checkSentiment() called');
    
    // Get input value (YOUR ID: assetInput)
    const input = document.getElementById('assetInput');
    const cryptoName = input ? input.value.trim() : '';
    
    console.log('Input value:', cryptoName);
    
    if (!cryptoName) {
        alert('Please enter a cryptocurrency name');
        return;
    }
    
    // Change button text to show loading
    const btn = document.getElementById('checkSentimentBtn');
    const originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Analyzing...';
    
    try {
        const sentiment = await calculateSentiment(cryptoName);
        displaySentiment(sentiment);
    } catch (error) {
        console.error('Error in checkSentiment:', error);
        alert('Error analyzing sentiment. Please try again.');
    } finally {
        if (btn) btn.textContent = originalText;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sentiment analyzer loaded');
    
    // Add click handler to button (YOUR ID: checkSentimentBtn)
    const btn = document.getElementById('checkSentimentBtn');
    if (btn) {
        btn.addEventListener('click', checkSentiment);
        console.log('✅ Button click handler attached');
    } else {
        console.error('❌ Could not find #checkSentimentBtn');
    }
    
    // Add enter key support (YOUR ID: assetInput)
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
    
    // Share buttons
    const shareX = document.getElementById('shareSentimentX');
    if (shareX) {
        shareX.addEventListener('click', function() {
            const assetTitle = document.getElementById('assetTitle');
            const overallSentiment = document.getElementById('overallSentiment');
            const crypto = assetTitle ? assetTitle.textContent : 'Crypto';
            const sentiment = overallSentiment ? overallSentiment.textContent : 'Unknown';
            
            const text = encodeURIComponent(`${crypto} sentiment is ${sentiment}! 📊\n\nCheck crypto sentiment on CoinGyaan 👉`);
            const url = encodeURIComponent('https://coingyaan.com');
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        });
    }
    
    const shareTG = document.getElementById('shareSentimentTG');
    if (shareTG) {
        shareTG.addEventListener('click', function() {
            const assetTitle = document.getElementById('assetTitle');
            const overallSentiment = document.getElementById('overallSentiment');
            const crypto = assetTitle ? assetTitle.textContent : 'Crypto';
            const sentiment = overallSentiment ? overallSentiment.textContent : 'Unknown';
            
            const text = encodeURIComponent(`${crypto} sentiment is ${sentiment}!\n\nCheck on CoinGyaan: https://coingyaan.com`);
            window.open(`https://t.me/share/url?url=https://coingyaan.com&text=${text}`, '_blank');
        });
    }
});

// Expose function globally
window.checkSentiment = checkSentiment;

console.log('sentiment.js loaded');
