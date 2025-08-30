import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeFrameAnalysis {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
  adx: number;
  atr: number;
  ema_cross: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  support_resistance: number[];
  momentum: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();
    console.log('Multi-timeframe analysis for:', symbol);

    const timeframes = ['1h', '4h', '1d'];
    const analyses: TimeFrameAnalysis[] = [];

    // Fetch data for each timeframe
    for (const tf of timeframes) {
      const klineData = await fetchKlineData(symbol, tf);
      const analysis = analyzeTimeframe(klineData, tf);
      analyses.push(analysis);
    }

    // Calculate correlation and overall signal
    const correlation = calculateCorrelation(analyses);
    const overallSignal = generateOverallSignal(analyses, correlation);

    return new Response(JSON.stringify({
      symbol,
      timestamp: new Date().toISOString(),
      timeframes: analyses,
      correlation,
      overallSignal,
      confidence: calculateConfidence(analyses, correlation)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in multi-timeframe-analysis:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchKlineData(symbol: string, timeframe: string) {
  const intervals: Record<string, string> = {
    '1h': '1h',
    '4h': '4h', 
    '1d': '1d'
  };

  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${intervals[timeframe]}&limit=100`
  );
  
  const data = await response.json();
  return data.map((k: any) => ({
    t: parseInt(k[0]),
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5])
  }));
}

function analyzeTimeframe(candles: any[], timeframe: string): TimeFrameAnalysis {
  const closes = candles.map(c => c.c);
  const highs = candles.map(c => c.h);
  const lows = candles.map(c => c.l);
  
  // Calculate EMAs
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate ADX
  const adx = calculateADX(candles);
  
  // Calculate ATR
  const atr = calculateATR(candles);
  
  // Determine trend
  const trend = currentPrice > ema20[ema20.length - 1] && ema20[ema20.length - 1] > ema50[ema50.length - 1] 
    ? 'BULLISH' 
    : currentPrice < ema20[ema20.length - 1] && ema20[ema20.length - 1] < ema50[ema50.length - 1]
    ? 'BEARISH' 
    : 'NEUTRAL';
  
  // Calculate EMA cross signal
  const ema_cross = ema20[ema20.length - 1] > ema50[ema50.length - 1] && ema20[ema20.length - 2] <= ema50[ema50.length - 2]
    ? 'BULLISH'
    : ema20[ema20.length - 1] < ema50[ema50.length - 1] && ema20[ema20.length - 2] >= ema50[ema50.length - 2]
    ? 'BEARISH'
    : 'NEUTRAL';
  
  // Find support/resistance levels
  const support_resistance = findSupportResistance(highs, lows);
  
  // Calculate momentum
  const momentum = calculateMomentum(closes);
  
  // Calculate strength based on trend alignment and ADX
  const strength = trend !== 'NEUTRAL' ? Math.min(100, adx * 2 + Math.abs(momentum)) : 0;

  return {
    timeframe,
    trend,
    strength,
    adx,
    atr,
    ema_cross,
    support_resistance,
    momentum
  };
}

function calculateEMA(values: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  ema[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema[i] = (values[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

function calculateADX(candles: any[]): number {
  if (candles.length < 14) return 0;
  
  let dmPlus = 0, dmMinus = 0, tr = 0;
  
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    const highDiff = candles[i].h - candles[i-1].h;
    const lowDiff = candles[i-1].l - candles[i].l;
    
    dmPlus += highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    dmMinus += lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
    
    const trueRange = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i-1].c),
      Math.abs(candles[i].l - candles[i-1].c)
    );
    tr += trueRange;
  }
  
  const diPlus = (dmPlus / tr) * 100;
  const diMinus = (dmMinus / tr) * 100;
  
  return Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100 || 0;
}

function calculateATR(candles: any[]): number {
  if (candles.length < 14) return 0;
  
  let atr = 0;
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    const trueRange = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i-1].c),
      Math.abs(candles[i].l - candles[i-1].c)
    );
    atr += trueRange;
  }
  
  return atr / 14;
}

function findSupportResistance(highs: number[], lows: number[]): number[] {
  const levels = [];
  const recentData = 20;
  const start = Math.max(0, highs.length - recentData);
  
  // Find swing highs and lows
  for (let i = start + 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i+1] && highs[i] > highs[i-2] && highs[i] > highs[i+2]) {
      levels.push(highs[i]);
    }
    if (lows[i] < lows[i-1] && lows[i] < lows[i+1] && lows[i] < lows[i-2] && lows[i] < lows[i+2]) {
      levels.push(lows[i]);
    }
  }
  
  return levels.slice(-6); // Return last 6 levels
}

function calculateMomentum(closes: number[]): number {
  if (closes.length < 10) return 0;
  const recent = closes.slice(-10);
  const change = (recent[recent.length - 1] - recent[0]) / recent[0] * 100;
  return change;
}

function calculateCorrelation(analyses: TimeFrameAnalysis[]): number {
  // Calculate how well timeframes align
  const bullishCount = analyses.filter(a => a.trend === 'BULLISH').length;
  const bearishCount = analyses.filter(a => a.trend === 'BEARISH').length;
  const neutralCount = analyses.filter(a => a.trend === 'NEUTRAL').length;
  
  const maxAlign = Math.max(bullishCount, bearishCount, neutralCount);
  return (maxAlign / analyses.length) * 100;
}

function generateOverallSignal(analyses: TimeFrameAnalysis[], correlation: number) {
  const weights = { '1h': 0.3, '4h': 0.4, '1d': 0.3 };
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  analyses.forEach(analysis => {
    const weight = weights[analysis.timeframe as keyof typeof weights];
    const strengthFactor = analysis.strength / 100;
    
    if (analysis.trend === 'BULLISH') {
      bullishScore += weight * strengthFactor;
    } else if (analysis.trend === 'BEARISH') {
      bearishScore += weight * strengthFactor;
    }
  });
  
  const netScore = (bullishScore - bearishScore) * correlation / 100;
  
  return {
    direction: netScore > 0.2 ? 'BULLISH' : netScore < -0.2 ? 'BEARISH' : 'NEUTRAL',
    score: Math.abs(netScore),
    bullishScore,
    bearishScore,
    netScore
  };
}

function calculateConfidence(analyses: TimeFrameAnalysis[], correlation: number): number {
  const avgStrength = analyses.reduce((sum, a) => sum + a.strength, 0) / analyses.length;
  const avgADX = analyses.reduce((sum, a) => sum + a.adx, 0) / analyses.length;
  
  // Higher confidence when timeframes align and have strong trends
  return Math.min(100, (correlation + avgStrength + avgADX) / 3);
}