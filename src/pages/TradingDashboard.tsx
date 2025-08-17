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
      studies: [
        "STD;EMA",
        "STD;MACD",
        "STD;RSI"
      ],
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

// --- Types
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
interface Signal { time: number; type: "BUY" | "SELL"; rule: string; price: number; adx?: number; atr?: number; score?: number }
interface DepthUpdate { bids: [string, string][], asks: [string, string][] }

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

  const wsKline = useRef<WebSocket | null>(null);
  const wsDepth = useRef<WebSocket | null>(null);

  // KI-Analyst state
  type AIDir = "LONG" | "SHORT" | "FLAT";
  const [ai, setAi] = useState<{ dir: AIDir; score: number; conf: number; reasons: string[] }>({ dir: "FLAT", score: 0.5, conf: 0.0, reasons: [] });

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

  // --- WebSocket orderbook partial depth
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
    return { ema50: ema50Arr, ema200: ema200Arr, rsi14: rsiArr, macdPack: macdObj, atr14, don, adx14 };
  }, [candles]);

  // --- Generate advanced signals on candle closes
  useEffect(() => {
    if(candles.length < 210) return;
    const i = candles.length - 1;
    const c = candles[i];

    const newSignals: Signal[] = [];

    // EMA cross
    const prevCross = pack.ema50[i-1] - pack.ema200[i-1];
    const nowCross = pack.ema50[i] - pack.ema200[i];
    if(prevCross < 0 && nowCross > 0) newSignals.push({ time: c.t, type: "BUY", rule: "Golden Cross (EMA50&gt;EMA200)", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });
    if(prevCross > 0 && nowCross < 0) newSignals.push({ time: c.t, type: "SELL", rule: "Death Cross (EMA50&lt;EMA200)", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });

    // Donchian breakout with ADX filter
    const brokeUp = c.c > pack.don.hi[i-1] && pack.adx14.adx[i] > 20;
    const brokeDn = c.c < pack.don.lo[i-1] && pack.adx14.adx[i] > 20;
    if(brokeUp) newSignals.push({ time: c.t, type: "BUY", rule: "Donchian20 Breakout + ADX&gt;20", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });
    if(brokeDn) newSignals.push({ time: c.t, type: "SELL", rule: "Donchian20 Breakdown + ADX&gt;20", price: c.c, adx: pack.adx14.adx[i], atr: pack.atr14[i] });

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
      const res = await fetch("/api/infer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, timeframe, features: { lastPrice, atr: lastAtr, adx: pack.adx14.adx[iLast]||0, obImb: ob.imb } }) });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingViewWidget symbol={symbol} interval={timeframe} />
            <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="flex items-center gap-2"><Switch checked={showEMA50} onCheckedChange={setShowEMA50} id="ema50" /><Label htmlFor="ema50">EMA 50</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showEMA200} onCheckedChange={setShowEMA200} id="ema200" /><Label htmlFor="ema200">EMA 200</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showDon} onCheckedChange={setShowDon} id="don" /><Label htmlFor="don">Donchian 20</Label></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">ATR14: <span className="font-mono">{fmt(lastAtr,2)}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">ADX14: <span className="font-mono">{fmt(pack.adx14.adx[iLast]||0,1)}</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">OB-Imb: <span className={`font-mono ${ob.imb>0?"text-green-500":"text-red-500"}`}>{fmt((ob.imb||0)*100,1)}%</span></div>
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
              <Button variant="outline" className="w-full" onClick={() => alert("Backtest-Ansicht wird als nächstes ergänzt.")}>Backtest</Button>
              <Button className="w-full" onClick={async()=>{
                const s = await fetchAIScore();
                if(s===null) alert("AI-Score: kein Backend"); else alert(`AI-Score: ${fmt(s*100,1)}%`);
              }}>AI-Score (Stub)</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-3">
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
                <div className="text-xs text-muted-foreground">Orderbook</div>
                <div className="font-mono">{fmt((ob.imb||0)*100,1)}%</div>
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
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle>Strategie & Hinweise</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Donchian20 Breakouts nur bei ADX&gt;20 filtern. Range = Mean-Reversion, Trend = Breakout.</li>
            <li>Orderbuch-/Liquidationsdaten sind Kontext, keine alleinigen Trigger.</li>
            <li>Positionsgröße aus ATR-basiertem Stop. Kein Finanzrat.</li>
          </ul>
          <div className="text-muted-foreground">Endpoints: POST /api/alerts, /api/infer</div>
        </CardContent>
      </Card>
    </div>
  );
}