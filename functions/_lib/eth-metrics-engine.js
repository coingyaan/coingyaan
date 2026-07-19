// CoinGyaan · Ethereum network metrics engine v1
// Gas fee read, Ethereum TVL and its trend, and Ethereum's share of total DeFi
// TVL (DeFi dominance). Providers can change; the read is ours.

import { PARAMS } from "./eth-metrics-config.js";

const P = PARAMS;

function usd(n) {
  if (!Number.isFinite(n)) return "n/a";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e12) return s + "$" + (a / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return s + "$" + (a / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(0) + "M";
  return s + "$" + Math.round(a).toLocaleString("en-US");
}

export function computeEthMetrics({ gasGwei, tvlNow, tvlPrior, ethTvl, totalTvl }) {
  // Gas
  let gas = null, gasLabel = "Unavailable", gasTone = "neutral";
  if (Number.isFinite(gasGwei)) {
    gas = +gasGwei.toFixed(gasGwei < 10 ? 2 : 1);
    if (gasGwei < P.gasLow) { gasLabel = "Low"; gasTone = "up"; }
    else if (gasGwei > P.gasHigh) { gasLabel = "Elevated"; gasTone = "down"; }
    else { gasLabel = "Normal"; gasTone = "neutral"; }
  }

  // TVL and trend
  const tvl = Number.isFinite(tvlNow) ? tvlNow : (Number.isFinite(ethTvl) ? ethTvl : null);
  let tvlTrend = "Flat", tvlTone = "neutral", tvlPct = null;
  if (Number.isFinite(tvlNow) && Number.isFinite(tvlPrior) && tvlPrior > 0) {
    tvlPct = ((tvlNow - tvlPrior) / tvlPrior) * 100;
    if (tvlPct > P.tvlFlatBand) { tvlTrend = "Rising"; tvlTone = "up"; }
    else if (tvlPct < -P.tvlFlatBand) { tvlTrend = "Falling"; tvlTone = "down"; }
  }

  // DeFi dominance: Ethereum share of total DeFi TVL
  let dominance = null;
  if (Number.isFinite(ethTvl) && Number.isFinite(totalTvl) && totalTvl > 0) {
    dominance = +(ethTvl / totalTvl * 100).toFixed(1);
  }

  let note;
  if (gas == null && tvl == null) note = "Ethereum network data is limited right now.";
  else {
    const gp = gasLabel === "Low" ? "Gas is cheap, a good window for on chain activity." : gasLabel === "Elevated" ? "Gas is elevated, the network is busy." : "Gas is in a normal range.";
    const tp = tvlTrend === "Rising" ? "TVL is rising as capital flows into Ethereum DeFi." : tvlTrend === "Falling" ? "TVL is falling as capital leaves Ethereum DeFi." : "TVL is holding steady.";
    note = gp + " " + tp;
  }

  let interpretation;
  if (gas == null && tvl == null) interpretation = "Ethereum network metrics could not be read from current data.";
  else interpretation = `Gas on Ethereum is ${gas != null ? gas + " gwei (" + gasLabel.toLowerCase() + ")" : "unavailable"}. Total value locked in Ethereum DeFi is ${usd(tvl)}${tvlTrend !== "Flat" ? " and " + tvlTrend.toLowerCase() : ""}. Ethereum holds ${dominance != null ? dominance + "%" : "an unavailable share"} of all DeFi TVL, which shows how central it remains to on chain finance.`;

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-eth-metrics-v1",
    data: {
      gasGwei: gas, gasLabel, gasTone,
      tvl: Number.isFinite(tvl) ? Math.round(tvl) : null,
      tvlDisplay: usd(tvl),
      tvlTrend, tvlTone,
      tvlPct: Number.isFinite(tvlPct) ? +tvlPct.toFixed(1) : null,
      defiDominance: dominance,
      defiDominanceDisplay: dominance != null ? dominance + "%" : "n/a",
      note, interpretation,
    },
  };
}
