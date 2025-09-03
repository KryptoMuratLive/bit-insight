import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderFlowData {
  time: number;
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
  vwap: number;
  poc: number;
}

interface InstitutionalActivity {
  timestamp: number;
  price: number;
  volume: number;
  type: 'ACCUMULATION' | 'DISTRIBUTION' | 'ABSORPTION' | 'REJECTION';
  intensity: number;
  confidence: number;
  description: string;
}

interface OrderFlowAnalysis {
  orderFlow: OrderFlowData[];
  institutionalActivity: InstitutionalActivity[];
  marketMicrostructure: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: number;
    absorption: number;
    liquidityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE';
  };
  tradingSignals: {
    signal: string;
    strength: number;
    recommendation: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
  }[];
  riskMetrics: {
    volumeImbalance: number;
    liquidityRisk: number;
    slippageEstimate: number;
    optimalTradeSize: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe } = await req.json();
    
    console.log('Order Flow Analysis request:', { symbol, timeframe });

    // Fetch comprehensive market data
    const interval = timeframe || '1m';
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
      v: parseFloat(k[5]),
      q: parseFloat(k[7]) // Quote asset volume
    }));

    // Advanced Order Flow Calculations
    let cumulativeDelta = 0;
    let cumulativeVolume = 0;
    let vwapNumerator = 0;

    const orderFlowData: OrderFlowData[] = candles.map((candle: any, i: number) => {
      // Enhanced volume delta calculation
      const range = candle.h - candle.l;
      const bodySize = Math.abs(candle.c - candle.o);
      const upperWickSize = candle.h - Math.max(candle.o, candle.c);
      const lowerWickSize = Math.min(candle.o, candle.c) - candle.l;
      
      // Calculate buy/sell pressure based on candle structure
      let buyPressure = 0.5; // Default neutral
      
      if (range > 0) {
        // Green candle with small upper wick = strong buying
        if (candle.c > candle.o) {
          buyPressure = 0.5 + (bodySize / range) * 0.3 + (lowerWickSize > upperWickSize ? 0.2 : 0);
        } else {
          buyPressure = 0.5 - (bodySize / range) * 0.3 - (upperWickSize > lowerWickSize ? 0.2 : 0);
        }
      }
      
      buyPressure = Math.max(0.1, Math.min(0.9, buyPressure));
      
      const buyVolume = candle.v * buyPressure;
      const sellVolume = candle.v * (1 - buyPressure);
      const delta = buyVolume - sellVolume;
      
      cumulativeDelta += delta;
      cumulativeVolume += candle.v;
      
      // VWAP calculation
      const typicalPrice = (candle.h + candle.l + candle.c) / 3;
      vwapNumerator += typicalPrice * candle.v;
      const vwap = vwapNumerator / cumulativeVolume;
      
      // Find Point of Control (price with most volume)
      const recentCandles = candles.slice(Math.max(0, i - 20), i + 1);
      const volumeByPrice: Record<string, number> = {};
      
      recentCandles.forEach((c: any) => {
        const priceLevel = Math.round(c.c / 10) * 10; // Round to nearest 10
        volumeByPrice[priceLevel] = (volumeByPrice[priceLevel] || 0) + c.v;
      });
      
      const poc = parseFloat(Object.entries(volumeByPrice)
        .reduce((max, [price, vol]) => vol > max[1] ? [price, vol] : max, ['0', 0])[0]);

      return {
        time: candle.t,
        price: candle.c,
        volume: candle.v,
        buyVolume,
        sellVolume,
        delta,
        cvd: cumulativeDelta,
        vwap,
        poc
      };
    });

    // Detect Institutional Activity
    const institutionalActivity: InstitutionalActivity[] = [];
    const avgVolume = candles.reduce((sum: number, c: any) => sum + c.v, 0) / candles.length;
    const volumeStd = Math.sqrt(
      candles.reduce((sum: number, c: any) => sum + Math.pow(c.v - avgVolume, 2), 0) / candles.length
    );

    candles.forEach((candle: any, i: number) => {
      if (i < 5) return; // Need history for analysis
      
      const volumeZ = (candle.v - avgVolume) / volumeStd;
      const priceChange = (candle.c - candle.o) / candle.o;
      const recentCandles = candles.slice(i - 5, i + 1);
      const priceVolatility = Math.sqrt(
        recentCandles.reduce((sum: any, c: any) => sum + Math.pow((c.c - c.o) / c.o, 2), 0) / 5
      );

      // Large volume spike detection
      if (volumeZ > 2) {
        let type: InstitutionalActivity['type'] = 'ACCUMULATION';
        let description = '';
        let confidence = Math.min(volumeZ * 25, 95);

        if (Math.abs(priceChange) < priceVolatility * 0.5) {
          // High volume, low price movement = absorption
          type = 'ABSORPTION';
          description = 'Large volume absorbed with minimal price impact - possible institutional accumulation';
          confidence += 10;
        } else if (priceChange > 0) {
          type = 'ACCUMULATION';
          description = 'High volume buying pressure - institutional accumulation detected';
        } else {
          type = 'DISTRIBUTION';
          description = 'High volume selling pressure - institutional distribution detected';
        }

        // Check for rejection patterns
        const bodyPercent = Math.abs(candle.c - candle.o) / (candle.h - candle.l);
        if (bodyPercent < 0.3 && volumeZ > 2.5) {
          type = 'REJECTION';
          description = 'High volume rejection candle - major support/resistance level';
          confidence += 15;
        }

        institutionalActivity.push({
          timestamp: candle.t,
          price: candle.c,
          volume: candle.v,
          type,
          intensity: Math.min(volumeZ * 20, 100),
          confidence: Math.min(confidence, 95),
          description
        });
      }
    });

    // Market Microstructure Analysis
    const recentFlow = orderFlowData.slice(-20);
    const cvdTrend = recentFlow.length > 1 ? 
      (recentFlow[recentFlow.length - 1].cvd - recentFlow[0].cvd) : 0;
    const momentum = (cvdTrend / Math.abs(recentFlow[0]?.cvd || 1)) * 100;

    // Calculate absorption (high volume, low price movement)
    const absorption = recentFlow.reduce((sum, flow, i) => {
      if (i === 0) return 0;
      const priceMove = Math.abs(flow.price - recentFlow[i-1].price) / recentFlow[i-1].price;
      const volumeRatio = flow.volume / avgVolume;
      return sum + (volumeRatio > 1.5 && priceMove < 0.002 ? 1 : 0);
    }, 0) / recentFlow.length * 100;

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (momentum > 10) sentiment = 'BULLISH';
    else if (momentum < -10) sentiment = 'BEARISH';

    // Liquidity assessment
    const avgDelta = recentFlow.reduce((sum, f) => sum + Math.abs(f.delta), 0) / recentFlow.length;
    const liquidityLevel = avgDelta > avgVolume * 0.3 ? 'HIGH' : avgDelta > avgVolume * 0.1 ? 'MEDIUM' : 'LOW';

    // Market regime detection
    const priceRanges = recentFlow.map((f, i) => i > 0 ? Math.abs(f.price - recentFlow[i-1].price) : 0);
    const avgRange = priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length;
    const rangeStd = Math.sqrt(priceRanges.reduce((sum, r) => sum + Math.pow(r - avgRange, 2), 0) / priceRanges.length);
    
    let marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' = 'RANGING';
    if (rangeStd > avgRange * 1.5) marketRegime = 'VOLATILE';
    else if (Math.abs(momentum) > 15) marketRegime = 'TRENDING';

    // Generate Trading Signals
    const tradingSignals = [];
    const currentPrice = candles[candles.length - 1].c;
    const currentVWAP = orderFlowData[orderFlowData.length - 1].vwap;
    const currentPOC = orderFlowData[orderFlowData.length - 1].poc;

    // CVD Divergence Signal
    if (momentum > 20 && currentPrice > currentVWAP) {
      tradingSignals.push({
        signal: 'CVD Bullish Momentum',
        strength: Math.min(momentum, 95),
        recommendation: 'Strong buying pressure detected. Consider long positions above VWAP.',
        entry: currentPrice * 1.001,
        stopLoss: Math.min(currentVWAP, currentPOC) * 0.995,
        takeProfit: currentPrice * 1.02
      });
    }

    if (momentum < -20 && currentPrice < currentVWAP) {
      tradingSignals.push({
        signal: 'CVD Bearish Momentum',
        strength: Math.min(Math.abs(momentum), 95),
        recommendation: 'Strong selling pressure detected. Consider short positions below VWAP.',
        entry: currentPrice * 0.999,
        stopLoss: Math.max(currentVWAP, currentPOC) * 1.005,
        takeProfit: currentPrice * 0.98
      });
    }

    // Absorption/Accumulation Signal
    if (absorption > 30 && institutionalActivity.length > 0) {
      const latestActivity = institutionalActivity[institutionalActivity.length - 1];
      if (latestActivity.type === 'ABSORPTION' || latestActivity.type === 'ACCUMULATION') {
        tradingSignals.push({
          signal: 'Institutional Absorption',
          strength: latestActivity.confidence,
          recommendation: 'Smart money accumulation detected. Price likely to move higher after absorption.',
          entry: currentPrice * 1.002,
          stopLoss: latestActivity.price * 0.99,
          takeProfit: currentPrice * 1.05
        });
      }
    }

    // Risk Metrics
    const volumeImbalance = recentFlow.reduce((sum, f) => sum + f.delta, 0) / 
                            recentFlow.reduce((sum, f) => sum + f.volume, 0) * 100;
    
    const liquidityRisk = liquidityLevel === 'LOW' ? 75 : liquidityLevel === 'MEDIUM' ? 40 : 15;
    const slippageEstimate = (liquidityRisk / 100) * 0.1; // As percentage
    const optimalTradeSize = avgVolume * 0.05; // 5% of average volume

    const analysis: OrderFlowAnalysis = {
      orderFlow: orderFlowData.slice(-30),
      institutionalActivity: institutionalActivity.slice(-10),
      marketMicrostructure: {
        sentiment,
        momentum,
        absorption,
        liquidityLevel,
        marketRegime
      },
      tradingSignals,
      riskMetrics: {
        volumeImbalance,
        liquidityRisk,
        slippageEstimate,
        optimalTradeSize
      }
    };

    console.log('Order Flow Analysis completed:', {
      symbol,
      sentiment,
      momentum: momentum.toFixed(1),
      institutionalEvents: institutionalActivity.length,
      signals: tradingSignals.length
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in order-flow-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      orderFlow: [],
      institutionalActivity: [],
      marketMicrostructure: {
        sentiment: 'NEUTRAL',
        momentum: 0,
        absorption: 0,
        liquidityLevel: 'MEDIUM',
        marketRegime: 'RANGING'
      },
      tradingSignals: [],
      riskMetrics: {
        volumeImbalance: 0,
        liquidityRisk: 50,
        slippageEstimate: 0.1,
        optimalTradeSize: 0
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});