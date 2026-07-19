// CoinGyaan · Funding Rate engine v1
// Averages 8 hour funding across venues and reads out the bias, who is paying
// whom, and whether leverage is crowded. Venues can change; the read is ours.

import { PARAMS } from "./funding-config.js";

const P = PARAMS;
const tanh = (x) => { const e = Math.exp(2 * x); return (e - 1) / (e + 1); };
const fmtPct = (frac) => {
  const p = frac * 100;
  const s = Math.abs(p) < 0.1 ? p.toFixed(4) : p.toFixed(3);
  return (p >= 0 ? "+" : "") + s + "%";
};

export function computeFunding(venues) {
  // venues: [{ name, rate8h }] for the sources that responded
  const present = (venues || []).filter((v) => v && Number.isFinite(v.rate8h));
  if (!present.length) {
    return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-funding-v1", data: null, error: "no funding data" };
  }
  const avg = present.reduce((s, v) => s + v.rate8h, 0) / present.length;

  let bias, biasTone, positioning;
  if (avg > P.neutralBand) { bias = "Long"; biasTone = "up"; positioning = "Longs paying shorts"; }
  else if (avg < -P.neutralBand) { bias = "Short"; biasTone = "down"; positioning = "Shorts paying longs"; }
  else { bias = "Neutral"; biasTone = "neutral"; positioning = "Balanced"; }

  let crowding, crowdTone;
  if (avg >= P.crowdedLong) { crowding = "Crowded long"; crowdTone = "down"; }
  else if (avg <= P.crowdedShort) { crowding = "Crowded short"; crowdTone = "up"; }
  else { crowding = "Balanced"; crowdTone = "neutral"; }

  // tilt bar (green = long share, red = short share); positive funding tilts green
  const tilt = tanh(avg * P.splitScale); // -1..1
  const splitLong = Math.max(8, Math.min(92, Math.round(50 + tilt * 50)));
  const splitShort = 100 - splitLong;

  const annualizedPct = +(avg * P.annualFactor * 100).toFixed(2);

  let note;
  if (crowding === "Crowded long") note = "Leverage is crowded long. Overheated funding often precedes volatility.";
  else if (crowding === "Crowded short") note = "Leverage is crowded short. A squeeze higher can follow stretched shorts.";
  else if (bias === "Long") note = "Leverage tilts long but not at extremes.";
  else if (bias === "Short") note = "Leverage tilts short but not at extremes.";
  else note = "Funding is flat. Leverage is balanced between longs and shorts.";

  let interpretation;
  if (bias === "Long") interpretation = `Funding is positive, so longs are paying shorts to hold their positions. That signals bullish leaning leverage. ${crowding === "Crowded long" ? "At these levels the long side looks crowded, which raises the risk of a sharp unwind if price stalls." : "The tilt is moderate, which is healthier than an overcrowded book."}`;
  else if (bias === "Short") interpretation = `Funding is negative, so shorts are paying longs. That signals bearish leaning leverage. ${crowding === "Crowded short" ? "The short side looks crowded, which can set up a squeeze higher if buyers step in." : "The tilt is moderate rather than extreme."}`;
  else interpretation = "Funding is close to flat. Neither side is paying a meaningful premium, which lines up with balanced or indecisive positioning.";

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-funding-v1",
    data: {
      rate: avg,
      ratePct: +(avg * 100).toFixed(4),
      ratePctDisplay: fmtPct(avg),
      annualizedPct,
      bias, biasTone, positioning,
      crowding, crowdTone,
      splitLong, splitShort,
      note, interpretation,
      tone: biasTone,
    },
    venues: present.map((v) => ({ name: v.name, ratePct: +(v.rate8h * 100).toFixed(4), ratePctDisplay: fmtPct(v.rate8h), annualizedPct: +(v.rate8h * P.annualFactor * 100).toFixed(2), tone: v.rate8h > P.neutralBand ? "up" : v.rate8h < -P.neutralBand ? "down" : "neutral" })),
  };
}
