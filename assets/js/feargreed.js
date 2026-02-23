// ============================================
// COINGYAAN - FEAR & GREED INDEX (FINAL FIX)
// ============================================

const FEARGREED_API_URL = 'https://api.alternative.me/fng/'; // Renamed to avoid conflict

// Fetch Fear & Greed Index
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
        
        // DON'T return hardcoded fallback - fetch from page if available
        const currentScore = document.getElementById('fgScore');
        if (currentScore && currentScore.textContent !== '--') {
            console.log('ℹ️ Using existing value from page');
            return {
                value: parseInt(currentScore.textContent) || 50,
                classification: document.getElementById('fgLabel')?.textContent || 'Neutral',
                timestamp: Math.floor(Date.now() / 1000)
            };
        }
        
        // Only as last resort, return neutral
        console.warn('⚠️ Returning neutral fallback');
        return {
            value: 50,
            classification: 'Neutral',
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
}

// Display Fear & Greed Index
async function displayFearGreed() {
    console.log('🎨 displayFearGreed() called');
    
    const data = await getFearGreedIndex();
    console.log('📈 F&G Data to display:', data);
    
    // Update score (YOUR ID: fgScore)
    const scoreElement = document.getElementById('fgScore');
    if (scoreElement) {
        scoreElement.textContent = data.value;
        console.log('✅ Updated fgScore to:', data.value);
    } else {
        console.error('❌ Could not find #fgScore element');
        return; // Exit if element not found
    }
    
    // Update label (YOUR ID: fgLabel)
    const labelElement = document.getElementById('fgLabel');
    if (labelElement) {
        labelElement.textContent = data.classification;
        console.log('✅ Updated fgLabel to:', data.classification);
    } else {
        console.error('❌ Could not find #fgLabel element');
    }
    
    // Color map
    const colorMap = {
        'Extreme Fear': '#ef4444',
        'Fear': '#f59e0b',
        'Neutral': '#94a3b8',
        'Greed': '#10b981',
        'Extreme Greed': '#22c55e'
    };
    
    const color = colorMap[data.classification] || '#94a3b8';
    
    // Apply color to score
    if (scoreElement) {
        scoreElement.style.color = color;
    }
    
    // Update progress bar (YOUR ID: fgBar)
    const barElement = document.getElementById('fgBar');
    if (barElement) {
        barElement.style.width = data.value + '%';
        barElement.style.backgroundColor = color;
        console.log('✅ Updated fgBar to:', data.value + '% with color', color);
    } else {
        console.error('❌ Could not find #fgBar element');
    }

    // ============================================
    // UPDATE SVG GAUGE
    // ============================================
    const gaugeArc    = document.getElementById('fgGaugeArc');
    const gaugeNeedle = document.getElementById('fgNeedle');
    const gaugeLabel  = document.getElementById('fgGaugeLabel');

    if (gaugeArc && gaugeNeedle) {
        // Total arc length of the semicircle path (pi * r = pi * 50 ≈ 157)
        const totalLength = 157;
        const filled = (data.value / 100) * totalLength;

        // Animate the arc fill
        gaugeArc.style.stroke = color;
        gaugeArc.setAttribute('stroke-dasharray', `${filled} ${totalLength - filled}`);

        // Needle: -90deg = value 0 (far left), 0deg = value 50, +90deg = value 100
        const angle = (data.value / 100) * 180 - 90;
        gaugeNeedle.style.transform = `rotate(${angle}deg)`;

        // Update gauge label below the dial
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

// Initialize with retry logic
let fgAttempts = 0;
const FG_MAX_ATTEMPTS = 5;

async function initFearGreed() {
    fgAttempts++;
    console.log(`🚀 Initializing Fear & Greed (attempt ${fgAttempts}/${FG_MAX_ATTEMPTS})...`);
    
    await displayFearGreed();
    
    // Check if it worked
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing Fear & Greed...');
    
    // Wait a moment for other scripts to load
    setTimeout(() => {
        initFearGreed();
    }, 500);
    
    // Update every 10 minutes (API updates every 8 hours anyway)
    setInterval(displayFearGreed, 10 * 60 * 1000);
});

// Also try immediately if DOM already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM already loaded, running Fear & Greed immediately');
    setTimeout(initFearGreed, 500);
}

// Share buttons
document.addEventListener('DOMContentLoaded', function() {
    const shareFGX = document.getElementById('shareFGX');
    if (shareFGX) {
        shareFGX.addEventListener('click', async function() {
            const data = await getFearGreedIndex();
            const emoji = data.value < 25 ? '😱' : data.value < 50 ? '😰' : data.value < 75 ? '😊' : '🤑';
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${data.value} (${data.classification}) ${emoji}\n\nCheck live market sentiment 👉`);
            const url = encodeURIComponent('https://coingyaan.com');
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        });
    }
    
    const shareFGTG = document.getElementById('shareFGTG');
    if (shareFGTG) {
        shareFGTG.addEventListener('click', async function() {
            const data = await getFearGreedIndex();
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${data.value} (${data.classification})\n\nCheck on CoinGyaan: https://coingyaan.com`);
            window.open(`https://t.me/share/url?url=https://coingyaan.com&text=${text}`, '_blank');
        });
    }
});

console.log('✅ feargreed.js loaded successfully');
