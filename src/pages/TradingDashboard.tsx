import React, { useEffect, useMemo, useRef, useState } from "react";

// TradingView Widget Component
function TradingViewWidget({ symbol, interval }: { symbol: string; interval: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "de",
      enable_publishing: false,
      withdateranges: true,
      range: "1D",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      details: true,
      hotlist: true,
      calendar: true,
      container_id: "tradingview_chart"
    });

    container.current.innerHTML = "";
    container.current.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container" style={{ height: "440px", width: "100%" }}>
      <div 
        ref={container} 
        id="tradingview_chart" 
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "lucide-react";
import { PrecisionGate } from "@/components/PrecisionGate";
import { VolumeProfile } from "@/components/VolumeProfile";
import { MarketStructure } from "@/components/MarketStructure";
import { OrderFlow } from "@/components/OrderFlow";
import { RiskManagement } from "@/components/RiskManagement";
import { PatternRecognition } from "@/components/PatternRecognition";
import { TradeJournal } from "@/components/TradeJournal";
import { StrategyBacktest } from "@/components/StrategyBacktest";
import { MultiTimeframeAnalysis } from "@/components/MultiTimeframeAnalysis";
import { TradingGuide } from "@/components/TradingGuide";
import { SignalAggregation } from "@/components/SignalAggregation";

// --- Types
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
interface Signal { time: number; type: "BUY" | "SELL"; rule: string; price: number; adx?: number; atr?: number; score?: number }
interface DepthUpdate { bids: [string, string][], asks: [string, string][] }
interface FVG { type: "BULL" | "BEAR"; start: number; end: number; top: number; bottom: number; filled: boolean }
interface TrendLine { type: "RESISTANCE" | "SUPPORT"; points: Array<{time: number; price: number}>; slope: number }

// --- Helpers: math & indicators
const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

function ema(values: number[], period: number): number[] {
  if(!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for(let i=1;i<values.length;i++){ prev = values[i]*k + prev*(1-k); out.push(prev); }
  return out;
}

function rsi(values: number[], period = 14): number[] {
  if (values.length === 0) return [];
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgG = ema(gains, period);
  const avgL = ema(losses, period);
  return avgG.map((g, i) => {
    const l = avgL[i] || 1e-8;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  });
}

function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = emaFast.map((v, i) => v - (emaSlow[i] ?? v));
  const signalLine = ema(macdLine, signal);
  const hist = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
  return { macdLine, signalLine, hist };
}

function atr(candles: Candle[], period = 14): number[] {
  if(!candles.length) return [];
  const trs: number[] = [];
  for(let i=0;i<candles.length;i++){
    const c = candles[i];
    if(i===0){ trs.push(c.h - c.l); continue; }
    const prev = candles[i-1];
    const tr = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
    trs.push(tr);
  }
  const k = 1/period;
  const out: number[] = [];
  let prev = trs[0]; out.push(prev);
  for(let i=1;i<trs.length;i++){ prev = trs[i]*k + prev*(1-k); out.push(prev); }
  return out;
}

function donchian(candles: Candle[], period = 20){
  const hi: number[] = [], lo: number[] = [], mid: number[] = [];
  for(let i=0;i<candles.length;i++){
    const from = Math.max(0, i-period+1);
    let h=-Infinity,l=Infinity;
    for(let j=from;j<=i;j++){ h=Math.max(h,candles[j].h); l=Math.min(l,candles[j].l); }
    hi.push(h); lo.push(l); mid.push((h+l)/2);
  }
  return { hi, lo, mid };
}

