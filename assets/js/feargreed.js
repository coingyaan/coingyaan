// ============================================
// COINGYAAN - FEAR & GREED INDEX (Fixed Version)
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
    
    // Try multiple possible selectors
    const valueSelectors = [
        '#fngValue',
        '#fng-value', 
        '.fng-value',
        '.fg-value',
        '.fear-greed-value',
        '[data-fng-value]'
    ];
    
    const labelSelectors = [
        '#fngLabel',
        '#fng-label',
        '.fng-label', 
        '.fg-label',
        '.fear-greed-label',
        '[data-fng-label]'
    ];
    
    // Find value element
    let valueElement = null;
    for (const selector of valueSelectors) {
        valueElement = document.querySelector(selector);
        if (valueElement) {
            console.log('Found value element with selector:', selector);
            break;
        }
    }
    
    // Find label element
    let labelElement = null;
    for (const selector of labelSelectors) {
        labelElement = document.querySelector(selector);
        if (labelElement) {
            console.log('Found label element with selector:', selector);
            break;
        }
    }
    
    // Update value
    if (valueElement) {
        valueElement.textContent = data.value;
        console.log('Updated value to:', data.value);
    } else {
        console.error('Could not find value element. Add id="fngValue" to your HTML element.');
    }
    
    // Update label
    if (labelElement) {
        labelElement.textContent = data.classification;
        console.log('Updated label to:', data.classification);
    } else {
        console.error('Could not find label element. Add id="fngLabel" to your HTML element.');
    }
    
    // Apply color
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
    updateGauge(data.value);
    
    // Remove "Loading" text
    const loadingElements = document.querySelectorAll('.loading, [data-loading]');
    loadingElements.forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
}

// Update gauge visualization
function updateGauge(value) {
    const gaugeSelectors = [
        '#fngGauge',
        '#fng-gauge',
        '.fng-gauge',
        '.fg-gauge',
        '.fear-greed-gauge',
        '[data-fng-gauge]'
    ];
    
    let gaugeElement = null;
    for (const selector of gaugeSelectors) {
        gaugeElement = document.querySelector(selector);
        if (gaugeElement) break;
    }
    
    if (gaugeElement) {
        // Update CSS custom property
        gaugeElement.style.setProperty('--fng-value', value);
        
        // Or update a child element
        const needle = gaugeElement.querySelector('.needle, .gauge-needle, [data-needle]');
        if (needle) {
            const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees
            needle.style.transform = `rotate(${rotation}deg)`;
        }
        
        // Update progress bar if using that style
        const progressBar = gaugeElement.querySelector('.progress-bar, .gauge-progress, [data-progress]');
        if (progressBar) {
            progressBar.style.width = value + '%';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Fear & Greed...');
    
    // Display immediately
    displayFearGreed();
    
    // Update every 5 minutes
    setInterval(displayFearGreed, 5 * 60 * 1000);
});

// Also try to run immediately in case DOM is already loaded
if (document.readyState === 'loading') {
    // Still loading, wait for DOMContentLoaded
} else {
    // Already loaded, run now
    console.log('DOM already loaded, running immediately');
    displayFearGreed();
}
