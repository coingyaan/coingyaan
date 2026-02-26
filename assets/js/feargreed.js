// ============================================
// COINGYAAN - FEAR & GREED INDEX (FINAL - WITH CACHE BUSTING)
// ============================================

const FEARGREED_API_URL = 'https://api.alternative.me/fng/';

async function getFearGreedIndex() {
    try {
        console.log('🔄 Fetching Fear & Greed Index...');
        
        const response = await fetch(FEARGREED_API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 F&G API Response:', data);
        
        if (data && data.data && data.data[0]) {
            const fngData = data.data[0];
            const result = {
                value: parseInt(fngData.value),
                classification: fngData.value_classification,
                timestamp: fngData.timestamp
            };
            console.log('✅ Successfully parsed F&G data:', result);
            return result;
        }
        
        throw new Error('Invalid data structure');
        
    } catch (error) {
        console.error('❌ Error fetching Fear & Greed Index:', error);
        
        const currentScore = document.getElementById('fgScore');
        if (currentScore && currentScore.textContent !== '--') {
            console.log('ℹ️ Using existing value from page');
            return {
                value: parseInt(currentScore.textContent) || 50,
                classification: document.getElementById('fgLabel')?.textContent || 'Neutral',
                timestamp: Math.floor(Date.now() / 1000)
            };
        }
        
        console.warn('⚠️ Returning neutral fallback');
        return {
            value: 50,
            classification: 'Neutral',
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
}

async function displayFearGreed() {
    console.log('🎨 displayFearGreed() called');
    
    const data = await getFearGreedIndex();
    console.log('📈 F&G Data to display:', data);
    
    const scoreElement = document.getElementById('fgScore');
    if (scoreElement) {
        scoreElement.textContent = data.value;
        console.log('✅ Updated fgScore to:', data.value);
    } else {
        console.error('❌ Could not find #fgScore element');
        return;
    }
    
    const labelElement = document.getElementById('fgLabel');
    if (labelElement) {
        labelElement.textContent = data.classification;
        console.log('✅ Updated fgLabel to:', data.classification);
    } else {
        console.error('❌ Could not find #fgLabel element');
    }
    
    const colorMap = {
        'Extreme Fear': '#ef4444',
        'Fear': '#f59e0b',
        'Neutral': '#94a3b8',
        'Greed': '#10b981',
        'Extreme Greed': '#22c55e'
    };
    
    const color = colorMap[data.classification] || '#94a3b8';
    
    if (scoreElement) {
        scoreElement.style.color = color;
    }
    
    const barElement = document.getElementById('fgBar');
    if (barElement) {
        barElement.style.width = data.value + '%';
        barElement.style.backgroundColor = color;
        console.log('✅ Updated fgBar to:', data.value + '% with color', color);
    } else {
        console.error('❌ Could not find #fgBar element');
    }

    const gaugeArc = document.getElementById('fgGaugeArc');
    const gaugeNeedle = document.getElementById('fgNeedle');
    const gaugeLabel = document.getElementById('fgGaugeLabel');

    if (gaugeArc && gaugeNeedle) {
        const totalLength = 157;
        const filled = (data.value / 100) * totalLength;

        gaugeArc.style.stroke = color;
        gaugeArc.setAttribute('stroke-dasharray', `${filled} ${totalLength - filled}`);

        const angle = (data.value / 100) * 180 - 90;
        gaugeNeedle.style.transform = `rotate(${angle}deg)`;

        if (gaugeLabel) {
            gaugeLabel.textContent = data.classification;
            gaugeLabel.style.color = color;
        }

        console.log('✅ Updated SVG gauge to:', data.value, '| angle:', angle, '| color:', color);
    } else {
        console.warn('⚠️ SVG gauge elements not found — skipping gauge update');
    }
    
    console.log('🎉 Fear & Greed display complete!');
}

let fgAttempts = 0;
const FG_MAX_ATTEMPTS = 5;

async function initFearGreed() {
    fgAttempts++;
    console.log(`🚀 Initializing Fear & Greed (attempt ${fgAttempts}/${FG_MAX_ATTEMPTS})...`);
    
    await displayFearGreed();
    
    const scoreEl = document.getElementById('fgScore');
    if (scoreEl) {
        const currentValue = scoreEl.textContent.trim();
        console.log('Current fgScore value:', currentValue);
        
        if ((currentValue === '--' || currentValue === '' || currentValue === 'Loading') && fgAttempts < FG_MAX_ATTEMPTS) {
            console.log('⏳ Still not loaded, retrying in 3 seconds...');
            setTimeout(initFearGreed, 3000);
        } else if (currentValue !== '--' && currentValue !== '' && currentValue !== 'Loading') {
            console.log('🎉 Fear & Greed successfully loaded with value:', currentValue);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing Fear & Greed...');
    
    setTimeout(() => {
        initFearGreed();
    }, 500);
    
    setInterval(displayFearGreed, 10 * 60 * 1000);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM already loaded, running Fear & Greed immediately');
    setTimeout(initFearGreed, 500);
}

// ============================================
// SHARE BUTTONS (WITH CACHE BUSTING v=2)
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const shareFGX = document.getElementById('shareFGX');
    if (shareFGX) {
        shareFGX.addEventListener('click', async function() {
            const scoreElement = document.getElementById('fgScore');
            const labelElement = document.getElementById('fgLabel');
            
            if (!scoreElement || !labelElement) {
                console.error('❌ Could not find F&G elements');
                alert('Please wait for Fear & Greed to load!');
                return;
            }
            
            const valueText = scoreElement.textContent.trim();
            const labelText = labelElement.textContent.trim();
            
            if (valueText === '--' || valueText === '' || valueText === 'Loading') {
                alert('Please wait for Fear & Greed to load!');
                return;
            }
            
            const value = parseInt(valueText);
            
            // Determine trend based on value
            let trend = 'neutral';
            if (value >= 60) {
                trend = 'bullish';
            } else if (value <= 40) {
                trend = 'bearish';
            }
            
            console.log('🐦 Sharing Fear & Greed:', value, '|', labelText, '| Trend:', trend);
            
            // ADD v=2 for cache busting!
            const shareUrl = `https://coingyaan.com/share?coin=Market&trend=${encodeURIComponent(trend)}&v=2`;
            
            // Tweet text
            const emoji = trend === 'bullish' ? '🤑' : trend === 'bearish' ? '😱' : '😐';
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${value} (${labelText}) ${emoji}\n\nCheck live market sentiment 👉`);
            
            console.log('📤 Share URL:', shareUrl);
            
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
        });
        console.log('✅ X share button attached');
    }
    
    const shareFGTG = document.getElementById('shareFGTG');
    if (shareFGTG) {
        shareFGTG.addEventListener('click', async function() {
            const scoreElement = document.getElementById('fgScore');
            const labelElement = document.getElementById('fgLabel');
            
            if (!scoreElement || !labelElement) {
                alert('Please wait for Fear & Greed to load!');
                return;
            }
            
            const valueText = scoreElement.textContent.trim();
            const labelText = labelElement.textContent.trim();
            
            if (valueText === '--' || valueText === '' || valueText === 'Loading') {
                alert('Please wait for Fear & Greed to load!');
                return;
            }
            
            const value = parseInt(valueText);
            
            let trend = 'neutral';
            if (value >= 60) {
                trend = 'bullish';
            } else if (value <= 40) {
                trend = 'bearish';
            }
            
            // ADD v=2 for cache busting!
            const shareUrl = `https://coingyaan.com/share?coin=Market&trend=${encodeURIComponent(trend)}&v=2`;
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${value} (${labelText})\n\nCheck on CoinGyaan: https://coingyaan.com`);
            
            window.open(`https://t.me/share/url?url=${shareUrl}&text=${text}`, '_blank');
        });
        console.log('✅ Telegram share button attached');
    }
});

console.log('✅ feargreed.js loaded successfully');
