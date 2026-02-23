// ============================================
// COINGYAAN - SENTIMENT ANALYZER (Fixed Version)
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
    
    // Fallback to general sentiment if no specific news
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

// Display results
function displaySentiment(data) {
    console.log('Displaying sentiment:', data);
    
    // Find elements with multiple selectors
    const findElement = (selectors) => {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };
    
    // Update asset name
    const assetEl = findElement(['#assetName', '.asset-name', '[data-asset-name]']);
    if (assetEl) assetEl.textContent = data.crypto;
    
    // Update sentiment badge
    const badgeEl = findElement(['#sentimentBadge', '.sentiment-badge', '[data-sentiment-badge]']);
    if (badgeEl) badgeEl.className = 'sentiment-badge ' + data.overall;
    
    const icons = { bullish: '🟢', bearish: '🔴', neutral: '⚪' };
    
    const iconEl = findElement(['#sentimentIcon', '.sentiment-icon', '[data-sentiment-icon]']);
    if (iconEl) iconEl.textContent = icons[data.overall];
    
    const textEl = findElement(['#sentimentText', '.sentiment-text', '[data-sentiment-text]']);
    if (textEl) textEl.textContent = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);
    
    // Update signals
    updateSignal('news', data.signals.news);
    updateSignal('price', data.signals.price);
    updateSignal('mood', data.signals.mood);
    
    // Update explanations
    const listEl = findElement(['#explanationList', '.explanation-list', '[data-explanation-list]']);
    if (listEl) {
        listEl.innerHTML = data.explanations.map(exp => `<li>${exp}</li>`).join('');
    }
    
    // Show result card
    const resultCard = findElement(['#resultCard', '.result-card', '[data-result-card]']);
    if (resultCard) {
        resultCard.classList.add('active');
        resultCard.style.display = 'block';
    }
    
    console.log('Display complete');
}

// Update signal
function updateSignal(type, sentiment) {
    const icons = { bullish: '🟢', bearish: '🔴', neutral: '⚪' };
    
    const iconEl = document.querySelector(`#${type}Icon, .${type}-icon, [data-${type}-icon]`);
    if (iconEl) iconEl.textContent = icons[sentiment];
    
    const statusEl = document.querySelector(`#${type}Status, .${type}-status, [data-${type}-status]`);
    if (statusEl) {
        statusEl.textContent = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
        statusEl.className = `signal-status ${sentiment}`;
    }
}

// Main analyze function
async function analyzeSentiment() {
    console.log('analyzeSentiment() called');
    
    const inputSelectors = ['#cryptoInput', '.crypto-input', '[data-crypto-input]', 'input[type="text"]'];
    let input = null;
    for (const sel of inputSelectors) {
        input = document.querySelector(sel);
        if (input) break;
    }
    
    const cryptoName = input ? input.value.trim() : '';
    console.log('Input value:', cryptoName);
    
    if (!cryptoName) {
        alert('Please enter a cryptocurrency name');
        return;
    }
    
    // Show loading
    const loading = document.querySelector('#loading, .loading, [data-loading]');
    if (loading) {
        loading.classList.add('active');
        loading.style.display = 'block';
    }
    
    // Hide previous results
    const resultCard = document.querySelector('#resultCard, .result-card, [data-result-card]');
    if (resultCard) {
        resultCard.classList.remove('active');
        resultCard.style.display = 'none';
    }
    
    try {
        const sentiment = await calculateSentiment(cryptoName);
        displaySentiment(sentiment);
    } catch (error) {
        console.error('Error in analyzeSentiment:', error);
        alert('Error analyzing sentiment: ' + error.message);
    } finally {
        if (loading) {
            loading.classList.remove('active');
            loading.style.display = 'none';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sentiment analyzer loaded');
    
    const buttonSelectors = [
        '#analyzeBtn', '#checkBtn', '.analyze-btn', '.check-btn',
        'button[onclick*="analyze"]', '[data-analyze-btn]'
    ];
    
    let analyzeBtn = null;
    for (const sel of buttonSelectors) {
        analyzeBtn = document.querySelector(sel);
        if (analyzeBtn) {
            console.log('Found button with selector:', sel);
            break;
        }
    }
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Button clicked');
            analyzeSentiment();
        });
    } else {
        console.error('Could not find analyze button');
    }
    
    // Enter key support
    const input = document.querySelector('#cryptoInput, .crypto-input, [data-crypto-input]');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                analyzeSentiment();
            }
        });
    }
});

// Expose function globally for onclick handlers
window.analyzeSentiment = analyzeSentiment;
window.checkSentiment = analyzeSentiment; // Alias
