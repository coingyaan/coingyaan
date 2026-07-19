// CoinGyaan · Altcoins engine v1
// Reads BTC dominance and computes the Altcoin Season Index (share of top coins
// beating Bitcoin over the window). Data providers can change; the read is ours.

import { PARAMS } from "./altcoins-config.js";

const P = PARAMS;

export function computeAltcoins({ dominance, btcChange, alts, prevDominance }) {
  const haveSeason = Number.isFinite(btcChange) && Array.isArray(alts) && alts.length >= 10;

  let index = null, outperform = null, total = null, movers = [];
  if (haveSeason) {
    const list = alts.slice(0, P.topN);
    total = list.length;
    outperform = list.filter((a) => Number.isFinite(a.change) && a.change > btcChange).length;
    index = Math.round((outperform / total) * 100);
    movers = list
      .filter((a) => Number.isFinite(a.change))
      .sort((a, b) => b.change - a.change)
      .slice(0, P.moversCount)
      .map((a) => ({ symbol: a.symbol, name: a.name, change: +a.change.toFixed(1) }));
  }

  // season label + card outlook word from the index
  let label, outlook, tone;
  if (index == null) { label = "Unavailable"; outlook = "n/a"; tone = "neutral"; }
  else if (index >= P.seasonHigh) { label = "Altcoin Season"; outlook = "Alt Season"; tone = "up"; }
  else if (index >= P.expandMid) { label = "Alts Expanding"; outlook = "Expanding"; tone = "up"; }
  else if (index >= P.compressLow) { label = "Bitcoin Leaning"; outlook = "Compressing"; tone = "down"; }
  else { label = "Bitcoin Season"; outlook = "BTC Season"; tone = "down"; }

  // dominance trend from the previous stored reading (self-accumulating)
  let domTrend = "Steady", domTrendTone = "neutral";
  if (Number.isFinite(dominance) && Number.isFinite(prevDominance)) {
    const d = dominance - prevDominance;
    if (d > P.domTrendBand) { domTrend = "Rising"; domTrendTone = "down"; } // rising BTC dominance pressures alts
    else if (d < -P.domTrendBand) { domTrend = "Falling"; domTrendTone = "up"; }
  }

  let note;
  if (index == null) note = "Altcoin season data is unavailable right now.";
  else if (tone === "up") note = "Altcoins are broadly outperforming Bitcoin. Money is rotating down the risk curve.";
  else note = "Bitcoin is leading. Most altcoins are lagging BTC over the window.";

  let interpretation;
  if (index == null) interpretation = "The altcoin season reading could not be computed from current data. Bitcoin dominance is still shown above.";
  else interpretation = `Over the last 30 days, ${outperform} of the top ${total} coins outperformed Bitcoin, which puts the Altcoin Season Index at ${index} out of 100. ${index >= P.expandMid ? "That leans toward altcoin strength, where capital rotates from Bitcoin into higher risk assets." : "That leans toward Bitcoin strength, where capital concentrates in Bitcoin and most altcoins lag."} Bitcoin dominance sits at ${Number.isFinite(dominance) ? dominance.toFixed(1) + "%" : "an unavailable level"}.`;

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-altcoins-v1",
    data: {
      dominance: Number.isFinite(dominance) ? +dominance.toFixed(1) : null,
      domTrend, domTrendTone,
      seasonIndex: index,
      seasonLabel: label,
      outlook, tone,
      outperform, total, window: "30 days",
      note, interpretation,
    },
    movers,
  };
}
