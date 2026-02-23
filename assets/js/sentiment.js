// ============================================
// COINGYAAN - SENTIMENT ANALYZER (Real APIs)
// ============================================

// API Configuration
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CRYPTO_NEWS_API = 'https://min-api.cryptocompare.com/data/v2/news/';
const FNG_API = 'https://api.alternative.me/fng/';

// Crypto ID mapping for CoinGecko
const CRYPTO_IDS = {
    'bitcoin': 'bitcoin',
    'btc': 'bitcoin',
    'ethereum': 'ethereum',
    'eth': 'ethereum',
    'solana': 'solana',
    'sol': 'solana',
    'bnb': 'binancecoin',
    'binance': 'binancecoin',
    'cardano': 'cardano',
    'ada': 'cardano',
    'ripple': 'ripple',
    'xrp': 'ripple',
    'dogecoin': 'dogecoin',
    'doge': 'dogecoin',
    'polkadot': 'polkadot',
    'dot': 'polkadot'
};

// Get crypto prices
async function getCryptoPrices(cryptoId) {
    try {
        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();
        
        if (data && data[cryptoId]) {
            return {
                price: data[cryptoId].usd,
                change24h: data[cryptoId].usd_24h_change || 0
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        return null;
    }
}

// Get crypto news
async function getCryptoNews(limit = 20) {
    try {
        const response = await fetch(`${CRYPTO_NEWS_API}?lang=EN&sortOrder=latest`);
        const data = await response.json();
        
        if (data && data.Data) {
            return data.Data.slice(0, limit).map(item => ({
                title: item.title,
                body: item.body,
                url: item.url,
                source: item.source,
                published: new Date(item.published_on * 1000)
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching crypto news:', error);
        return [];
    }
}

// Get Fear & Greed Index
async function getFearGreed() {
    try {
        const response = await fetch(FNG_API);
        const data = await response.json();
        return data && data.data && data.data[0] ? parseInt(data.data[0].value) : 50;
    } catch (error) {
        console.error('Error fetching Fear & Greed:', error);
        return 50;
    }
}

// Analyze news sentiment
function analyzeNewsBias(news, cryptoName) {
    const positiveKeywords = [
        'surge', 'rally', 'bullish', 'gains', 'up', 'rise', 'soar',
        'adoption', 'partnership', 'upgrade', 'milestone', 'breakthrough',
        'institutional', 'approval', 'record', 'high', 'moon', 'pump',
        'positive', 'growth', 'increase', 'boost', 'profit'
    ];
    
    const negativeKeywords = [
        'crash', 'plunge', 'bearish', 'falls', 'down', 'drop', 'dump',
        'hack', 'scam', 'sec', 'regulation', 'ban', 'lawsuit', 'fraud',
        'concerns', 'warning', 'risk', 'selloff', 'decline', 'slump',
        'negative', 'loss', 'decrease', 'threat', 'damage'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    let relevantNews = 0;
    
    const searchTerms = [cryptoName.toLowerCase(), 'btc', 'eth', 'sol', 'bnb'];
    
    news.forEach(article => {
        const text = (article.title + ' ' + article.body).toLowerCase();
        
        // Check if article is relevant
        const isRelevant = searchTerms.some(term => text.includes(term));
        
        if (isRelevant) {
            relevantNews++;
            
            positiveKeywords.forEach(word => {
                if (text.includes(word)) positiveScore++;
            });
            
            negativeKeywords.forEach(word => {
                if (text.includes(word)) negativeScore++;
            });
        }
    });
    
    // If no relevant news, use general market sentiment
    if (relevantNews === 0) {
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
    
    const threshold = 2;
    if (positiveScore > negativeScore + threshold) return 'bullish';
    if (negativeScore > positiveScore + threshold) return 'bearish';
    return 'neutral';
}

// Analyze price context
function analyzePriceContext(priceData) {
    if (!priceData || !priceData.change24h) return 'neutral';
    
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
    // Normalize crypto name
    const normalizedName = cryptoName.toLowerCase().trim();
    const cryptoId = CRYPTO_IDS[normalizedName] || normalizedName;
    
    // Fetch all data in parallel
    const [priceData, news, fngValue] = await Promise.all([
        getCryptoPrices(cryptoId),
        getCryptoNews(20),
        getFearGreed()
    ]);
    
    // Calculate individual signals
    const newsBias = analyzeNewsBias(news, cryptoName);
    const priceContext = analyzePriceContext(priceData);
    const communityMood = analyzeCommunityMood(fngValue);
    
    // Determine overall sentiment
    const signals = [newsBias, priceContext, communityMood];
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;
    
    let overall = 'neutral';
    if (bullishCount >= 2) overall = 'bullish';
    else if (bearishCount >= 2) overall = 'bearish';
    
    // Generate explanations
    const explanations = [];
    
    // News explanation
    if (newsBias === 'bullish') {
        explanations.push(`Recent news coverage shows predominantly positive sentiment for ${cryptoName}`);
    } else if (newsBias === 'bearish') {
        explanations.push(`News sentiment indicates concerns around ${cryptoName} developments`);
    } else {
        explanations.push(`News coverage for ${cryptoName} appears balanced with mixed signals`);
    }
    
    // Price explanation
    if (priceData) {
        const change = priceData.change24h.toFixed(2);
        const sign = change >= 0 ? '+' : '';
        if (priceContext === 'bullish') {
            explanations.push(`Price shows upward momentum with ${sign}${change}% gain in the last 24 hours`);
        } else if (priceContext === 'bearish') {
            explanations.push(`Price is down ${change}% over the last 24 hours showing selling pressure`);
        } else {
            explanations.push(`Price movement is relatively stable at ${sign}${change}% change over 24 hours`);
        }
    }
    
    // Community mood explanation
    if (communityMood === 'bullish') {
        explanations.push(`Market-wide sentiment (Fear & Greed: ${fngValue}) reflects optimism`);
    } else if (communityMood === 'bearish') {
        explanations.push(`Market-wide sentiment (Fear & Greed: ${fngValue}) shows caution and fear`);
    } else {
        explanations.push(`Overall market sentiment (Fear & Greed: ${fngValue}) remains neutral`);
    }
    
    return {
        crypto: cryptoName,
        overall: overall,
        signals: {
            news: newsBias,
            price: priceContext,
            mood: communityMood
        },
        explanations: explanations,
        data: {
            price: priceData ? priceData.price : null,
            change24h: priceData ? priceData.change24h : null,
            fng: fngValue
        },
        timestamp: new Date()
    };
}

// Display sentiment results in UI
function displaySentiment(sentimentData) {
    // Update asset name
    const assetEl = document.getElementById('assetName') || document.querySelector('.asset-name');
    if (assetEl) assetEl.textContent = sentimentData.crypto;
    
    // Update overall sentiment badge
    const badgeEl = document.getElementById('sentimentBadge') || document.querySelector('.sentiment-badge');
    if (badgeEl) {
        badgeEl.className = 'sentiment-badge ' + sentimentData.overall;
    }
    
    const icons = { bullish: '🟢', bearish: '🔴', neutral: '⚪' };
    
    // Update sentiment icon
    const iconEl = document.getElementById('sentimentIcon') || document.querySelector('.sentiment-icon');
    if (iconEl) iconEl.textContent = icons[sentimentData.overall];
    
    // Update sentiment text
    const textEl = document.getElementById('sentimentText') || document.querySelector('.sentiment-text');
    if (textEl) {
        textEl.textContent = sentimentData.overall.charAt(0).toUpperCase() + sentimentData.overall.slice(1);
    }
    
    // Update individual signals
    updateSignal('news', sentimentData.signals.news);
    updateSignal('price', sentimentData.signals.price);
    updateSignal('mood', sentimentData.signals.mood);
    
    // Update explanations
    const listEl = document.getElementById('explanationList') || document.querySelector('.explanation-list');
    if (listEl) {
        listEl.innerHTML = sentimentData.explanations.map(exp => `<li>${exp}</li>`).join('');
    }
    
    // Show results card
    const resultCard = document.getElementById('resultCard') || document.querySelector('.result-card');
    if (resultCard) {
        resultCard.classList.add('active');
        resultCard.style.display = 'block';
    }
}

// Update individual signal display
function updateSignal(type, sentiment) {
    const icons = { bullish: '🟢', bearish: '🔴', neutral: '⚪' };
    
    const iconEl = document.getElementById(type + 'Icon') || document.querySelector(`.${type}-icon`);
    if (iconEl) iconEl.textContent = icons[sentiment];
    
    const statusEl = document.getElementById(type + 'Status') || document.querySelector(`.${type}-status`);
    if (statusEl) {
        statusEl.textContent = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
        statusEl.className = `signal-status ${sentiment}`;
    }
}

// Main analyze function (called from button)
async function analyzeSentiment() {
    const input = document.getElementById('cryptoInput') || document.querySelector('.crypto-input');
    const cryptoName = input ? input.value.trim() : '';
    
    if (!cryptoName) {
        alert('Please enter a cryptocurrency name');
        return;
    }
    
    // Show loading
    const loading = document.getElementById('loading') || document.querySelector('.loading');
    if (loading) {
        loading.classList.add('active');
        loading.style.display = 'block';
    }
    
    // Hide previous results
    const resultCard = document.getElementById('resultCard') || document.querySelector('.result-card');
    if (resultCard) {
        resultCard.classList.remove('active');
    }
    
    try {
        const sentiment = await calculateSentiment(cryptoName);
        displaySentiment(sentiment);
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        alert('Error analyzing sentiment. Please try again.');
    } finally {
        if (loading) {
            loading.classList.remove('active');
            loading.style.display = 'none';
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add click handler to analyze button
    const analyzeBtn = document.getElementById('analyzeBtn') || 
                      document.getElementById('checkBtn') ||
                      document.querySelector('.analyze-btn') ||
                      document.querySelector('.check-btn');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeSentiment);
    }
    
    // Add enter key support
    const input = document.getElementById('cryptoInput') || document.querySelector('.crypto-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeSentiment();
            }
        });
    }
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateSentiment, analyzeSentiment, displaySentiment };
}
