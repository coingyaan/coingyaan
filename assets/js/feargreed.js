// ============================================
// COINGYAAN - FEAR & GREED INDEX (Real API)
// ============================================

// API endpoint
const FNG_API = 'https://api.alternative.me/fng/';

// Fetch Fear & Greed Index from API
async function getFearGreedIndex() {
    try {
        const response = await fetch(FNG_API);
        const data = await response.json();
        
        if (data && data.data && data.data[0]) {
            const fngData = data.data[0];
            return {
                value: parseInt(fngData.value),
                classification: fngData.value_classification,
                timestamp: fngData.timestamp,
                previousValue: data.data[1] ? parseInt(data.data[1].value) : null
            };
        }
    } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        // Return neutral fallback if API fails
        return {
            value: 50,
            classification: 'Neutral',
            timestamp: Math.floor(Date.now() / 1000),
            previousValue: null
        };
    }
}

// Display Fear & Greed Index in UI
async function displayFearGreed() {
    const data = await getFearGreedIndex();
    
    // Update value
    const valueElement = document.getElementById('fngValue') || 
                        document.querySelector('.fg-value') ||
                        document.querySelector('.fear-greed-value');
    
    if (valueElement) {
        valueElement.textContent = data.value;
    }
    
    // Update label/classification
    const labelElement = document.getElementById('fngLabel') || 
                        document.querySelector('.fg-label') ||
                        document.querySelector('.fear-greed-label');
    
    if (labelElement) {
        labelElement.textContent = data.classification;
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
    
    if (valueElement) {
        valueElement.style.color = color;
    }
    
    // Update gauge/meter if exists
    const meterElement = document.getElementById('fngMeter') ||
                        document.querySelector('.fg-meter') ||
                        document.querySelector('.fear-greed-meter');
    
    if (meterElement) {
        // Set gauge position (0-100)
        meterElement.style.setProperty('--fng-value', data.value);
        // Or if using a rotation-based gauge:
        const rotation = (data.value / 100) * 180 - 90; // -90 to 90 degrees
        meterElement.style.transform = `rotate(${rotation}deg)`;
    }
    
    console.log('Fear & Greed Index updated:', data.value, '-', data.classification);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Display immediately
    displayFearGreed();
    
    // Update every 5 minutes (API updates every 8 hours, but we check more frequently)
    setInterval(displayFearGreed, 5 * 60 * 1000);
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFearGreedIndex, displayFearGreed };
}
