// CoinGyaan · Stablecoins engine v1
// Reads total stablecoin supply trend, net mint/burn over the window, the
// dominance split among stablecoins, and a liquidity outlook interpretation.

import { PARAMS } from "./stablecoins-config.js";

const P = PARAMS;

function usd(n) {
  if (!Number.isFinite(n)) return "n/a";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e12) return s + "$" + (a / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return s + "$" + (a / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(0) + "M";
  return s + "$" + Math.round(a).toLocaleString("en-US");
}
function signedUsd(n) {
  if (!Number.isFinite(n)) return "n/a";
  return (n >= 0 ? "+" : "") + usd(n);
}

export function computeStablecoins({ history, assets }) {
  // history: [{ ts, totalUsd }] ascending. assets: [{ symbol, name, circulating }]
  const series = Array.isArray(history) ? history.filter((h) => Number.isFinite(h.totalUsd)) : [];
  const haveHist = series.length >= 2;

  let total = null, prior = null, netFlow = null, pctChange = null;
  if (haveHist) {
    total = series[series.length - 1].totalUsd;
    const idx = Math.max(0, series.length - 1 - P.windowDays);
    prior = series[idx].totalUsd;
    netFlow = total - prior;
    pctChange = prior ? (netFlow / prior) * 100 : null;
  }
  // fallback total from the asset list if history missing
  const assetList = Array.isArray(assets) ? assets.filter((a) => Number.isFinite(a.circulating)) : [];
  const assetTotal = assetList.reduce((s, a) => s + a.circulating, 0);
  if (total == null && assetTotal > 0) total = assetTotal;

  // supply trend
  let supplyTrend = "Flat", trendTone = "neutral";
  if (Number.isFinite(pctChange)) {
    if (pctChange > P.expandBand) { supplyTrend = "Expanding"; trendTone = "up"; }
    else if (pctChange < -P.expandBand) { supplyTrend = "Contracting"; trendTone = "down"; }
  }

  // dominance: leading stablecoin share of the total
  let leader = null, leaderShare = null, breakdown = [];
  if (assetList.length && assetTotal > 0) {
    const sorted = assetList.slice().sort((a, b) => b.circulating - a.circulating);
    leader = sorted[0].symbol;
    leaderShare = +(sorted[0].circulating / assetTotal * 100).toFixed(1);
    breakdown = sorted.slice(0, P.topN).map((a) => ({
      symbol: a.symbol, name: a.name,
      circulating: a.circulating, circulatingDisplay: usd(a.circulating),
      share: +(a.circulating / assetTotal * 100).toFixed(1),
    }));
  }

  // liquidity outlook: interpretation from supply direction and net flow
  let outlook = "Neutral", outlookTone = "neutral";
  if (trendTone === "up") { outlook = "Bullish"; outlookTone = "up"; }
  else if (trendTone === "down") { outlook = "Bearish"; outlookTone = "down"; }

  let note;
  if (!haveHist) note = "Stablecoin supply data is limited right now.";
  else if (outlookTone === "up") note = "Stablecoin supply is expanding. Fresh dollars are entering crypto, which is supportive for liquidity.";
  else if (outlookTone === "down") note = "Stablecoin supply is contracting. Dollars are leaving crypto, which pressures liquidity.";
  else note = "Stablecoin supply is broadly flat. Liquidity is holding without a clear inflow or outflow.";

  let interpretation;
  if (!haveHist) interpretation = "Total stablecoin supply is shown above. Trend data over the window is limited at the moment.";
  else interpretation = `Total stablecoin supply stands at ${usd(total)}. Over the last ${P.windowLabel} it has ${supplyTrend.toLowerCase() === "flat" ? "held roughly flat" : supplyTrend.toLowerCase()} with a net ${netFlow >= 0 ? "mint" : "burn"} of ${signedUsd(netFlow)}. ${outlookTone === "up" ? "Expanding stablecoin supply usually means new capital is entering the market, which is supportive for prices." : outlookTone === "down" ? "Contracting supply usually means capital is leaving, which can pressure prices." : "Flat supply points to balanced liquidity."}${leader ? ` ${leader} leads with ${leaderShare}% of stablecoin supply.` : ""}`;

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-stablecoins-v1",
    data: {
      total: Number.isFinite(total) ? total : null,
      totalDisplay: usd(total),
      supplyTrend, trendTone,
      netFlow: Number.isFinite(netFlow) ? Math.round(netFlow) : null,
      netFlowDisplay: signedUsd(netFlow),
      pctChange: Number.isFinite(pctChange) ? +pctChange.toFixed(2) : null,
      leader, leaderShare,
      leaderDisplay: leader ? leader + " " + (leaderShare != null ? leaderShare + "%" : "") : "n/a",
      outlook, outlookTone,
      window: P.windowLabel,
      note, interpretation,
    },
    breakdown,
  };
}
