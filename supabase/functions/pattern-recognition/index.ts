import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Pattern {
  type: string;
  confidence: number;
  timeframe: string;
  description: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  startTime: number;
  endTime: number;
  targetPrice?: number;
  stopLoss?: number;
  riskReward?: number;
}

interface Divergence {
  type: string;
  strength: number;
  description: string;
  indicator: string;
  timeframe: string;
}

interface PatternAnalysis {
  patterns: Pattern[];
  divergences: Divergence[];
  technicalLevels: {
    support: number[];
    resistance: number[];
    pivotPoints: any[];
  };
  overallSignal: {
    direction: string;
    strength: number;
    recommendation: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe } = await req.json();
    
    console.log('Pattern Recognition request:', { symbol, timeframe });

    // Fetch kline data from Binance
    const interval = timeframe || '1h';
    const limit = 200;
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const klines = await response.json();
    const candles = klines.map((k: any) => ({
      t: parseInt(k[0]),
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5])
    }));

    // Enhanced Pattern Recognition
    const patterns: Pattern[] = [];
    const divergences: Divergence[] = [];

    // Helper Functions
    const calculateSMA = (values: number[], period: number) => {
      const sma = [];
      for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
      return sma;
    };

    const calculateRSI = (values: number[], period = 14) => {
      const gains = [0];
      const losses = [0];
      for (let i = 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        gains.push(Math.max(diff, 0));
        losses.push(Math.max(-diff, 0));
      }
      
      let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b) / period;
      let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b) / period;
      
      const rsiValues = [100 - 100 / (1 + avgGain / avgLoss)];
      
      for (let i = period + 1; i < values.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rsiValues.push(100 - 100 / (1 + avgGain / avgLoss));
      }
      
      return rsiValues;
    };

    const findPivots = (period = 5) => {
      const pivots = [];
      for (let i = period; i < candles.length - period; i++) {
        const current = candles[i];
        const left = candles.slice(i - period, i);
        const right = candles.slice(i + 1, i + period + 1);
        
        if (left.every(c => c.h < current.h) && right.every(c => c.h < current.h)) {
          pivots.push({ time: current.t, price: current.h, type: "HIGH", index: i });
        }
        
        if (left.every(c => c.l > current.l) && right.every(c => c.l > current.l)) {
          pivots.push({ time: current.t, price: current.l, type: "LOW", index: i });
        }
      }
      return pivots;
    };

    const pivots = findPivots();
    const closes = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const rsiValues = calculateRSI(closes);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);

    // 1. Enhanced Head and Shoulders
    const detectHeadAndShoulders = () => {
      const highs = pivots.filter(p => p.type === "HIGH").slice(-5);
      if (highs.length >= 3) {
        for (let i = 0; i < highs.length - 2; i++) {
          const leftShoulder = highs[i];
          const head = highs[i + 1];
          const rightShoulder = highs[i + 2];
          
          const isValidPattern = 
            head.price > leftShoulder.price && 
            head.price > rightShoulder.price &&
            Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.04;
          
          if (isValidPattern) {
            const necklinePrice = Math.min(leftShoulder.price, rightShoulder.price) * 0.98;
            const targetPrice = necklinePrice - (head.price - necklinePrice);
            
            patterns.push({
              type: "Head & Shoulders",
              confidence: 82,
              timeframe: "Medium-term",
              description: "Strong bearish reversal pattern with measured target",
              bias: "BEARISH",
              startTime: leftShoulder.time,
              endTime: rightShoulder.time,
              targetPrice,
              stopLoss: head.price * 1.02,
              riskReward: Math.abs(targetPrice - necklinePrice) / Math.abs(head.price * 1.02 - necklinePrice)
            });
          }
        }
      }
    };

    // 2. Enhanced Double Top/Bottom
    const detectDoubleTopBottom = () => {
      const recentPivots = pivots.slice(-6);
      if (recentPivots.length >= 2) {
        for (let i = 0; i < recentPivots.length - 1; i++) {
          const first = recentPivots[i];
          const second = recentPivots[i + 1];
          
          if (first.type === second.type) {
            const priceDiff = Math.abs(first.price - second.price) / first.price;
            
            if (priceDiff < 0.025) {
              const targetMultiplier = first.type === "HIGH" ? 0.95 : 1.05;
              const targetPrice = first.price * targetMultiplier;
              const stopPrice = first.type === "HIGH" ? first.price * 1.03 : first.price * 0.97;
              
              patterns.push({
                type: first.type === "HIGH" ? "Double Top" : "Double Bottom",
                confidence: 78,
                timeframe: "Short-term",
                description: `${first.type === "HIGH" ? "Bearish" : "Bullish"} reversal with volume confirmation needed`,
                bias: first.type === "HIGH" ? "BEARISH" : "BULLISH",
                startTime: first.time,
                endTime: second.time,
                targetPrice,
                stopLoss: stopPrice,
                riskReward: Math.abs(targetPrice - first.price) / Math.abs(stopPrice - first.price)
              });
            }
          }
        }
      }
    };

    // 3. Advanced Triangle Patterns
    const detectTriangles = () => {
      if (pivots.length >= 4) {
        const recentPivots = pivots.slice(-8);
        const pivotHighs = recentPivots.filter(p => p.type === "HIGH");
        const pivotLows = recentPivots.filter(p => p.type === "LOW");
        
        if (pivotHighs.length >= 2 && pivotLows.length >= 2) {
          // Ascending Triangle
          const highsFlat = pivotHighs.length >= 2 && 
            Math.abs(pivotHighs[pivotHighs.length - 1].price - pivotHighs[pivotHighs.length - 2].price) / pivotHighs[0].price < 0.015;
          const lowsRising = pivotLows.length >= 2 && 
            pivotLows[pivotLows.length - 1].price > pivotLows[pivotLows.length - 2].price;
          
          if (highsFlat && lowsRising) {
            const resistanceLevel = pivotHighs[pivotHighs.length - 1].price;
            const targetPrice = resistanceLevel * 1.08;
            
            patterns.push({
              type: "Ascending Triangle",
              confidence: 72,
              timeframe: "Medium-term",
              description: "Bullish continuation pattern - breakout above resistance expected",
              bias: "BULLISH",
              startTime: Math.min(...recentPivots.map(p => p.time)),
              endTime: Math.max(...recentPivots.map(p => p.time)),
              targetPrice,
              stopLoss: resistanceLevel * 0.96,
              riskReward: 2.0
            });
          }
        }
      }
    };

    // 4. Enhanced Divergence Detection
    const detectDivergences = () => {
      if (rsiValues.length >= 20) {
        const recent = 15;
        const recentPrices = closes.slice(-recent);
        const recentRSI = rsiValues.slice(-recent);
        const recentHighs = highs.slice(-recent);
        const recentLows = lows.slice(-recent);
        
        // Bullish Divergence - More sophisticated detection
        const priceSwingLows = [];
        const rsiSwingLows = [];
        
        for (let i = 2; i < recent - 2; i++) {
          if (recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i+1]) {
            priceSwingLows.push(recentLows[i]);
            rsiSwingLows.push(recentRSI[i]);
          }
        }
        
        if (priceSwingLows.length >= 2) {
          const lastPriceLow = priceSwingLows[priceSwingLows.length - 1];
          const prevPriceLow = priceSwingLows[priceSwingLows.length - 2];
          const lastRSILow = rsiSwingLows[rsiSwingLows.length - 1];
          const prevRSILow = rsiSwingLows[rsiSwingLows.length - 2];
          
          if (lastPriceLow < prevPriceLow && lastRSILow > prevRSILow) {
            divergences.push({
              type: "Bullish RSI Divergence",
              strength: 80,
              description: "Price makes lower low while RSI makes higher low - potential reversal",
              indicator: "RSI",
              timeframe: interval
            });
          }
        }
        
        // Hidden Divergences for trend continuation
        if (priceSwingLows.length >= 2) {
          const lastPriceLow = priceSwingLows[priceSwingLows.length - 1];
          const prevPriceLow = priceSwingLows[priceSwingLows.length - 2];
          const lastRSILow = rsiSwingLows[rsiSwingLows.length - 1];
          const prevRSILow = rsiSwingLows[rsiSwingLows.length - 2];
          
          if (lastPriceLow > prevPriceLow && lastRSILow < prevRSILow) {
            divergences.push({
              type: "Hidden Bullish Divergence",
              strength: 70,
              description: "Trend continuation signal - bullish momentum strengthening",
              indicator: "RSI",
              timeframe: interval
            });
          }
        }
      }
    };

    // 5. Support/Resistance Levels
    const findSupportResistance = () => {
      const supports = [];
      const resistances = [];
      
      pivots.forEach(pivot => {
        const currentPrice = closes[closes.length - 1];
        if (pivot.type === "LOW" && pivot.price < currentPrice) supports.push(pivot.price);
        if (pivot.type === "HIGH" && pivot.price > currentPrice) resistances.push(pivot.price);
      });
      
      return {
        support: supports.slice(-3),
        resistance: resistances.slice(-3),
        pivotPoints: pivots.slice(-10)
      };
    };

    // Run all detection algorithms
    detectHeadAndShoulders();
    detectDoubleTopBottom();
    detectTriangles();
    detectDivergences();

    const technicalLevels = findSupportResistance();

    // Overall Signal Calculation
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalConfidence = 0;

    patterns.forEach(pattern => {
      if (pattern.bias === "BULLISH") bullishSignals += pattern.confidence;
      if (pattern.bias === "BEARISH") bearishSignals += pattern.confidence;
      totalConfidence += pattern.confidence;
    });

    divergences.forEach(div => {
      if (div.type.includes("Bullish")) bullishSignals += div.strength;
      if (div.type.includes("Bearish")) bearishSignals += div.strength;
    });

    const netSignal = bullishSignals - bearishSignals;
    const overallDirection = netSignal > 20 ? "BULLISH" : netSignal < -20 ? "BEARISH" : "NEUTRAL";
    const signalStrength = Math.min(Math.abs(netSignal) / 100, 1) * 100;

    let recommendation = "";
    if (overallDirection === "BULLISH") {
      recommendation = "Multiple bullish patterns detected. Consider long positions on pullbacks to support levels.";
    } else if (overallDirection === "BEARISH") {
      recommendation = "Bearish patterns dominate. Consider short positions on rallies to resistance levels.";
    } else {
      recommendation = "Mixed signals detected. Wait for clearer directional confirmation before entering trades.";
    }

    const analysis: PatternAnalysis = {
      patterns: patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 8),
      divergences,
      technicalLevels,
      overallSignal: {
        direction: overallDirection,
        strength: signalStrength,
        recommendation
      }
    };

    console.log('Pattern Recognition completed:', {
      symbol,
      patternsFound: patterns.length,
      divergencesFound: divergences.length,
      overallSignal: overallDirection,
      strength: signalStrength
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pattern-recognition function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      patterns: [],
      divergences: [],
      technicalLevels: { support: [], resistance: [], pivotPoints: [] },
      overallSignal: { direction: "NEUTRAL", strength: 0, recommendation: "Analysis unavailable due to error" }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});