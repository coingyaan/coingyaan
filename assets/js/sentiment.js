document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("checkSentimentBtn");
  const input = document.getElementById("assetInput");
  const result = document.getElementById("sentimentResult");

  const assetTitle = document.getElementById("assetTitle");
  const overall = document.getElementById("overallSentiment");
  const news = document.getElementById("newsSignal");
  const price = document.getElementById("priceSignal");
  const mood = document.getElementById("moodSignal");
  const reasons = document.getElementById("sentimentReasons");

  btn.addEventListener("click", () => {
    const asset = input.value.trim();
    if (!asset) return;

    // --- Simple demo logic (v1) ---
    const sentiment = getSentiment(asset);

    assetTitle.innerText = asset;
    overall.innerText = sentiment.overall;
    overall.className = "badge " + sentiment.class;

    news.innerText = sentiment.news;
    news.className = "badge " + sentiment.newsClass;

    price.innerText = sentiment.price;
    price.className = "badge " + sentiment.priceClass;

    mood.innerText = sentiment.mood;
    mood.className = "badge " + sentiment.moodClass;

    reasons.innerHTML = "";
    sentiment.reasons.forEach((r) => {
      const li = document.createElement("li");
      li.innerText = r;
      reasons.appendChild(li);
    });

    result.classList.remove("hidden");

    // Share buttons
    document.getElementById("shareSentimentX").onclick = () =>
      shareOnX(
        `${asset} sentiment on CoinGyaan: ${sentiment.overall}`,
        "https://coingyaan.com"
      );

    document.getElementById("shareSentimentTG").onclick = () =>
      shareOnTelegram(
        `${asset} sentiment on CoinGyaan: ${sentiment.overall}`,
        "https://coingyaan.com"
      );
  });
});

// --- Dummy sentiment logic ---
function getSentiment(asset) {
  const lower = asset.toLowerCase();

  if (lower.includes("bitcoin") || lower.includes("btc")) {
    return {
      overall: "Bullish",
      class: "bullish",
      news: "Bullish",
      newsClass: "bullish",
      price: "Neutral",
      priceClass: "neutral",
      mood: "Neutral",
      moodClass: "neutral",
      reasons: [
        "Recent headlines show positive institutional interest",
        "Price holding key psychological levels",
        "Market discussion remains cautiously optimistic"
      ]
    };
  }

  return {
    overall: "Neutral",
    class: "neutral",
    news: "Neutral",
    newsClass: "neutral",
    price: "Neutral",
    priceClass: "neutral",
    mood: "Neutral",
    moodClass: "neutral",
    reasons: [
      "No strong directional news recently",
      "Price trading in a consolidation range",
      "Community sentiment appears mixed"
    ]
  };
}

