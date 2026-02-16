document.addEventListener("DOMContentLoaded", () => {
  // Demo value for v1
  const score = 62;

  const scoreEl = document.getElementById("fgScore");
  const labelEl = document.getElementById("fgLabel");
  const barEl = document.getElementById("fgBar");

  scoreEl.innerText = score;

  let label = "Neutral";
  if (score >= 60) label = "Greed";
  if (score <= 40) label = "Fear";

  labelEl.innerText = label;
  barEl.style.width = score + "%";

  // Share buttons
  document.getElementById("shareFGX").onclick = () =>
    shareOnX(
      `Crypto Fear & Greed Index today: ${score} (${label})`,
      "https://coingyaan.com"
    );

  document.getElementById("shareFGTG").onclick = () =>
    shareOnTelegram(
      `Crypto Fear & Greed Index today: ${score} (${label})`,
      "https://coingyaan.com"
    );
});

