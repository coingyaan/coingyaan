// ============================================
// COINGYAAN - FEAR & GREED INDEX
// ============================================

const FEARGREED_API_URL = 'https://api.alternative.me/fng/';

async function getFearGreedIndex() {
    try {
        console.log('🔄 Fetching Fear & Greed Index...');

        const response = await fetch(FEARGREED_API_URL);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
            return {
                value: parseInt(currentScore.textContent) || 50,
                classification: document.getElementById('fgLabel')?.textContent || 'Neutral',
                timestamp: Math.floor(Date.now() / 1000)
            };
        }

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

    // ── Score ──
    const scoreElement = document.getElementById('fgScore');
    if (scoreElement) {
        scoreElement.textContent = data.value;
    } else {
        console.error('❌ Could not find #fgScore element');
        return;
    }

    // ── Label ──
    const labelElement = document.getElementById('fgLabel');
    if (labelElement) labelElement.textContent = data.classification;

    // ── Color map ──
    const colorMap = {
        'Extreme Fear': '#ef4444',
        'Fear':          '#f97316',
        'Neutral':       '#eab308',
        'Greed':         '#84cc16',
        'Extreme Greed': '#22c55e'
    };
    const color = colorMap[data.classification] || '#94a3b8';

    scoreElement.style.color = color;

    // ── Progress bar ──
    const barElement = document.getElementById('fgBar');
    if (barElement) {
        barElement.style.width           = data.value + '%';
        barElement.style.backgroundColor = color;
    }

    // ── Needle ──
    // Arc goes from left (0) to right (100)
    // -90deg = pointing left (score 0), +90deg = pointing right (score 100)
    const gaugeNeedle = document.getElementById('fgNeedle');
    const gaugeLabel  = document.getElementById('fgGaugeLabel');

    if (gaugeNeedle) {
        const angle = (data.value / 100) * 180 - 90;
        gaugeNeedle.style.transform = `rotate(${angle}deg)`;
        console.log('✅ Needle angle:', angle);
    }

    if (gaugeLabel) {
        gaugeLabel.textContent = data.classification;
        gaugeLabel.style.color = color;
    }

    console.log('🎉 Fear & Greed display complete!');
}

// ── Init with retry ──
let fgAttempts = 0;
const FG_MAX_ATTEMPTS = 5;

async function initFearGreed() {
    fgAttempts++;
    console.log(`🚀 Initializing Fear & Greed (attempt ${fgAttempts}/${FG_MAX_ATTEMPTS})...`);

    await displayFearGreed();

    const scoreEl = document.getElementById('fgScore');
    if (scoreEl) {
        const val = scoreEl.textContent.trim();
        if ((val === '--' || val === '' || val === 'Loading') && fgAttempts < FG_MAX_ATTEMPTS) {
            console.log('⏳ Retrying in 3s...');
            setTimeout(initFearGreed, 3000);
        } else {
            console.log('🎉 Fear & Greed loaded:', val);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initFearGreed, 500);
    setInterval(displayFearGreed, 10 * 60 * 1000);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initFearGreed, 500);
}

// ============================================
// SHARE BUTTONS
// ============================================
document.addEventListener('DOMContentLoaded', function () {

    // ── Share on X ──
    const shareFGX = document.getElementById('shareFGX');
    if (shareFGX) {
        shareFGX.addEventListener('click', function () {
            const valueText = document.getElementById('fgScore')?.textContent.trim();
            const labelText = document.getElementById('fgLabel')?.textContent.trim();

            if (!valueText || valueText === '--' || valueText === 'Loading') {
                alert('Please wait for Fear & Greed to load!');
                return;
            }

            const value = parseInt(valueText);
            const trend = value >= 60 ? 'bullish' : value <= 40 ? 'bearish' : 'neutral';
            const emoji = trend === 'bullish' ? '🤑' : trend === 'bearish' ? '😱' : '😐';

            const shareUrl = `https://coingyaan.com/share?coin=Market&trend=${encodeURIComponent(trend)}&v=2`;
            const text     = encodeURIComponent(`Crypto Fear & Greed Index: ${value} (${labelText}) ${emoji}\n\nCheck live market sentiment 👉`);

            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
        });
        console.log('✅ X share button attached');
    }

    // ── Share on Telegram ──
    const shareFGTG = document.getElementById('shareFGTG');
    if (shareFGTG) {
        shareFGTG.addEventListener('click', function () {
            const valueText = document.getElementById('fgScore')?.textContent.trim();
            const labelText = document.getElementById('fgLabel')?.textContent.trim();

            if (!valueText || valueText === '--' || valueText === 'Loading') {
                alert('Please wait for Fear & Greed to load!');
                return;
            }

            const value = parseInt(valueText);
            const trend = value >= 60 ? 'bullish' : value <= 40 ? 'bearish' : 'neutral';

            const shareUrl = `https://coingyaan.com/share?coin=Market&trend=${encodeURIComponent(trend)}&v=2`;
            const text     = encodeURIComponent(`Crypto Fear & Greed Index: ${value} (${labelText})\n\nCheck on CoinGyaan: https://coingyaan.com`);

            window.open(`https://t.me/share/url?url=${shareUrl}&text=${text}`, '_blank');
        });
        console.log('✅ Telegram share button attached');
    }

});

console.log('✅ feargreed.js loaded successfully');
