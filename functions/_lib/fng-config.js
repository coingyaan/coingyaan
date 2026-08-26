// CoinGyaan · Fear and Greed engine config
// Zone thresholds and labels live here, not in the engine, so you can retune
// the bands without touching interpretation logic.

// Zones are checked low to high; the first band the value falls into wins.
// tone drives colour: down = fear (red), neutral = middle (amber), up = greed (green).
export const ZONES = [
  { max: 24, label: "Extreme Fear", zone: "extreme-fear", tone: "down" },
  { max: 44, label: "Fear", zone: "fear", tone: "down" },
  { max: 55, label: "Neutral", zone: "neutral", tone: "neutral" },
  { max: 75, label: "Greed", zone: "greed", tone: "up" },
  { max: 100, label: "Extreme Greed", zone: "extreme-greed", tone: "up" },
];

export const PARAMS = {
  trendWindow: 7, // days used for the rising/falling read
  trendFlatBand: 2, // within +/- this vs the window avg counts as steady
  contrarianLow: 25, // at or below this, contrarian upside note applies
  contrarianHigh: 75, // at or above this, contrarian caution note applies
};

export const REFRESH = {
  historyLimit: 31, // days of history to pull (today + 30)
  ttlSeconds: 1800,
  refetchSeconds: 1740, // fresh window (5 min)
  staleSeconds: 3600, // F and G moves slowly; an hour is fine before forcing sync
  lockSeconds: 90,
  kvKey: "fng:v1",
  lockKey: "fng:lock",
};
