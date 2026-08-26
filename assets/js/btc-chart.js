/* CoinGyaan · Bitcoin price action chart (/bitcoin-outlook/).
   PRICE ACTION layer only. Renders genuine BTC OHLC from the CoinGyaan primary
   chain (/api/btc-candles) using the vendored TradingView Lightweight Charts
   engine (rendering only, no TradingView data/widgets/branding; attribution logo
   disabled). Selectable 15m | 1h | 4h | 24h with full zoom, pan, pinch, crosshair
   and reset. The panel beside it surfaces the EXISTING CoinGyaan intelligence for
   the selected timeframe, unchanged, with the exact window it refers to. Times are
   canonical UTC internally and formatted for display via CGTime (Local or UTC).
   This describes price action; it is not an entry or exit signal. */
(function () {
  "use strict";
  var CANDLES_API = "/api/btc-candles", OUTLOOK_API = "/api/bitcoin-outlook";
  var GREEN = "#16c784", RED = "#ea3943", GOLD = "#f59e0b", MUTE = "#94a3b8", DIM = "#64748b";
  var TF_INTERVAL = { "15m": "15m", "1h": "1h", "4h": "4h", "24h": "1d" };
  var TF_MS = { "15m": 900000, "1h": 3600000, "4h": 14400000 };
  var state = { tf: "1h", candles: null, outlook: null, chart: null, series: null };
  var tries = 0;

  function q(s) { return document.querySelector('[data-cg="' + s + '"]'); }
  function money(n) { return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 2 }); }
  function age(s) { if (s == null || s < 60) return "just now"; var m = Math.round(s / 60); if (m < 60) return m + "m ago"; var h = Math.round(m / 60); if (h < 24) return h + "h ago"; return Math.round(h / 24) + "d ago"; }
  function dirTone(d) { d = (d || "").toLowerCase(); return d.indexOf("bull") >= 0 ? GREEN : d.indexOf("bear") >= 0 ? RED : GOLD; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function isIntraday() { return state.tf !== "24h"; }

  function boot() {
    if (!q("bc-chart")) return;
    if (!window.LightweightCharts || !window.CGTime) { if (tries++ < 40) return void setTimeout(boot, 100); return; }
    Promise.all([fetchJson(CANDLES_API), fetchJson(OUTLOOK_API)]).then(function (r) {
      state.candles = r[0]; state.outlook = r[1];
      buildChart(); wireSelector(); wireTz(); renderAll();
      setInterval(renderIntel, 20000);
      setInterval(refetch, 60000);
      window.addEventListener("cg-tz-change", onTz);
    });
  }
  function fetchJson(u) { return fetch(u, { headers: { accept: "application/json" } }).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  function refetch() { Promise.all([fetchJson(CANDLES_API), fetchJson(OUTLOOK_API)]).then(function (r) { if (r[0]) state.candles = r[0]; if (r[1]) state.outlook = r[1]; setSeries(); renderIntel(); }); }

  function series() { var c = state.candles; if (!c || !c.tf) return null; var s = c.tf[TF_INTERVAL[state.tf]]; return s && s.candles && s.candles.length ? s.candles : null; }

  function buildChart() {
    var host = q("bc-chart"); if (!host) return;
    var LC = window.LightweightCharts;
    state.chart = LC.createChart(host, {
      autoSize: true,
      layout: { background: { type: "solid", color: "transparent" }, textColor: MUTE, attributionLogo: false, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 },
      grid: { vertLines: { color: "rgba(148,163,184,.07)" }, horzLines: { color: "rgba(148,163,184,.10)" } },
      rightPriceScale: { borderColor: "rgba(148,163,184,.15)" },
      timeScale: { borderColor: "rgba(148,163,184,.15)", timeVisible: true, secondsVisible: false, rightOffset: 4, tickMarkFormatter: function (t) { return window.CGTime.axis(t, isIntraday()); } },
      localization: { timeFormatter: function (t) { return window.CGTime.dateTime(t); }, priceFormatter: function (p) { return money(p); } },
      crosshair: { mode: LC.CrosshairMode.Normal, vertLine: { color: "rgba(148,163,184,.5)", labelBackgroundColor: "#1e293b" }, horzLine: { color: "rgba(148,163,184,.5)", labelBackgroundColor: "#1e293b" } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
    });
    state.series = state.chart.addCandlestickSeries({ upColor: GREEN, downColor: RED, wickUpColor: GREEN, wickDownColor: RED, borderVisible: false, priceLineVisible: true, priceLineStyle: 2, priceLineColor: GOLD, lastValueVisible: true });
    state.chart.subscribeCrosshairMove(onCrosshair);
    host.addEventListener("dblclick", resetView);
  }

  function setSeries() {
    if (!state.series) return;
    var rows = series();
    if (!rows) return;
    var data = rows.map(function (r) { return { time: Math.floor(r[0] / 1000), open: r[1], high: r[2], low: r[3], close: r[4] }; });
    state.series.setData(data);
    // refresh axis formatter for intraday vs daily and jump to latest
    state.chart.applyOptions({ timeScale: { tickMarkFormatter: function (t) { return window.CGTime.axis(t, isIntraday()); } } });
    state.chart.timeScale().fitContent();
  }
  function resetView() { if (state.chart) state.chart.timeScale().fitContent(); }

  function onCrosshair(param) {
    var tip = q("bc-tip"), host = q("bc-chart"); if (!tip || !host) return;
    if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) { tip.hidden = true; return; }
    var d = param.seriesData.get(state.series);
    if (!d) { tip.hidden = true; return; }
    var up = d.close >= d.open, chg = d.open ? ((d.close - d.open) / d.open) * 100 : 0;
    tip.hidden = false;
    tip.innerHTML = '<div class="bc-tip-t">' + window.CGTime.dateTime(param.time) + '</div>' +
      '<div class="bc-tip-r"><span>O</span><b>' + money(d.open) + '</b><span>H</span><b>' + money(d.high) + '</b></div>' +
      '<div class="bc-tip-r"><span>L</span><b>' + money(d.low) + '</b><span>C</span><b>' + money(d.close) + '</b></div>' +
      '<div class="bc-tip-r"><span>Change</span><b style="color:' + (up ? GREEN : RED) + '">' + (chg >= 0 ? "+" : "") + chg.toFixed(2) + '%</b></div>';
    var w = host.clientWidth, tw = tip.offsetWidth || 150, left = param.point.x + 14;
    if (left + tw > w) left = param.point.x - tw - 14;
    tip.style.left = Math.max(4, Math.min(w - tw - 4, left)) + "px";
  }

  function wireSelector() {
    var wrap = q("bc-tabs"); if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var tf = b.getAttribute("data-tf"); if (!tf || tf === state.tf) return;
      state.tf = tf;
      var k = wrap.querySelectorAll("button"); for (var i = 0; i < k.length; i++) k[i].classList.toggle("on", k[i] === b);
      setSeries(); renderIntel();
    });
    var rb = q("bc-reset"); if (rb) rb.addEventListener("click", resetView);
  }

  function wireTz() {
    var wrap = q("bc-tz"); if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      window.CGTime.setMode(b.getAttribute("data-mode"));
    });
    syncTzButtons();
  }
  function syncTzButtons() {
    var wrap = q("bc-tz"); if (!wrap) return;
    var m = window.CGTime.mode(), k = wrap.querySelectorAll("button");
    for (var i = 0; i < k.length; i++) k[i].classList.toggle("on", k[i].getAttribute("data-mode") === m);
  }
  function onTz() {
    syncTzButtons();
    if (state.chart) state.chart.applyOptions({ timeScale: { tickMarkFormatter: function (t) { return window.CGTime.axis(t, isIntraday()); } }, localization: { timeFormatter: function (t) { return window.CGTime.dateTime(t); } } });
    renderIntel();
  }

  function renderAll() { setSeries(); renderIntel(); }

  function renderIntel() {
    var host = q("bc-intel"); if (!host) return;
    var o = state.outlook, tf = state.tf, dir, upside, confLabel, ok = true;
    if (tf === "24h") {
      if (!o || o.upsideProbability == null) ok = false; else { dir = o.direction; upside = o.upsideProbability; confLabel = o.confidenceLabel; }
    } else {
      var fr = o && o.shortTerm && o.shortTerm.frames ? o.shortTerm.frames.filter(function (f) { return f.tf === tf; })[0] : null;
      if (!fr || !fr.available) ok = false; else { dir = fr.direction; upside = fr.upside; confLabel = fr.confidenceLabel; }
    }
    if (!ok) { host.innerHTML = '<div class="bc-intel-note">CoinGyaan intelligence for ' + tf + ' is not available right now.</div>'; return; }
    var updated = o ? age(o.ageSeconds) : "just now";
    var head = '<span class="bc-tf">' + tf + '</span><span class="bc-dot" style="background:' + dirTone(dir) + '"></span>' +
      '<b style="color:' + dirTone(dir) + '">' + esc(dir) + '</b>' +
      '<span class="bc-sep">' + upside + '% upside</span><span class="bc-sep">' + esc(confLabel) + ' confidence</span>';
    var when;
    if (tf === "24h") {
      when = '<span class="bc-asof">As of \u00b7 ' + window.CGTime.stamp(Date.now()) + '</span><span class="bc-hz">Horizon \u00b7 Next 24 hours</span>';
    } else {
      var ms = TF_MS[tf], start = window.CGTime.floorUTC(Date.now(), ms);
      when = '<span class="bc-asof">As of \u00b7 ' + window.CGTime.stamp(start) + '</span><span class="bc-hz">Signal window \u00b7 ' + window.CGTime.window(start, start + ms) + '</span>';
    }
    host.innerHTML = '<div class="bc-intel-line">' + head + '</div>' +
      '<div class="bc-intel-when">' + when + '<span class="bc-upd">Updated ' + updated + '</span></div>' +
      '<div class="bc-intel-note">The chart shows what Bitcoin is doing. This is how the CoinGyaan model reads that price action for the ' + tf + ' timeframe. It is not an entry or exit signal.</div>';
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
