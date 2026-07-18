// CoinGyaan · Fear and Greed engine v1
// Turns the raw Alternative.me history into the CoinGyaan reading: zone,
// direction of travel, deltas and a contrarian interpretation. The number is
// commodity data; the interpretation is ours.

import { ZONES, PARAMS } from "./fng-config.js";

function classify(v) {
  for (const z of ZONES) if (v <= z.max) return z;
  return ZONES[ZONES.length - 1];
}

export function computeFearGreed(history) {
  // history: array of { t (unix seconds), v (0-100) }, oldest -> newest
  if (!Array.isArray(history) || !history.length) {
    return { asOf: new Date().toISOString(), status: "error", source: "coingyaan-fng-v1", data: null, error: "no data available" };
  }
  const series = history.slice();
  const cur = series[series.length - 1].v;
  const z = classify(cur);

  const back = (n) => {
    const i = series.length - 1 - n;
    return i >= 0 ? series[i].v : null;
  };
  const yesterday = back(1);
  const lastWeek = back(7);
  const lastMonth = back(30);
  const delta1d = yesterday != null ? cur - yesterday : null;
  const delta7d = lastWeek != null ? cur - lastWeek : null;
  const delta30d = lastMonth != null ? cur - lastMonth : null;

  // trend vs a short trailing window average
  const w = series.slice(-1 - PARAMS.trendWindow, -1).map((p) => p.v);
  const avg = w.length ? w.reduce((a, b) => a + b, 0) / w.length : cur;
  let trend, trendTone;
  if (cur - avg > PARAMS.trendFlatBand) { trend = "Rising"; trendTone = "up"; }
  else if (avg - cur > PARAMS.trendFlatBand) { trend = "Falling"; trendTone = "down"; }
  else { trend = "Steady"; trendTone = "neutral"; }

  // short note for the homepage card
  const dirWord = trend === "Rising" ? "climbing" : trend === "Falling" ? "cooling" : "holding";
  const note = `Sentiment is ${z.label.toLowerCase()} and ${dirWord}.`;

  // longer interpretation for the full page
  let interpretation;
  if (z.tone === "down") {
    interpretation = `The market is in ${z.label.toLowerCase()}. Traders are cautious and risk appetite is low. Fear can persist, but deep fear has historically marked areas where downside is already priced in.`;
  } else if (z.tone === "up") {
    interpretation = `The market is in ${z.label.toLowerCase()}. Risk appetite is high and buyers are in control. Greed can run further than expected, but stretched greed often precedes cooling.`;
  } else {
    interpretation = `Sentiment is balanced. Neither fear nor greed dominates, which often lines up with ranging or indecisive price action.`;
  }

  // contrarian lens (CoinGyaan view)
  let contrarian = null;
  if (cur <= PARAMS.contrarianLow) contrarian = "Extreme fear is where contrarians look for value, not where they panic. It is a signal to research, not a signal to buy blindly.";
  else if (cur >= PARAMS.contrarianHigh) contrarian = "Extreme greed is where discipline matters most. It is a moment to manage risk, not to chase.";

  return {
    asOf: new Date().toISOString(),
    status: "ok",
    source: "coingyaan-fng-v1",
    data: {
      value: cur,
      classification: z.label,
      zone: z.zone,
      tone: z.tone,
      scalePct: cur, // 0-100 marker position
      trend, trendTone,
      delta1d, delta7d, delta30d,
      yesterday, lastWeek, lastMonth,
      note, interpretation, contrarian,
    },
    history: series,
  };
}
