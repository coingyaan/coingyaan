/* CoinGyaan · /bitcoin-outlook/ full page hydration.
   Fills the verdict panel, signals table, drivers and live weights from
   /api/bitcoin-outlook. Static editorial below stays regardless. */
(function () {
  "use strict";
  var API = "/api/bitcoin-outlook";
  var toneClass = { up: "st-green", down: "st-red", neutral: "st-amber", info: "st-blue" };
  var leanText = { up: "Bullish", down: "Bearish", neutral: "Neutral" };
  var wLabel = { trend: "Trend", momentum: "Momentum", funding: "Funding", oi: "Open Interest", fng: "Sentiment", etf: "ETF" };

  function q(sel) { return document.querySelector('[data-cg="' + sel + '"]'); }
  function txt(sel, val) { var el = q(sel); if (el && val != null) el.textContent = val; }
  function age(s) { if (s == null) return ""; if (s < 60) return "just now"; return Math.round(s / 60) + "m ago"; }
  function toneOfScore(s) { return s == null ? "neutral" : s > 0.1 ? "up" : s < -0.1 ? "down" : "neutral"; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function fillMeta(sel, val, tone) {
    var el = q(sel); if (!el) return;
    el.textContent = val;
    if (el.classList.contains("st")) el.className = "st " + (toneClass[tone] || "st-amber");
  }

  function apply(p) {
    if (!p || !p.data) { stampError(); return; }
    var d = p.data, t = d.tones || {}, s = p.signals || {}, sc = p.scores || {}, w = p.weights || {};

    var big = q("p-upside"); if (big) big.textContent = d.upsideProbability;
    txt("p-stance", d.stance.charAt(0).toUpperCase() + d.stance.slice(1));
    txt("p-summary", d.summary);
    txt("p-price", "$" + Number(d.price).toLocaleString("en-US"));
    fillMeta("p-direction", d.direction, t.direction);
    fillMeta("p-conf", d.confidenceLabel + " (" + d.confidence + ")", t.confidence);
    fillMeta("p-risk", d.risk, t.risk);
    fillMeta("p-condition", d.condition, t.condition);
    txt("p-momentum", d.momentum);
    txt("p-range", d.expectedRange.display + "  (\u00b1" + d.expectedRange.pct + "%)");

    var bd = q("p-bias-down"), bu = q("p-bias-up");
    if (bd) { bd.style.width = d.bias.downside + "%"; bd.textContent = d.bias.downside + "%"; }
    if (bu) { bu.style.width = d.bias.upside + "%"; bu.textContent = d.bias.upside + "%"; }
    txt("p-legend-down", "Downside " + d.bias.downside + "% \u2193");
    txt("p-legend-up", "\u2191 Upside " + d.bias.upside + "%");

    // signals table
    var rows = [
      ["Trend", sc.trend != null ? (sc.trend > 0 ? "Above moving averages" : sc.trend < 0 ? "Below moving averages" : "Flat") : "n/a", toneOfScore(sc.trend), sc.trend != null],
      ["Momentum (RSI)", s.rsi != null ? "RSI " + s.rsi : "n/a", toneOfScore(sc.momentum), s.rsi != null],
      ["MACD histogram", s.macdHist != null ? s.macdHist : "n/a", s.macdHist > 0 ? "up" : s.macdHist < 0 ? "down" : "neutral", s.macdHist != null],
      ["Funding (8h)", s.funding != null ? (s.funding > 0 ? "+" : "") + s.funding + "%" : "n/a", toneOfScore(sc.funding), s.funding != null],
      ["Open interest (24h)", s.oiChangePct != null ? (s.oiChangePct > 0 ? "+" : "") + s.oiChangePct + "%" : "n/a", toneOfScore(sc.oi), s.oiChangePct != null],
      ["Volatility (daily)", s.volatilityPct != null ? s.volatilityPct + "%" : "n/a", "neutral", s.volatilityPct != null],
      ["Sentiment (Fear and Greed)", s.fearGreed != null ? s.fearGreed : "n/a", toneOfScore(sc.fng), s.fearGreed != null],
      ["BTC dominance", s.dominance != null ? s.dominance + "%" : "n/a", "neutral", s.dominance != null],
    ];
    var tb = q("p-signals");
    if (tb) {
      tb.innerHTML = rows.map(function (r) {
        var lean = r[3] ? '<i class="st ' + toneClass[r[2]] + '">' + (leanText[r[2]] || "Neutral") + "</i>" : '<i class="st st-muted">Not available</i>';
        return "<tr><td>" + esc(r[0]) + '</td><td class="ol-read">' + esc(r[1]) + "</td><td>" + lean + "</td></tr>";
      }).join("");
    }

    // reasons
    var rc = q("p-reasons");
    if (rc) {
      if (d.reasons && d.reasons.length) {
        rc.innerHTML = d.reasons.map(function (x) {
          return '<div class="ol-reason ol-' + (x.tone || "neutral") + '"><span class="ol-rtag">' + esc(x.signal) + "</span><span>" + esc(x.note) + "</span></div>";
        }).join("");
      } else { rc.innerHTML = '<p class="ol-empty">No standout drivers right now. Signals are balanced.</p>'; }
    }

    // weights
    var wc = q("p-weights");
    if (wc) {
      var entries = Object.keys(w).map(function (k) { return [k, w[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      wc.innerHTML = entries.map(function (e) {
        var pct = Math.round(e[1] * 100);
        return '<div class="ol-wrow"><span class="ol-wlabel">' + esc(wLabel[e[0]] || e[0]) + '</span><span class="ol-wbar"><i style="width:' + pct + '%"></i></span><span class="ol-wpct">' + pct + "%</span></div>";
      }).join("");
    }

    var stamp = q("p-stamp");
    if (stamp) {
      var label = p.status === "stale" ? "Delayed" : "Live";
      stamp.innerHTML = '<i class="dot"></i>' + label + " \u00b7 updated " + age(p.ageSeconds);
    }

    renderShort(p);
  }

  function renderShort(p) {
    var host = q("p-short");
    if (!host) return;
    var st = p && p.shortTerm;
    if (!st || !st.frames || !st.frames.length) {
      host.innerHTML = '<div class="ol-empty">Short term signals are not available right now.</div>';
      return;
    }
    var updated = age(p.ageSeconds);
    host.innerHTML = st.frames.map(function (f) {
      if (!f.available) {
        return '<div class="stf-card stf-off">' +
          '<div class="stf-tf">' + esc(f.label) + '</div>' +
          '<div class="stf-dir"><i class="st st-muted">Not available</i></div>' +
          '<div class="stf-int">' + esc(f.interpretation || "") + '</div>' +
          '</div>';
      }
      var cls = toneClass[f.tone] || "st-amber";
      return '<div class="stf-card">' +
        '<div class="stf-tf">' + esc(f.label) + '</div>' +
        '<div class="stf-dir"><i class="st ' + cls + '">' + esc(f.direction) + '</i></div>' +
        '<div class="stf-prob"><span class="stf-up">Upside ' + f.upside + '%</span><span class="stf-dn">Downside ' + f.downside + '%</span></div>' +
        '<div class="stf-bar"><i style="width:' + f.upside + '%"></i></div>' +
        '<div class="stf-conf">Confidence <b>' + esc(f.confidenceLabel) + '</b> (' + f.confidence + ')</div>' +
        '<div class="stf-int">' + esc(f.interpretation) + '</div>' +
        '<div class="stf-upd">Updated ' + updated + '</div>' +
        '</div>';
    }).join("");
  }

  function stampError() {
    var stamp = q("p-stamp");
    if (stamp) stamp.innerHTML = '<i class="dot"></i>Live data unavailable';
  }

  function load() {
    fetch(API, { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); }).then(apply).catch(stampError);
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
  setInterval(load, 300000);
})();
