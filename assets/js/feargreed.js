// ============================================
// COINGYAAN - FEAR & GREED INDEX
// Matches HTML IDs: fgScore, fgLabel, fgBar
// ============================================

const FNG_API = 'https://api.alternative.me/fng/';

// Fetch Fear & Greed Index
async function getFearGreedIndex() {
    try {
        console.log('Fetching Fear & Greed Index...');
        const response = await fetch(FNG_API);
        const data = await response.json();
        
        console.log('F&G API Response:', data);
        
        if (data && data.data && data.data[0]) {
            const fngData = data.data[0];
            return {
                value: parseInt(fngData.value),
                classification: fngData.value_classification,
                timestamp: fngData.timestamp
            };
        }
    } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        return {
            value: 50,
            classification: 'Neutral',
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
}

// Display Fear & Greed Index
async function displayFearGreed() {
    console.log('displayFearGreed() called');
    
    const data = await getFearGreedIndex();
    console.log('F&G Data to display:', data);
    
    // Update score (YOUR ID: fgScore)
    const scoreElement = document.getElementById('fgScore');
    if (scoreElement) {
        scoreElement.textContent = data.value;
        console.log('Updated fgScore to:', data.value);
    } else {
        console.error('Could not find #fgScore element');
    }
    
    // Update label (YOUR ID: fgLabel)
    const labelElement = document.getElementById('fgLabel');
    if (labelElement) {
        labelElement.textContent = data.classification;
        console.log('Updated fgLabel to:', data.classification);
    } else {
        console.error('Could not find #fgLabel element');
    }
    
    // Apply color based on value
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
    
    // Update progress bar (YOUR ID: fgBar)
    const barElement = document.getElementById('fgBar');
    if (barElement) {
        barElement.style.width = data.value + '%';
        barElement.style.backgroundColor = color;
        console.log('Updated fgBar width to:', data.value + '%');
    } else {
        console.error('Could not find #fgBar element');
    }
    
    console.log('✅ Fear & Greed display complete');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Fear & Greed...');
    
    // Display immediately
    displayFearGreed();
    
    // Update every 5 minutes
    setInterval(displayFearGreed, 5 * 60 * 1000);
});

// Share on X button
document.addEventListener('DOMContentLoaded', function() {
    const shareFGX = document.getElementById('shareFGX');
    if (shareFGX) {
        shareFGX.addEventListener('click', async function() {
            const data = await getFearGreedIndex();
            const text = encodeURIComponent(`Crypto Fear & Greed Index: ${data.value} (${data.classification})\n\nCheck the market sentiment on CoinGyaan 👉`);
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

console.log('feargreed.js loaded');
