// CoinGyaan · Open Interest engine v1
// Sums current OI in USD across venues and reads the 24h change: is money
// entering derivatives or leaving. Venues can change; the read is ours.

import { PARAMS } from "./oi-config.js";

const P = PARAMS;

function fmtUsd(n) {
  if (n == null) return "n/a";
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n);
}

export function computeOpenInterest({ venues, change24hPct, history }) {
  const present = (venues || []).filter((v) => v && Number.isFinite(v.oiUsd) && v.oiUsd > 0);
  if (!present.length) {
    return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-oi-v1", data: null, error: "no open interest data" };
  }
  const oiUsd = present.reduce((s, v) => s + v.oiUsd, 0);
  const chg = Number.isFinite(change24hPct) ? change24hPct : null;

  let activity, activityTone;
  if (chg == null) { activity = "Steady"; activityTone = "neutral"; }
  else if (chg > P.steadyBand) { activity = chg >= P.buildingBand ? "Building" : "Rising"; activityTone = "up"; }
  else if (chg < -P.steadyBand) { activity = chg <= -P.buildingBand ? "Unwinding" : "Falling"; activityTone = "down"; }
  else { activity = "Steady"; activityTone = "neutral"; }

  // recent bars from history (coin OI series), normalised heights 0.25..1
  let bars = [];
  if (Array.isArray(history) && history.length >= 2) {
    const last = history.slice(-P.barCount);
    const min = Math.min.apply(null, last), max = Math.max.apply(null, last);
    const span = max - min || 1;
    bars = last.map((v) => ({ h: +(0.25 + ((v - min) / span) * 0.75).toFixed(3) }));
  }

  let note;
  if (activity === "Building" || activity === "Rising") note = "New capital is entering derivatives. Rising interest often signals a building move.";
  else if (activity === "Unwinding" || activity === "Falling") note = "Open interest is falling. Positions are being closed and leverage is leaving the market.";
  else note = "Open interest is steady. Positioning is holding without a clear build or unwind.";

  let interpretation;
  if (activityTone === "up") interpretation = "Open interest is rising, which means new positions are being opened and fresh money is flowing into perpetual futures. Rising open interest confirms conviction behind the current move, though rising leverage also raises the risk of a sharp move if it reverses.";
  else if (activityTone === "down") interpretation = "Open interest is falling, which means positions are being closed and leverage is leaving the market. Falling open interest often accompanies the end of a move as traders take profit or cut risk.";
  else interpretation = "Open interest is roughly flat. Traders are neither piling in nor stepping out in size, which lines up with a market waiting for a catalyst.";

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-oi-v1",
    data: {
      oiUsd,
      oiUsdDisplay: fmtUsd(oiUsd),
      change24hPct: chg != null ? +chg.toFixed(1) : null,
      changeDisplay: chg == null ? "n/a" : (chg >= 0 ? "+" : "") + chg.toFixed(1) + "%",
      changeTone: chg == null ? "neutral" : chg >= 0 ? "up" : "down",
      activity, activityTone,
      note, interpretation,
      bars,
    },
    venues: present
      .sort((a, b) => b.oiUsd - a.oiUsd)
      .map((v) => ({ name: v.name, oiUsd: Math.round(v.oiUsd), oiUsdDisplay: fmtUsd(v.oiUsd) })),
  };
}
