// --- UPDATE START: Konsens + Precision-Gate ---------------------------------
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Voraussetzungen: Funktionen ema, adx, atr existieren bereits im File.
// Erwartete Props/States im Host: symbol, lastPrice, fetchAIScore(), candles.

type TFState = {
  tf: string;
  dir: "LONG" | "SHORT" | "NEUTRAL";
  adx: number;
  atrp: number;            // ATR% = ATR/Close
  close: number;
};

const GATE = {
  MIN_ADX: 20,
  ATRP_MIN: 0.003,         // 0.3%
  ATRP_MAX: 0.025,         // 2.5%
  AI_MIN: 0.60,
  FUNDING_ABS_MAX: 0.0007, // 0.07% pro 8h
};

// Helper functions (imported from trading dashboard logic)
function ema(values: number[], period: number): number[] {
  if(!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for(let i=1;i<values.length;i++){ prev = values[i]*k + prev*(1-k); out.push(prev); }
  return out;
}

function atr(candles: Array<{t: number; o: number; h: number; l: number; c: number}>, period = 14): number[] {
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

function adx(candles: Array<{t: number; o: number; h: number; l: number; c: number}>, period = 14){
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

export function PrecisionGate({
  symbol,
  lastPrice,
  getAIScore,             // () => Promise<number|null>
}: {
  symbol: string;
  lastPrice: number;
  getAIScore: () => Promise<number|null>;
}) {
  const [res, setRes] = useState<{
    status: "GO" | "NO";
    side?: "LONG" | "SHORT";
    score: number;
    reasons: string[];
    tf: Record<string, TFState> | null;
    funding?: number|null;
    oi?: number|null;
    oiDeltaPct?: number|null;
    ai?: number|null;
  }>({ status: "NO", score: 0, reasons: [], tf: null });

  const prevOiRef = useRef<{v: number|null, t: number|null}>({ v: null, t: null });

  async function fetchTF(tf: string): Promise<TFState> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=300`;
    const rows = await fetch(url).then(r => r.json());
    const k = rows.map((d: any[]) => ({ h:+d[2], l:+d[3], c:+d[4] }));
    const closes = k.map(x => x.c);
    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);
    const adx14 = adx(k.map((x,i)=>({t:i,o:closes[i-1]??closes[i],h:x.h,l:x.l,c:x.c})), 14).adx;
    const atr14 = atr(k.map((x,i)=>({t:i,o:closes[i-1]??closes[i],h:x.h,l:x.l,c:x.c})), 14);
    const i = k.length - 1;
    const close = closes[i];
    const atrp = close ? (atr14[i] || 0) / close : 0;
    let dir: TFState["dir"] = "NEUTRAL";
    if (ema50[i] > ema200[i]) dir = "LONG";
    if (ema50[i] < ema200[i]) dir = "SHORT";
    return { tf, dir, adx: adx14[i] || 0, atrp, close };
  }

  async function pullFunding(): Promise<number|null> {
    try {
      const prem = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`).then(r=>r.json());
      return parseFloat(prem.lastFundingRate); // decimal per 8h
    } catch { return null; }
  }

  async function pullOpenInterest(): Promise<{oi:number|null, dPct:number|null}> {
    try {
      const oiResp = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`).then(r=>r.json());
      const oi = parseFloat(oiResp.openInterest);
      const prev = prevOiRef.current.v;
      let dPct: number|null = null;
      if (Number.isFinite(oi) && prev != null && prev > 0) dPct = ((oi - prev) / prev) * 100;
      if (Number.isFinite(oi)) prevOiRef.current = { v: oi, t: Date.now() };
      return { oi: Number.isFinite(oi) ? oi : null, dPct };
    } catch { return { oi: null, dPct: null }; }
  }

  function decide(states: TFState[], ai: number|null, funding: number|null, oiDeltaPct: number|null) {
    const reasons: string[] = [];
    // 1) TF-Konsens
    const longs = states.filter(s => s.dir === "LONG");
    const shorts = states.filter(s => s.dir === "SHORT");
    const side = longs.length >= 2 ? "LONG" : shorts.length >= 2 ? "SHORT" : null;
    if (!side) reasons.push("kein TF-Konsens");
    else reasons.push(`Konsens: ${side} (${states.map(s=>s.tf+":"+s.dir[0]).join(", ")})`);

    // 2) ADX-Gate auf den konsensrelevanten TFs
    const pool = side === "LONG" ? longs : side === "SHORT" ? shorts : [];
    const adxPass = pool.every(s => s.adx >= GATE.MIN_ADX);
    reasons.push(adxPass ? `ADX OK (≥${GATE.MIN_ADX})` : "ADX zu niedrig");

    // 3) ATR%-Fenster
    const atrPass = pool.every(s => s.atrp >= GATE.ATRP_MIN && s.atrp <= GATE.ATRP_MAX);
    reasons.push(atrPass ? `ATR% OK (${(GATE.ATRP_MIN*100).toFixed(1)}–${(GATE.ATRP_MAX*100).toFixed(1)})` : "ATR% out-of-range");

    // 4) AI-Score
    const aiPass = ai != null ? ai >= GATE.AI_MIN : true;
    if (ai == null) reasons.push("AI-Score n/v"); else reasons.push(`AI ${Math.round(ai*100)}% ${aiPass?"OK":"zu niedrig"}`);

    // 5) Funding-Filter
    const fundPass = funding != null ? Math.abs(funding) <= GATE.FUNDING_ABS_MAX : true;
    if (funding != null) reasons.push(`Funding ${(funding*100).toFixed(3)}% ${fundPass?"OK":"extrem"}`); else reasons.push("Funding n/v");

    // 6) OI-Δ Richtung
    let oiPass = true;
    if (oiDeltaPct != null && side) {
      oiPass = side === "LONG" ? oiDeltaPct >= -0.2 : oiDeltaPct <= 0.2; // Vermeide Long bei stark fallendem OI und Short bei stark steigendem OI
      reasons.push(`OIΔ ${oiDeltaPct.toFixed(2)}% ${oiPass?"OK":"kontra"}`);
    } else {
      reasons.push("OIΔ n/v");
    }

    // Score
    const gates = [Boolean(side), adxPass, atrPass, aiPass, fundPass, oiPass];
    const score = gates.reduce((a,b)=>a+(b?1:0), 0) / gates.length;

    const go = Boolean(side) && adxPass && atrPass && aiPass && fundPass && oiPass;
    return { go, side: side as ("LONG"|"SHORT"|null), score, reasons };
  }

  async function runGate() {
    try {
      const [tf15, tf1h, tf4h] = await Promise.all([fetchTF("15m"), fetchTF("1h"), fetchTF("4h")]);
      const ai = await getAIScore();
      const funding = await pullFunding();
      const { oi, dPct } = await pullOpenInterest();

      const decision = decide([tf15, tf1h, tf4h], ai, funding, dPct);
      setRes({
        status: decision.go ? "GO" : "NO",
        side: decision.side || undefined,
        score: decision.score,
        reasons: decision.reasons,
        tf: { "15m": tf15, "1h": tf1h, "4h": tf4h },
        funding, oi, oiDeltaPct: dPct, ai
      });
    } catch {
      setRes({ status: "NO", score: 0, reasons: ["Error"], tf: null });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Konsens + Precision-Gate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge className={
            res.status==="GO" && res.side==="LONG" ? "bg-green-600" :
            res.status==="GO" && res.side==="SHORT" ? "bg-red-600" : "bg-gray-600"
          }>
            {res.status==="GO" ? `GO ${res.side}` : "NO TRADE"}
          </Badge>
          <span className="font-mono">Score {(res.score*100).toFixed(0)}%</span>
          {res.ai!=null && <span className="text-muted-foreground">AI {(res.ai*100).toFixed(0)}%</span>}
          {res.funding!=null && <span className="text-muted-foreground">Funding {(res.funding*100).toFixed(3)}%</span>}
          {res.oiDeltaPct!=null && <span className="text-muted-foreground">OIΔ {res.oiDeltaPct.toFixed(2)}%</span>}
        </div>
        {res.tf && (
          <div className="grid grid-cols-3 gap-2 font-mono">
            {Object.values(res.tf).map(t=>(
              <div key={t.tf} className="border rounded p-2">
                <div className="text-xs">{t.tf}</div>
                <div className={`text-sm ${t.dir==="LONG"?"text-green-500":t.dir==="SHORT"?"text-red-500":""}`}>{t.dir}</div>
                <div className="text-xs text-muted-foreground">ADX {t.adx.toFixed(1)} • ATR% {(t.atrp*100).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        <ul className="list-disc pl-5 text-xs">
          {res.reasons.map((r,i)=><li key={i}>{r}</li>)}
        </ul>
        <div className="pt-1">
          <Button onClick={runGate}>Gate prüfen</Button>
        </div>
      </CardContent>
    </Card>
  );
}
// --- UPDATE END --------------------------------------------------------------