function adx(candles: Candle[], period = 14){
  const len = candles.length; if(len<2) return { adx: [], pdi: [], mdi: [] };
  const tr: number[] = [0];
  const pdm: number[] = [0];
  const mdm: number[] = [0];
  for(let i=1;i<len;i++){
    const h = candles[i].h, l = candles[i].l, pc = candles[i-1].c;
    const upMove = h - candles[i-1].h;
    const downMove = candles[i-1].l - l;
    pdm.push(upMove>downMove && upMove>0 ? upMove : 0);
    mdm.push(downMove>upMove && downMove>0 ? downMove : 0);
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const k = 1/period;
  function smooth(arr: number[]){
    const out:number[]=[]; let prev=arr[0]; out.push(prev);
    for(let i=1;i<arr.length;i++){ prev = arr[i]*k + prev*(1-k); out.push(prev); }
    return out;
  }
  const trS = smooth(tr), pdmS = smooth(pdm), mdmS = smooth(mdm);
  const pdi = pdmS.map((v,i)=> 100 * (trS[i] ? v/trS[i] : 0));
  const mdi = mdmS.map((v,i)=> 100 * (trS[i] ? v/trS[i] : 0));
  const dx = pdi.map((p,i)=>{
    const m = mdi[i]||0; const den = p + m; return den ? (100*Math.abs(p - m)/den) : 0;
  });
  const adxArr = ema(dx, period);
  return { adx: adxArr, pdi, mdi };
}

// --- FVG (Fair Value Gaps) Detection
function detectFVG(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  if(candles.length < 3) return fvgs;
  
  for(let i = 2; i < candles.length; i++){
    const prev2 = candles[i-2];
    const prev1 = candles[i-1];  
    const curr = candles[i];
    
    // Bull FVG: prev2.low > curr.high (gap between them)
    if(prev2.l > curr.h){
      fvgs.push({
        type: "BULL",
        start: prev1.t,
        end: curr.t,
        top: prev2.l,
        bottom: curr.h,
        filled: false
      });
    }
    
    // Bear FVG: prev2.high < curr.low (gap between them)  
    if(prev2.h < curr.l){
      fvgs.push({
        type: "BEAR",
        start: prev1.t,
        end: curr.t,
        top: curr.l,
        bottom: prev2.h,
        filled: false
      });
    }
  }
  
  return fvgs;
}

// --- Auto Trendlines from Pivot Points
function findPivotPoints(candles: Candle[], period = 5): Array<{time: number; price: number; type: 'HIGH' | 'LOW'}> {
  const pivots: Array<{time: number; price: number; type: 'HIGH' | 'LOW'}> = [];
  
  for(let i = period; i < candles.length - period; i++){
    let isHigh = true, isLow = true;
    
    // Check if current candle is highest/lowest in window
    for(let j = i - period; j <= i + period; j++){
      if(j === i) continue;
      if(candles[j].h >= candles[i].h) isHigh = false;
      if(candles[j].l <= candles[i].l) isLow = false;
    }
    
    if(isHigh) pivots.push({time: candles[i].t, price: candles[i].h, type: 'HIGH'});
    if(isLow) pivots.push({time: candles[i].t, price: candles[i].l, type: 'LOW'});
  }
  
  return pivots;
}

function createTrendLines(pivots: Array<{time: number; price: number; type: 'HIGH' | 'LOW'}>): TrendLine[] {
  const lines: TrendLine[] = [];
  const highs = pivots.filter(p => p.type === 'HIGH').slice(-10); // Last 10 highs
  const lows = pivots.filter(p => p.type === 'LOW').slice(-10);   // Last 10 lows
  
  // Create resistance lines from highs
  for(let i = 0; i < highs.length - 1; i++){
    for(let j = i + 1; j < highs.length; j++){
      const p1 = highs[i], p2 = highs[j];
      const slope = (p2.price - p1.price) / (p2.time - p1.time);
      lines.push({
        type: "RESISTANCE",
        points: [p1, p2],
        slope
      });
    }
  }
  
  // Create support lines from lows  
  for(let i = 0; i < lows.length - 1; i++){
    for(let j = i + 1; j < lows.length; j++){
      const p1 = lows[i], p2 = lows[j];
      const slope = (p2.price - p1.price) / (p2.time - p1.time);
      lines.push({
        type: "SUPPORT", 
        points: [p1, p2],
        slope
      });
    }
  }
  
  return lines.slice(-6); // Keep only most recent 6 lines
}

// --- Component
export default function BTCTradingDashboard(){
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [stats, setStats] = useState<{ change: number; high: number; low: number } | null>(null);

  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(true);
  const [showDon, setShowDon] = useState(true);

  // Risk panel state
  const [equity, setEquity] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [atrMult, setAtrMult] = useState<number>(1.5);

  // Orderbook
  const [ob, setOb] = useState<{ bid: number; ask: number; sumBid: number; sumAsk: number; imb: number }>({ bid: 0, ask: 0, sumBid: 0, sumAsk: 0, imb: 0 });

  // FVG and Trendlines
  const [fvgs, setFvgs] = useState<FVG[]>([]);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [showFVG, setShowFVG] = useState(true);
  const [showTrendLines, setShowTrendLines] = useState(true);

  // Liquidations Heatmap
  const heatWrapRef = useRef<HTMLDivElement | null>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rangeUSD, setRangeUSD] = useState<number>(2000);
  const [bucketUSD, setBucketUSD] = useState<number>(25); 
  const [heatCols, setHeatCols] = useState<number>(180);
  const [minNotional, setMinNotional] = useState<number>(10000);
  const [showBuys, setShowBuys] = useState<boolean>(true);
  const [showSells, setShowSells] = useState<boolean>(true);
  const [logScale, setLogScale] = useState<boolean>(true);
  const [liqNear, setLiqNear] = useState<number>(0);
  const [hover, setHover] = useState<{x:number,y:number,row:number,col:number,price:number,buy:number,sell:number,ts:number}|null>(null);

  const accumBuyRef = useRef<Map<number, number>>(new Map());
  const accumSellRef = useRef<Map<number, number>>(new Map());
  const matBuyRef = useRef<Float32Array | null>(null);
  const matSellRef = useRef<Float32Array | null>(null);
  const dimsRef = useRef<{ rows: number; cols: number }>({ rows: 0, cols: 0 });
  const tsRef = useRef<Float64Array | null>(null);

  const wsKline = useRef<WebSocket | null>(null);
  const wsDepth = useRef<WebSocket | null>(null);
  const wsLiq = useRef<WebSocket | null>(null);

  // KI-Analyst state
  type AIDir = "LONG" | "SHORT" | "FLAT";
  const [ai, setAi] = useState<{ dir: AIDir; score: number; conf: number; reasons: string[] }>({ dir: "FLAT", score: 0.5, conf: 0.0, reasons: [] });

  // Backtest state
  interface BacktestResult {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: Array<{
      entry: { time: number; price: number };
      exit: { time: number; price: number; reason: string };
      side: "BUY" | "SELL";
      pnl: number;
      duration: number;
    }>;
  }
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestRunning, setBacktestRunning] = useState(false);

  // --- Fetch initial candles via REST
  useEffect(() => {
    let active = true;
    async function load(){
      const limit = 500;
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
      const r = await fetch(url);
      const data = await r.json();
      const parsed: Candle[] = data.map((d: any[]) => ({ t: d[0]/1000, o: +d[1], h: +d[2], l: +d[3], c: +d[4], v: +d[5] }));
      if(!active) return;
      setCandles(parsed);
      const url24h = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
      const r2 = await fetch(url24h); const s = await r2.json();
      setStats({ change: +s.priceChangePercent, high: +s.highPrice, low: +s.lowPrice });
      setLastPrice(parsed[parsed.length-1]?.c || 0);
    }
    load();
    return () => { active = false };
  }, [symbol, timeframe]);

  // --- WebSocket live updates (kline)
  useEffect(() => {
    if(wsKline.current) { wsKline.current.close(); wsKline.current = null; }
    const stream = `${symbol.toLowerCase()}@kline_${timeframe}`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
    wsKline.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if(!msg.k) return;
      const k = msg.k;
      const cndl: Candle = { t: Math.floor(k.t/1000), o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v };
      setLastPrice(+k.c);
      setCandles(prev => {
        const last = prev[prev.length-1];
        let next: Candle[];
        if(last && cndl.t === last.t) { next = [...prev.slice(0,-1), cndl]; } else { next = [...prev, cndl]; }
        return next;
      });
    };

    return () => ws.close();
  }, [symbol, timeframe]);

  // --- WebSocket orderbook partial depth (top 20 levels)
  useEffect(() => {
    if(wsDepth.current) { wsDepth.current.close(); wsDepth.current = null; }
    const stream = `${symbol.toLowerCase()}@depth20@100ms`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
    wsDepth.current = ws;
    ws.onmessage = (ev) => {
      const d: DepthUpdate = JSON.parse(ev.data);
      if(!d || !d.bids || !d.asks) return;
      const bids = d.bids.slice(0,20).map(([p,q])=>({p:+p,q:+q}));
      const asks = d.asks.slice(0,20).map(([p,q])=>({p:+p,q:+q}));
      const sumBid = bids.reduce((a,b)=>a+b.q,0);
      const sumAsk = asks.reduce((a,b)=>a+b.q,0);
      const imb = (sumBid - sumAsk) / Math.max(1e-8, (sumBid + sumAsk));
      const bestBid = bids[0]?.p || 0;
      const bestAsk = asks[0]?.p || 0;
      setOb({ bid: bestBid, ask: bestAsk, sumBid, sumAsk, imb });
    };
    return () => ws.close();
  }, [symbol]);

  // --- Indicator packs
  const pack = useMemo(() => {
    const closes = candles.map(c => c.c);
    const ema50Arr = ema(closes, 50);
    const ema200Arr = ema(closes, 200);
    const rsiArr = rsi(closes, 14);
    const macdObj = macd(closes, 12, 26, 9);
    const atr14 = atr(candles, 14);
    const don = donchian(candles, 20);
    const adx14 = adx(candles, 14);
    
    // FVG and Trendlines
    const fvgList = detectFVG(candles);
    const pivots = findPivotPoints(candles, 5);
    const trendLinesList = createTrendLines(pivots);
    
    return { ema50: ema50Arr, ema200: ema200Arr, rsi14: rsiArr, macdPack: macdObj, atr14, don, adx14, fvgs: fvgList, trendLines: trendLinesList };
  }, [candles]);

  // Update FVG and TrendLines state
  useEffect(() => {
    setFvgs(pack.fvgs);
    setTrendLines(pack.trendLines);
  }, [pack]);

  // --- Generate advanced signals on candle closes
  useEffect(() => {
    if(candles.length < 210) return;
    const i = candles.length - 1;
    const c = candles[i];

    const newSignals: Signal[] = [];

    // EMA cross
    const prevCross = pack.ema50[i-1] - pack.ema200[i-1];
    const nowCross = pack.ema50[i] - pack.ema200[i];
    if(prevCross < 0 && nowCross > 0) newSignals.push({ time: c.t, type: "BUY", rule: "Golden Cross (EMA50>EMA200)", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });
    if(prevCross > 0 && nowCross < 0) newSignals.push({ time: c.t, type: "SELL", rule: "Death Cross (EMA50<EMA200)", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });

    // Donchian breakout with ADX filter
    const brokeUp = c.c > pack.don.hi[i-1] && pack.adx14.adx[i] > 20;
    const brokeDn = c.c < pack.don.lo[i-1] && pack.adx14.adx[i] > 20;
    if(brokeUp) newSignals.push({ time: c.t, type: "BUY", rule: "Donchian20 Breakout + ADX>20", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });
    if(brokeDn) newSignals.push({ time: c.t, type: "SELL", rule: "Donchian20 Breakdown + ADX>20", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });

    if(newSignals.length) setSignals(prev => [...newSignals.reverse(), ...prev].slice(0, 100));
  }, [candles, pack]);

  // --- Risk calculations
  const iLast = candles.length - 1;
  const lastAtr = iLast>=0 ? (pack.atr14[iLast] || 0) : 0;
  const slDistance = lastAtr * atrMult;
  const riskAmt = equity * (riskPct/100);
  const qty = slDistance > 0 ? riskAmt / slDistance : 0;
  const qtyRounded = Math.max(0, Math.floor(qty * 1e4) / 1e4);
  const stopPriceBuy = lastPrice ? lastPrice - slDistance : 0;
  const stopPriceSell = lastPrice ? lastPrice + slDistance : 0;
  const tp1Buy = lastPrice ? lastPrice + slDistance : 0;
  const tp2Buy = lastPrice ? lastPrice + 2*slDistance : 0;
  const tp1Sell = lastPrice ? lastPrice - slDistance : 0;
  const tp2Sell = lastPrice ? lastPrice - 2*slDistance : 0;

  // --- Stubs for AI score and alerts
  async function fetchAIScore(){
    try {
      const res = await fetch("/api/infer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, timeframe, features: { lastPrice, atr: lastAtr, adx: pack.adx14.adx[iLast]||0, obImb: ob.imb, liqNear } }) });
      if(!res.ok) throw new Error("no backend");
      const json = await res.json();
      return typeof json.score === "number" ? json.score : null;
    } catch { return null; }
  }

  async function sendAlert(sig: Signal){
    try {
      await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, timeframe, signal: sig, price: lastPrice, ob }) });
      alert("Alarm gesendet (Webhook Stub)");
    } catch { alert("Alarm-Endpoint nicht erreichbar") }
  }

  // --- Liquidations WebSocket (Binance Futures)
  useEffect(() => {
    if(wsLiq.current){ wsLiq.current.close(); wsLiq.current = null; }
    const stream = `${symbol.toLowerCase()}@forceOrder`;
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);
    wsLiq.current = ws;
    ws.onmessage = (ev) => {
      try{
        const e = JSON.parse(ev.data);
        const o = e.o || e;
        const price = parseFloat(o.ap || o.p);
        const qty = parseFloat(o.l || o.q);
        const side = (o.S || o.s || '').toString().toUpperCase();
        if(!price || !qty) return;
        const notional = price * qty;
        const rows = Math.floor((2*rangeUSD)/bucketUSD)+1; const mid = Math.floor(rows/2);
        const center = lastPrice || price;
        const idx = Math.round((price - center)/bucketUSD) + mid;
        if(idx>=0 && idx<rows){
          if(side === 'BUY'){ const acc = accumBuyRef.current; acc.set(idx, (acc.get(idx)||0) + notional); }
          else if(side === 'SELL'){ const acc = accumSellRef.current; acc.set(idx, (acc.get(idx)||0) + notional); }
          else { const acc = accumSellRef.current; acc.set(idx, (acc.get(idx)||0) + notional); }
        }
        if(Math.abs(price - center) <= bucketUSD/2){ setLiqNear(prev => prev*0.8 + notional*0.2); }
      } catch {}
    };
    return () => ws.close();
  }, [symbol, lastPrice, rangeUSD, bucketUSD]);

  // --- Heatmap matrix init
  useEffect(() => {
    const rows = Math.floor((2*rangeUSD)/bucketUSD)+1;
    const cols = heatCols;
    dimsRef.current = { rows, cols };
    matBuyRef.current = new Float32Array(rows*cols);
    matSellRef.current = new Float32Array(rows*cols);
    tsRef.current = new Float64Array(cols);
  }, [rangeUSD, bucketUSD, heatCols]);

  // --- Heatmap draw loop
  useEffect(() => {
    const timer = setInterval(() => {
      const buy = matBuyRef.current; const sell = matSellRef.current; const dims = dimsRef.current; const cvs = heatCanvasRef.current; const ts = tsRef.current;
      if(!buy || !sell || !cvs || !ts) { accumBuyRef.current.clear(); accumSellRef.current.clear(); return; }
      const { rows, cols } = dims;
      
      // shift left
      for(let r=0;r<rows;r++){
        const base = r*cols;
        for(let c=0;c<cols-1;c++){ buy[base+c] = buy[base+c+1]; sell[base+c] = sell[base+c+1]; }
        buy[base+cols-1] = 0; sell[base+cols-1] = 0;
      }
      for(let c=0;c<cols-1;c++){ ts[c] = ts[c+1]; }
      ts[cols-1] = Date.now();

      // write latest accumulation with threshold
      const writeAcc = (acc: Map<number, number>, target: Float32Array) => {
        acc.forEach((val, idx) => {
          if(idx>=0 && idx<rows && val>=minNotional){ target[idx*cols + (cols-1)] = val; }
        });
        acc.clear();
      };
      writeAcc(accumBuyRef.current, buy);
      writeAcc(accumSellRef.current, sell);

      // draw
      const ctx = cvs.getContext('2d'); if(!ctx) return;
      const W = cvs.width, H = cvs.height;
      ctx.clearRect(0,0,W,H);
      const marginLeft = 56; const marginBottom = 18; const plotW = W - marginLeft; const plotH = H - marginBottom;

      // compute max
      let maxBuy = 0, maxSell = 0; const len = buy.length;
      for(let i=0;i<len;i++){ if(buy[i]>maxBuy) maxBuy = buy[i]; if(sell[i]>maxSell) maxSell = sell[i]; }

      const colsW = plotW; const colW = colsW/cols; const rowH = plotH/rows;

      // grid + price labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const center = lastPrice || 0;
      const mid = Math.floor(rows/2);
      const ticks = 8; const step = Math.max(1, Math.round(rows/ticks));
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1;
      for(let r=0;r<rows;r+=step){
        const price = center + (r - mid) * bucketUSD;
        const y = plotH - (r+0.5)*rowH;
        ctx.fillText(fmt(price,0), marginLeft-6, y);
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(marginLeft, y); ctx.lineTo(W, y); ctx.stroke(); ctx.globalAlpha = 1;
      }

      // time labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const t0 = ts[0]; const t1 = ts[Math.floor(cols/2)]; const t2 = ts[cols-1];
      const tfmt = (t:number)=> t? new Date(t).toLocaleTimeString(): '';
      ctx.fillText(tfmt(t0), marginLeft + 0*colW, H-2);
      ctx.fillText(tfmt(t1), marginLeft + (cols/2)*colW, H-2);
      ctx.fillText(tfmt(t2), marginLeft + (cols-1)*colW, H-2);

      // center line
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(marginLeft, plotH/2); ctx.lineTo(W, plotH/2); ctx.stroke();

      // draw sells (red) and buys (green)
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const vS = sell[r*cols+c]; const vB = buy[r*cols+c];
          if(vS>0 && showSells){
            const a = (logScale? Math.log1p(vS)/Math.log1p(maxSell||1) : vS/(maxSell||1));
            if(a>0){ ctx.fillStyle = `rgba(239,68,68,${Math.min(1,a)})`; ctx.fillRect(marginLeft + c*colW, plotH-(r+1)*rowH, Math.ceil(colW), Math.ceil(rowH)); }
          }
          if(vB>0 && showBuys){
            const a = (logScale? Math.log1p(vB)/Math.log1p(maxBuy||1) : vB/(maxBuy||1));
            if(a>0){ ctx.fillStyle = `rgba(16,185,129,${Math.min(1,a)})`; ctx.fillRect(marginLeft + c*colW, plotH-(r+1)*rowH, Math.ceil(colW), Math.ceil(rowH)); }
          }
        }
      }

      // hover tooltip
      if(hover){
        const { x, y } = hover;
        ctx.fillStyle = '#0b1220'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
        const boxW = 150, boxH = 56; const bx = Math.min(W-boxW-4, Math.max(marginLeft, x+8)); const by = Math.max(4, y- boxH - 8);
        ctx.globalAlpha = 0.9; ctx.fillRect(bx, by, boxW, boxH); ctx.globalAlpha = 1; ctx.strokeRect(bx, by, boxW, boxH);
        ctx.fillStyle = '#cbd5e1'; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`Preis: ${fmt(hover.price,2)}`, bx+6, by+6);
        ctx.fillText(`Buy: $${fmt(hover.buy,0)}  Sell: $${fmt(hover.sell,0)}`, bx+6, by+20);
        if(hover.ts){ ctx.fillText(new Date(hover.ts).toLocaleTimeString(), bx+6, by+34); }
      }

      // legend
      ctx.fillStyle = '#cbd5e1'; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Buys', marginLeft+6, 6); ctx.fillStyle = 'rgba(16,185,129,0.8)'; ctx.fillRect(marginLeft+40, 8, 16, 8);
      ctx.fillStyle = '#cbd5e1'; ctx.fillText('Sells', marginLeft+66, 6); ctx.fillStyle = 'rgba(239,68,68,0.8)'; ctx.fillRect(marginLeft+108, 8, 16, 8);
      ctx.fillStyle = '#94a3b8'; ctx.fillText(logScale? 'log scale' : 'linear', marginLeft+130, 6);

    }, 1000);
    return () => clearInterval(timer);
  }, [heatCols, showBuys, showSells, logScale, lastPrice, bucketUSD, rangeUSD, minNotional, hover]);

  // pointer handlers for tooltip
  useEffect(() => {
    const cvs = heatCanvasRef.current; const dims = dimsRef.current; const ts = tsRef.current;
    if(!cvs || !dims || !ts) return;
    const handle = (clientX:number, clientY:number) => {
      const rect = cvs.getBoundingClientRect();
      const x = clientX - rect.left; const y = clientY - rect.top;
      const marginLeft = 56; const marginBottom = 18; const plotW = cvs.width - marginLeft; const plotH = cvs.height - marginBottom;
      const { rows, cols } = dims;
      if(x < marginLeft || x > cvs.width || y < 0 || y > plotH){ setHover(null); return; }
      const col = Math.floor((x - marginLeft) / (plotW/cols));
      const row = Math.floor((plotH - y) / (plotH/rows));
      const mid = Math.floor(rows/2);
      const price = (lastPrice || 0) + (row - mid) * bucketUSD;
      const buy = matBuyRef.current ? matBuyRef.current[row*cols + col] || 0 : 0;
      const sell = matSellRef.current ? matSellRef.current[row*cols + col] || 0 : 0;
      const tsVal = ts[col] || 0;
      setHover({ x, y, row, col, price, buy, sell, ts: tsVal });
    };
    const onMove = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onLeave = () => setHover(null);
    const onTouch = (e: TouchEvent) => { if(e.touches[0]) handle(e.touches[0].clientX, e.touches[0].clientY); };
    cvs.addEventListener('mousemove', onMove);
    cvs.addEventListener('mouseleave', onLeave);
    cvs.addEventListener('touchstart', onTouch, { passive: true });
    cvs.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      cvs.removeEventListener('mousemove', onMove);
      cvs.removeEventListener('mouseleave', onLeave);
      cvs.removeEventListener('touchstart', onTouch);
      cvs.removeEventListener('touchmove', onTouch);
    };
  }, [lastPrice, bucketUSD]);

  // --- KI Analyst (local heuristic + optional backend)
  function localHeuristic(): { dir: AIDir; score: number; conf: number; reasons: string[] }{
    const i = candles.length-1; if(i<50) return { dir: "FLAT", score: 0.5, conf: 0.1, reasons: ["zu wenig Daten"] };
    const price = candles[i].c;
    const adxv = pack.adx14.adx[i]||0;
    const rsiv = pack.rsi14[i]||50;
    const ema50v = pack.ema50[i]||price;
    const ema200v = pack.ema200[i]||price;
    const mac = (pack.macdPack.macdLine[i]||0) - (pack.macdPack.signalLine[i]||0);
    const donHi = pack.don.hi[i-1]||price; const donLo = pack.don.lo[i-1]||price;
    const imb = ob.imb||0;

    const reasons: string[] = [];
    let score = 0.5;

    if(ema50v>ema200v){ score += 0.08; reasons.push("EMA50>EMA200"); } else if(ema50v<ema200v){ score -= 0.08; reasons.push("EMA50<EMA200"); }
    if(adxv>22){ reasons.push(`ADX ${adxv.toFixed(1)}`); score += 0.05; }

    if(price>donHi){ score += 0.07; reasons.push("über Donchian"); }
    if(price<donLo){ score -= 0.07; reasons.push("unter Donchian"); }

    if(mac>0){ score += 0.05; reasons.push("MACD bull"); } else { score -= 0.05; reasons.push("MACD bear"); }

    if(rsiv<30){ score += 0.04; reasons.push("RSI<30"); }
    if(rsiv>70){ score -= 0.04; reasons.push("RSI>70"); }

    score += Math.max(-0.05, Math.min(0.05, (imb||0)*0.1));
    if(Math.abs(imb)>0.1) reasons.push(`OB ${Math.sign(imb)>0?"Bid":"Ask"}`);

    const liqBoost = Math.max(-0.05, Math.min(0.05, (liqNear/1_000_000)*0.05));
    if(liqNear>0) { score += liqBoost; reasons.push(`Liq ${Math.round(liqNear/1000)}k`); }

    score = Math.max(0, Math.min(1, score));

    let dir: AIDir = "FLAT"; if(score>0.55) dir="LONG"; if(score<0.45) dir="SHORT";
    const conf = Math.min(1, Math.abs(score-0.5)*2 * (1 + Math.min(1, adxv/30)) / 2);
    return { dir, score, conf, reasons };
  }

  async function runAnalysis(){
    const base = localHeuristic();
    const s = await fetchAIScore();
    if(s===null) { setAi(base); return; }
    const blendedScore = (base.score*0.5) + (s*0.5);
    let dir: AIDir = "FLAT"; if(blendedScore>0.55) dir="LONG"; if(blendedScore<0.45) dir="SHORT";
    setAi({ dir, score: blendedScore, conf: base.conf, reasons: ["heuristic", "backend"].concat(base.reasons) });
  }

  // --- Backtest Engine
  async function runBacktest(){
    if(candles.length < 250) { alert("Nicht genug Daten für Backtest (min. 250 Kerzen)"); return; }
    
    setBacktestRunning(true);
    setBacktestResult(null);
    
    // Simulate delay for processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const trades: BacktestResult['trades'] = [];
      let currentPosition: { side: "BUY" | "SELL"; entry: { time: number; price: number }; } | null = null;
      let balance = equity;
      const returns: number[] = [];
      let maxBalance = equity;
      let maxDrawdown = 0;
      
      // Generate all signals for backtest period
      const backtestSignals: Signal[] = [];
      for(let i = 210; i < candles.length - 1; i++){
        const c = candles[i];
        const closes = candles.slice(0, i+1).map(c => c.c);
        const ema50Arr = ema(closes, 50);
        const ema200Arr = ema(closes, 200);
        const don = donchian(candles.slice(0, i+1), 20);
        const adx14 = adx(candles.slice(0, i+1), 14);
        const atr14 = atr(candles.slice(0, i+1), 14);
        
        // EMA cross signals
        const prevCross = ema50Arr[i-1] - ema200Arr[i-1];
        const nowCross = ema50Arr[i] - ema200Arr[i];
        
        if(prevCross < 0 && nowCross > 0 && adx14.adx[i] > 20) {
          backtestSignals.push({ time: c.t, type: "BUY", rule: "Golden Cross + ADX>20", price: c.c, adx: adx14.adx[i], atr: atr14[i] });
        }
        if(prevCross > 0 && nowCross < 0 && adx14.adx[i] > 20) {
          backtestSignals.push({ time: c.t, type: "SELL", rule: "Death Cross + ADX>20", price: c.c, adx: adx14.adx[i], atr: atr14[i] });
        }
        
        // Donchian breakout signals
        const brokeUp = c.c > don.hi[i-1] && adx14.adx[i] > 25;
        const brokeDn = c.c < don.lo[i-1] && adx14.adx[i] > 25;
        
        if(brokeUp) {
          backtestSignals.push({ time: c.t, type: "BUY", rule: "Donchian Breakout + ADX>25", price: c.c, adx: adx14.adx[i], atr: atr14[i] });
        }
        if(brokeDn) {
          backtestSignals.push({ time: c.t, type: "SELL", rule: "Donchian Breakdown + ADX>25", price: c.c, adx: adx14.adx[i], atr: atr14[i] });
        }
      }
      
      // Process signals and simulate trades
      for(const signal of backtestSignals){
        const atrValue = signal.atr || 100;
        const slDistance = atrValue * atrMult;
        const riskAmount = balance * (riskPct/100);
        const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
        
        // Close existing position if signal is opposite
        if(currentPosition && currentPosition.side !== signal.type){
          const exitPrice = signal.price;
          const entryPrice = currentPosition.entry.price;
          let pnl = 0;
          
          if(currentPosition.side === "BUY"){
            pnl = (exitPrice - entryPrice) * positionSize;
          } else {
            pnl = (entryPrice - exitPrice) * positionSize;
          }
          
          balance += pnl;
          returns.push(pnl);
          
          trades.push({
            entry: currentPosition.entry,
            exit: { time: signal.time, price: exitPrice, reason: `Exit on ${signal.type} signal` },
            side: currentPosition.side,
            pnl,
            duration: signal.time - currentPosition.entry.time
          });
          
          // Update max balance and drawdown
          if(balance > maxBalance) maxBalance = balance;
          const drawdown = (maxBalance - balance) / maxBalance;
          if(drawdown > maxDrawdown) maxDrawdown = drawdown;
          
          currentPosition = null;
        }
        
        // Open new position if no current position
        if(!currentPosition && positionSize > 0.001){
          currentPosition = {
            side: signal.type,
            entry: { time: signal.time, price: signal.price }
          };
        }
      }
      
      // Close any remaining position at last price
      if(currentPosition){
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.c;
        const entryPrice = currentPosition.entry.price;
        const atrValue = pack.atr14[pack.atr14.length - 1] || 100;
        const slDistance = atrValue * atrMult;
        const riskAmount = balance * (riskPct/100);
        const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
        
        let pnl = 0;
        if(currentPosition.side === "BUY"){
          pnl = (exitPrice - entryPrice) * positionSize;
        } else {
          pnl = (entryPrice - exitPrice) * positionSize;
        }
        
        balance += pnl;
        returns.push(pnl);
        
        trades.push({
          entry: currentPosition.entry,
          exit: { time: lastCandle.t, price: exitPrice, reason: "Position closed at end" },
          side: currentPosition.side,
          pnl,
          duration: lastCandle.t - currentPosition.entry.time
        });
      }
      
      // Calculate metrics
      const totalReturn = ((balance - equity) / equity) * 100;
      const winningTrades = trades.filter(t => t.pnl > 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      
      // Calculate Sharpe ratio (simplified)
      const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (returns.length - 1)) : 1;
      const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      
      const result: BacktestResult = {
        totalTrades: trades.length,
        winRate,
        totalReturn,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio,
        trades: trades.slice(-20) // Show last 20 trades
      };
      
      setBacktestResult(result);
      
    } catch(error) {
      alert("Fehler beim Backtest: " + error);
    } finally {
      setBacktestRunning(false);
    }
  }

  // --- UI helpers
  const changeTf = (tf: string) => setTimeframe(tf);
  const tfList = ["1m","5m","15m","1h","4h","1d"];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div className="flex items-center gap-3">
          <LineChart className="h-6 w-6" />
          <h1 className="text-xl md:text-2xl font-semibold">BTC Trading Dashboard</h1>
          <Badge variant="secondary">Live</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
              <SelectItem value="BTCFDUSD">BTC/FDUSD</SelectItem>
              <SelectItem value="BTCEUR">BTC/EUR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={changeTf}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tfList.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingViewWidget symbol={symbol} interval={timeframe} />
            <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">ATR14: <span className="font-mono">{fmt(lastAtr,2)}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">ADX14: <span className="font-mono">{fmt(pack.adx14.adx[iLast]||0,1)}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">OB-Imb: <span className={`font-mono ${ob.imb>0?"text-green-500":"text-red-500"}`}>{fmt((ob.imb||0)*100,1)}%</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">FVGs: <span className="font-mono">{fvgs.length}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">Trendlines: <span className="font-mono">{trendLines.length}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">Liq@Spot: <span className="font-mono">{fmt(liqNear/1000,1)}k</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Ticker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{lastPrice ? fmt(lastPrice, 2) : "-"}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {stats && (<>
                  <span>24h:</span>
                  <span className={stats.change >= 0 ? "text-green-500" : "text-red-500"}>{fmt(stats.change, 2)}%</span>
                  <span>H {fmt(stats.high,0)}</span>
                  <span>L {fmt(stats.low,0)}</span>
                </>)}
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Badge variant="secondary">Quelle: Binance</Badge>
                <Badge variant="outline">TF {timeframe}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liquidations Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Liquidations Heatmap (Futures)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-3 items-end">
            <div>
              <Label>Range ±USD</Label>
              <Input type="number" value={rangeUSD} onChange={e=>setRangeUSD(parseFloat(e.target.value)||0)} />
            </div>
            <div>
              <Label>Bucket USD</Label>
              <Input type="number" value={bucketUSD} onChange={e=>setBucketUSD(parseFloat(e.target.value)||1)} />
            </div>
            <div>
              <Label>Spalten</Label>
              <Input type="number" value={heatCols} onChange={e=>setHeatCols(parseInt(e.target.value)||60)} />
            </div>
            <div>
              <Label>Min Notional $</Label>
              <Input type="number" value={minNotional} onChange={e=>setMinNotional(parseFloat(e.target.value)||0)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showBuys} onCheckedChange={setShowBuys} id="showB" />
              <Label htmlFor="showB">Buys</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showSells} onCheckedChange={setShowSells} id="showS" />
              <Label htmlFor="showS">Sells</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={logScale} onCheckedChange={setLogScale} id="log" />
              <Label htmlFor="log">Log-Skala</Label>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Tippen oder hovern zeigt Preis, Volumen und Zeit an. Grün = Buy-Liq, Rot = Sell-Liq.
          </div>
          <div ref={heatWrapRef} className="w-full overflow-hidden rounded border border-border">
            <canvas 
              ref={heatCanvasRef} 
              width={980} 
              height={300} 
              className="w-full h-[300px] block bg-slate-900" 
            />
          </div>
        </CardContent>
      </Card>

      {/* FVG & Trendlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Fair Value Gaps (FVG)</CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={showFVG} onCheckedChange={setShowFVG} id="fvg" />
              <Label htmlFor="fvg">FVG anzeigen</Label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Typ</th>
                    <th>Bereich</th>
                    <th>Größe</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fvgs.slice(-10).map((fvg, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2">
                        <Badge className={fvg.type === "BULL" ? "bg-green-600" : "bg-red-600"}>
                          {fvg.type}
                        </Badge>
                      </td>
                      <td>{fmt(fvg.bottom, 2)} - {fmt(fvg.top, 2)}</td>
                      <td>{fmt(fvg.top - fvg.bottom, 2)}</td>
                      <td>
                        <Badge variant={fvg.filled ? "secondary" : "outline"}>
                          {fvg.filled ? "Gefüllt" : "Offen"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!fvgs.length && (
                    <tr>
                      <td className="py-4" colSpan={4}>Keine FVGs erkannt.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Auto-Trendlinien</CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={showTrendLines} onCheckedChange={setShowTrendLines} id="tl" />
              <Label htmlFor="tl">Trendlinien anzeigen</Label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Typ</th>
                    <th>Punkte</th>
                    <th>Steigung</th>
                    <th>Stärke</th>
                  </tr>
                </thead>
                <tbody>
                  {trendLines.slice(-8).map((tl, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2">
                        <Badge variant={tl.type === "RESISTANCE" ? "destructive" : "secondary"}>
                          {tl.type === "RESISTANCE" ? "WIDERSTAND" : "UNTERSTÜTZUNG"}
                        </Badge>
                      </td>
                      <td>
                        {tl.points.map((p, idx) => (
                          <div key={idx} className="text-xs">
                            {fmt(p.price, 0)} @ {new Date(p.time*1000).toLocaleTimeString()}
                          </div>
                        ))}
                      </td>
                      <td className={tl.slope > 0 ? "text-green-500" : "text-red-500"}>
                        {fmt(tl.slope * 3600, 4)}/h
                      </td>
                      <td>
                        <div className="w-full bg-border rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(100, Math.abs(tl.slope) * 10000)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!trendLines.length && (
                    <tr>
                      <td className="py-4" colSpan={4}>Keine Trendlinien erkannt.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signals & Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle>Signale</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Zeit</th>
                    <th>Typ</th>
                    <th>Regel</th>
                    <th>Preis</th>
                    <th>ADX</th>
                    <th>ATR</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2">{new Date(s.time*1000).toLocaleString()}</td>
                      <td><Badge className={s.type === "BUY" ? "bg-green-600" : "bg-red-600"}>{s.type}</Badge></td>
                      <td>{s.rule}</td>
                      <td>{fmt(s.price, 2)}</td>
                      <td>{s.adx ? fmt(s.adx,1) : "-"}</td>
                      <td>{s.atr ? fmt(s.atr,2) : "-"}</td>
                      <td><Button size="sm" variant="outline" onClick={()=>sendAlert(s)}>Alarm</Button></td>
                    </tr>
                  ))}
                  {!signals.length && (<tr><td className="py-4" colSpan={7}>Noch keine Signale auf diesem Timeframe.</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle>Risk-Panel</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Equity (USDT)</Label>
                <Input type="number" value={equity} onChange={e=>setEquity(parseFloat(e.target.value)||0)} />
              </div>
              <div>
                <Label>Risiko %</Label>
                <Input type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value)||0)} />
              </div>
              <div>
                <Label>ATR-Multiplikator</Label>
                <Input type="number" step="0.1" value={atrMult} onChange={e=>setAtrMult(parseFloat(e.target.value)||0)} />
              </div>
              <div className="flex items-end"><div>
                <div className="text-xs text-muted-foreground">SL-Distanz</div>
                <div className="font-mono">{fmt(slDistance,2)}</div>
              </div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Größe (BTC)</div>
                <div className="text-lg font-semibold">{fmt(qtyRounded,4)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Risiko (USDT)</div>
                <div className="text-lg font-semibold">{fmt(riskAmt,2)}</div>
              </div>
            </div>
            <div className="border rounded p-2 space-y-1">
              <div className="text-xs text-muted-foreground">Long Setup</div>
              <div className="flex gap-3 text-sm"><span>SL</span><span className="font-mono">{fmt(stopPriceBuy,2)}</span><span>TP1</span><span className="font-mono">{fmt(tp1Buy,2)}</span><span>TP2</span><span className="font-mono">{fmt(tp2Buy,2)}</span></div>
            </div>
            <div className="border rounded p-2 space-y-1">
              <div className="text-xs text-muted-foreground">Short Setup</div>
              <div className="flex gap-3 text-sm"><span>SL</span><span className="font-mono">{fmt(stopPriceSell,2)}</span><span>TP1</span><span className="font-mono">{fmt(tp1Sell,2)}</span><span>TP2</span><span className="font-mono">{fmt(tp2Sell,2)}</span></div>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="outline" className="w-full" onClick={runBacktest} disabled={backtestRunning}>
                {backtestRunning ? "Läuft..." : "Backtest Starten"}
              </Button>
              <Button className="w-full" onClick={async()=>{
                const s = await fetchAIScore();
                if(s===null) alert("AI-Score: kein Backend"); else alert(`AI-Score: ${fmt(s*100,1)}%`);
              }}>AI-Score (Stub)</Button>
            </div>
            
            {backtestResult && (
              <div className="mt-4 border rounded p-3 space-y-3">
                <div className="text-sm font-semibold">Backtest Ergebnis</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Trades: <span className="font-mono">{backtestResult.totalTrades}</span></div>
                  <div>Win-Rate: <span className={`font-mono ${backtestResult.winRate >= 50 ? "text-green-500" : "text-red-500"}`}>{fmt(backtestResult.winRate,1)}%</span></div>
                  <div>Return: <span className={`font-mono ${backtestResult.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(backtestResult.totalReturn,2)}%</span></div>
                  <div>Max DD: <span className="font-mono text-red-500">-{fmt(backtestResult.maxDrawdown,2)}%</span></div>
                </div>
                <div className="text-xs">
                  <div>Sharpe: <span className="font-mono">{fmt(backtestResult.sharpeRatio,2)}</span></div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <div className="text-xs font-semibold mb-1">Letzte Trades:</div>
                  {backtestResult.trades.slice(-5).map((trade, i) => (
                    <div key={i} className="text-xs flex justify-between border-t border-border pt-1">
                      <span className={trade.side === "BUY" ? "text-green-500" : "text-red-500"}>{trade.side}</span>
                      <span>{fmt(trade.entry.price,0)} → {fmt(trade.exit.price,0)}</span>
                      <span className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>{fmt(trade.pnl,2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KI Analyst Card */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>KI‑Analyst</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Richtung</div>
              <div className={`text-lg font-semibold ${ai.dir==="LONG"?"text-green-500":ai.dir==="SHORT"?"text-red-500":""}`}>{ai.dir}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="font-mono">{fmt(ai.score*100,1)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className="font-mono">{fmt(ai.conf*100,1)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">ATR</div>
              <div className="font-mono">{fmt(lastAtr,2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">ADX14</div>
              <div className="font-mono">{fmt(pack.adx14.adx[iLast]||0,1)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Liq@Spot</div>
              <div className="font-mono">{fmt(liqNear/1000,1)}k</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Begründungen: {ai.reasons.join(", ") || "—"}</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded p-2">
              <div className="text-xs text-muted-foreground">Empfehlung</div>
              <div className="text-sm">
                {ai.dir==="LONG" && `Long bevorzugt. Größe ≈ ${fmt(qtyRounded,4)} BTC. SL ${fmt(stopPriceBuy,2)} • TP1 ${fmt(tp1Buy,2)} • TP2 ${fmt(tp2Buy,2)}`}
                {ai.dir==="SHORT" && `Short bevorzugt. Größe ≈ ${fmt(qtyRounded,4)} BTC. SL ${fmt(stopPriceSell,2)} • TP1 ${fmt(tp1Sell,2)} • TP2 ${fmt(tp2Sell,2)}`}
                {ai.dir==="FLAT" && `Kein Edge. Warten.`}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-muted-foreground">Aktionen</div>
              <div className="flex gap-2 mt-1">
                <Button size="sm" onClick={runAnalysis}>Analyse aktualisieren</Button>
                <Button size="sm" variant="outline" onClick={()=>{
                  const now = Math.floor(Date.now()/1000);
                  const sig: Signal = { time: now, type: ai.dir==="LONG"?"BUY":"SELL", rule: `AI ${Math.round(ai.score*100)}%`, price: lastPrice, adx: pack.adx14.adx[iLast], atr: lastAtr };
                  if(ai.dir!=="FLAT") sendAlert(sig);
                }}>Alarm senden</Button>
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-muted-foreground">Backend</div>
              <div className="text-xs">Optionales Modell via <code>POST /api/infer</code>. Fällt auf Heuristik zurück, wenn nicht verfügbar.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Guide */}
      <TradingGuide />

      {/* Signal Aggregation */}
      <SignalAggregation 
        symbol={symbol}
        timeframe={timeframe}
        equity={equity}
        riskPercent={riskPct}
      />

      {/* Advanced Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Market Structure */}
        <MarketStructure candles={candles} />
        
        {/* Volume Profile */}
        <VolumeProfile symbol="BTCUSDT" timeframe="1h" />
        
        {/* Order Flow */}
        <OrderFlow symbol="BTCUSDT" timeframe="1m" />
        
        {/* Pattern Recognition */}
        <PatternRecognition symbol="BTCUSDT" timeframe="1h" />
      </div>

      {/* Risk Management & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Management */}
        <RiskManagement 
          symbol={symbol}
          equity={equity}
        />
        
        {/* Strategy Backtest */}
        <StrategyBacktest candles={candles} />
      </div>

      {/* Precision Gate */}
      <PrecisionGate
        symbol={symbol}
        lastPrice={lastPrice}
        getAIScore={fetchAIScore}
      />

      {/* Multi-Timeframe Analysis */}
      <MultiTimeframeAnalysis symbol={symbol} />

      {/* Trade Journal */}
      <TradeJournal 
        symbol={symbol}
        lastPrice={lastPrice}
        atr={lastAtr}
        adx={pack.adx14.adx[iLast] || 0}
        rsi={pack.rsi14[iLast] || 50}
      />

    </div>
  );
}