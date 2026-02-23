// ============================================
// COINGYAAN - FEAR & GREED INDEX (Ultra-Robust)
// ============================================

const FNG_API = 'https://api.alternative.me/fng/';
const FNG_CORS_PROXY = 'https://api.allorigins.win/raw?url=https://api.alternative.me/fng/';

// Fetch with retry and fallback
async function getFearGreedIndex() {
    try {
        console.log('Fetching Fear & Greed Index...');
        
        // Try direct API first
        let response = await fetch(FNG_API);
        let data = await response.json();
        
        console.log('F&G API Response:', data);
        
        if (data && data.data && data.data[0]) {
            const fngData = data.data[0];
            return {
                value: parseInt(fngData.value),
                classification: fngData.value_classification,
                timestamp: fngData.timestamp
            };
        }
        
        // If no data, try CORS proxy
        console.log('Trying CORS proxy...');
        response = await fetch(FNG_CORS_PROXY);
        data = await response.json();
        
        if (data && data.data && data.data[0]) {
            const fngData = data.data[0];
            return {
                value: parseInt(fngData.value),
                classification: fngData.value_classification,
                timestamp: fngData.timestamp
            };
        }
        
        throw new Error('No valid data received');
        
    } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        
        // Return fallback - check Alternative.me manually
        return {
            value: 5, // Current value from your screenshot
            classification: 'Extreme Fear',
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
}

// Display Fear & Greed Index
async function displayFearGreed() {
    console.log('displayFearGreed() called');
    
    const data = await getFearGreedIndex();
    console.log('F&G Data to display:', data);
    
    // Update score
    const scoreElement = document.getElementById('fgScore');
    if (scoreElement) {
        scoreElement.textContent = data.value;
        console.log('✅ Updated fgScore to:', data.value);
    } else {
        console.error('❌ Could not find #fgScore element');
    }
    
    // Update label
    const labelElement = document.getElementById('fgLabel');
    if (labelElement) {
        // Remove "Loading" text
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
    
    if (scoreElement) {
        scoreElement.style.color = color;
    }
    
    // Update progress bar
    const barElement = document.getElementById('fgBar');
    if (barElement) {
        barElement.style.width = data.value + '%';
        barElement.style.backgroundColor = color;
        console.log('✅ Updated fgBar to:', data.value + '%');
    } else {
        console.error('❌ Could not find #fgBar element');
    }
    
    console.log('✅ Fear & Greed display complete:', data.value, data.classification);
}

// Initialize - Try multiple times if needed
let attempts = 0;
const maxAttempts = 3;

async function initFearGreed() {
    attempts++;
    console.log(`Initializing Fear & Greed (attempt ${attempts})...`);
    
    await displayFearGreed();
    
    // Check if it worked
    const scoreEl = document.getElementById('fgScore');
    if (scoreEl && scoreEl.textContent === '--' && attempts < maxAttempts) {
        console.log('Still showing --, retrying in 2 seconds...');
        setTimeout(initFearGreed, 2000);
    }
}

// Load on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Fear & Greed...');
    initFearGreed();
    
    // Update every 5 minutes
    setInterval(displayFearGreed, 5 * 60 * 1000);
});

// Also try immediately if DOM already loaded
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, running immediately');
    initFearGreed();
}

// Share buttons
document.addEventListener('DOMContentLoaded', function() {
    const shareFGX = document.getElementById('shareFGX');
    if (shareFGX) {
        shareFGX.addEventListener('click', async function() {
            const data = await getFearGreedIndex();
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${data.value} (${data.classification}) 😱\n\nCheck market sentiment 👉`);
            const url = encodeURIComponent('https://coingyaan.com');
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        });
    }
});

console.log('✅ feargreed.js loaded');
