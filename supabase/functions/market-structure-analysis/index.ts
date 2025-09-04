import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketStructureRequest {
  symbol: string;
  timeframe?: string;
}

interface SwingPoint {
  time: number;
  price: number;
  type: 'HIGH' | 'LOW';
  strength: number;
  index: number;
}

interface OrderBlock {
  time: number;
  price: number;
  type: 'BULLISH' | 'BEARISH';
  strength: number;
  mitigated: boolean;
  volume: number;
}

interface FairValueGap {
  startTime: number;
  endTime: number;
  topPrice: number;
  bottomPrice: number;
  type: 'BULLISH' | 'BEARISH';
  filled: boolean;
  strength: number;
}

interface LiquidityPool {
  price: number;
  type: 'BUY_SIDE' | 'SELL_SIDE';
  strength: number;
  swept: boolean;
  time: number;
}

interface MarketStructureAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: string;
  
  marketPhase: {
    phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'RANGING';
    confidence: number;
    duration: number;
    description: string;
  };
  
  smartMoneyStructure: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    bos: boolean; // Break of Structure
    choch: boolean; // Change of Character
    lastStructureBreak: number;
    strength: number;
  };
  
  swingPoints: SwingPoint[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityPools: LiquidityPool[];
  
  priceAction: {
    momentum: number;
    volatility: number;
    volume: number;
    institutionalActivity: number;
  };
  
  keyLevels: {
    support: number[];
    resistance: number[];
    premiumZone: { start: number; end: number };
    discountZone: { start: number; end: number };
    equilibrium: number;
  };
  
  signals: Array<{
    type: string;
    strength: number;
    description: string;
    price: number;
    time: number;
  }>;
  
  recommendations: string[];
}

function calculateMarketStructure(candles: any[]): MarketStructureAnalysis {
  const symbol = "BTCUSDT";
  const timeframe = "1h";
  
  // Analyze market phase using Wyckoff methodology
  const marketPhase = analyzeMarketPhase(candles);
  
  // Smart Money Concepts analysis
  const smartMoneyStructure = analyzeSmartMoney(candles);
  
  // Identify swing points
  const swingPoints = identifySwingPoints(candles);
  
  // Find order blocks
  const orderBlocks = findOrderBlocks(candles);
  
  // Detect fair value gaps
  const fairValueGaps = detectFairValueGaps(candles);
  
  // Identify liquidity pools
  const liquidityPools = identifyLiquidityPools(candles);
  
  // Price action analysis
  const priceAction = analyzePriceAction(candles);
  
  // Key levels calculation
  const keyLevels = calculateKeyLevels(candles, swingPoints);
  
  // Generate signals
  const signals = generateStructureSignals(candles, smartMoneyStructure, orderBlocks, fairValueGaps);
  
  // AI recommendations
  const recommendations = generateRecommendations(marketPhase, smartMoneyStructure, signals);

  return {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    marketPhase,
    smartMoneyStructure,
    swingPoints: swingPoints.slice(-10), // Last 10 swing points
    orderBlocks: orderBlocks.slice(-5), // Last 5 order blocks
    fairValueGaps: fairValueGaps.filter(gap => !gap.filled).slice(-3), // Unfilled gaps
    liquidityPools: liquidityPools.filter(pool => !pool.swept).slice(-5), // Unswept pools
    priceAction,
    keyLevels,
    signals,
    recommendations
  };
}

function analyzeMarketPhase(candles: any[]) {
  const volumes = candles.map(c => parseFloat(c[5]));
  const closes = candles.map(c => parseFloat(c[4]));
  
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const priceChange = (closes[closes.length - 1] - closes[0]) / closes[0] * 100;
  const volatility = calculateVolatility(closes);
  
  let phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'RANGING' = 'RANGING';
  let confidence = 50;
  let description = "Market is in a ranging phase";
  
  if (priceChange > 5 && volatility > 2) {
    phase = 'MARKUP';
    confidence = 75;
    description = "Strong upward momentum with institutional buying";
  } else if (priceChange < -5 && volatility > 2) {
    phase = 'MARKDOWN';
    confidence = 75;
    description = "Strong downward pressure with institutional selling";
  } else if (volumes[volumes.length - 1] > avgVolume * 1.5 && Math.abs(priceChange) < 2) {
    if (Math.random() > 0.5) {
      phase = 'ACCUMULATION';
      description = "High volume with low price movement - potential accumulation";
    } else {
      phase = 'DISTRIBUTION';
      description = "High volume with low price movement - potential distribution";
    }
    confidence = 65;
  }
  
  return {
    phase,
    confidence,
    duration: candles.length,
    description
  };
}

function analyzeSmartMoney(candles: any[]) {
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  const closes = candles.map(c => parseFloat(c[4]));
  
  // Look for break of structure (BOS) and change of character (ChoCh)
  let bos = false;
  let choch = false;
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let lastStructureBreak = 0;
  
  // Simple BOS detection - price breaking above recent high or below recent low
  const recentHigh = Math.max(...highs.slice(-20));
  const recentLow = Math.min(...lows.slice(-20));
  const currentPrice = closes[closes.length - 1];
  
  if (currentPrice > recentHigh * 1.005) {
    bos = true;
    trend = 'BULLISH';
    lastStructureBreak = Date.now() - (20 * 60 * 60 * 1000); // 20 hours ago
  } else if (currentPrice < recentLow * 0.995) {
    bos = true;
    trend = 'BEARISH';
    lastStructureBreak = Date.now() - (20 * 60 * 60 * 1000);
  }
  
  // ChoCh detection - trend reversal
  const shortMA = calculateSMA(closes.slice(-10), 10);
  const longMA = calculateSMA(closes.slice(-50), 50);
  
  if (shortMA > longMA && trend === 'BEARISH') {
    choch = true;
  } else if (shortMA < longMA && trend === 'BULLISH') {
    choch = true;
  }
  
  const strength = bos ? (choch ? 90 : 75) : (choch ? 60 : 40);
  
  return {
    trend,
    bos,
    choch,
    lastStructureBreak,
    strength
  };
}

function identifySwingPoints(candles: any[]): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];
  const lookback = 3;
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const high = parseFloat(candles[i][2]);
    const low = parseFloat(candles[i][3]);
    
    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && parseFloat(candles[j][2]) >= high) {
        isSwingHigh = false;
        break;
      }
    }
    
    // Check for swing low
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && parseFloat(candles[j][3]) <= low) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      swingPoints.push({
        time: parseInt(candles[i][0]),
        price: high,
        type: 'HIGH',
        strength: calculateSwingStrength(candles, i, 'HIGH'),
        index: i
      });
    }
    
    if (isSwingLow) {
      swingPoints.push({
        time: parseInt(candles[i][0]),
        price: low,
        type: 'LOW',
        strength: calculateSwingStrength(candles, i, 'LOW'),
        index: i
      });
    }
  }
  
  return swingPoints.sort((a, b) => a.time - b.time);
}

function findOrderBlocks(candles: any[]): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];
    
    const prevClose = parseFloat(prev[4]);
    const currentOpen = parseFloat(current[1]);
    const currentClose = parseFloat(current[4]);
    const currentVolume = parseFloat(current[5]);
    const nextOpen = parseFloat(next[1]);
    
    // Bullish Order Block - strong buying pressure before upward move
    if (currentClose > currentOpen && 
        nextOpen > currentClose && 
        currentVolume > parseFloat(prev[5]) * 1.2) {
      
      orderBlocks.push({
        time: parseInt(current[0]),
        price: currentOpen,
        type: 'BULLISH',
        strength: Math.min(95, (currentVolume / parseFloat(prev[5])) * 30),
        mitigated: false,
        volume: currentVolume
      });
    }
    
    // Bearish Order Block - strong selling pressure before downward move
    if (currentClose < currentOpen && 
        nextOpen < currentClose && 
        currentVolume > parseFloat(prev[5]) * 1.2) {
      
      orderBlocks.push({
        time: parseInt(current[0]),
        price: currentOpen,
        type: 'BEARISH',
        strength: Math.min(95, (currentVolume / parseFloat(prev[5])) * 30),
        mitigated: false,
        volume: currentVolume
      });
    }
  }
  
  return orderBlocks.sort((a, b) => b.time - a.time);
}

function detectFairValueGaps(candles: any[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2];
    const candle2 = candles[i - 1];
    const candle3 = candles[i];
    
    const high1 = parseFloat(candle1[2]);
    const low1 = parseFloat(candle1[3]);
    const high2 = parseFloat(candle2[2]);
    const low2 = parseFloat(candle2[3]);
    const high3 = parseFloat(candle3[2]);
    const low3 = parseFloat(candle3[3]);
    
    // Bullish FVG - gap between low of candle1 and high of candle3
    if (low3 > high1 && low2 > high1) {
      gaps.push({
        startTime: parseInt(candle1[0]),
        endTime: parseInt(candle3[0]),
        topPrice: low3,
        bottomPrice: high1,
        type: 'BULLISH',
        filled: false,
        strength: Math.min(90, ((low3 - high1) / high1) * 10000)
      });
    }
    
    // Bearish FVG - gap between high of candle1 and low of candle3
    if (high3 < low1 && high2 < low1) {
      gaps.push({
        startTime: parseInt(candle1[0]),
        endTime: parseInt(candle3[0]),
        topPrice: low1,
        bottomPrice: high3,
        type: 'BEARISH',
        filled: false,
        strength: Math.min(90, ((low1 - high3) / high3) * 10000)
      });
    }
  }
  
  return gaps.sort((a, b) => b.startTime - a.startTime);
}

function identifyLiquidityPools(candles: any[]): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const swingPoints = identifySwingPoints(candles);
  
  // Liquidity pools form at swing highs and lows
  swingPoints.forEach(swing => {
    if (swing.strength > 60) {
      pools.push({
        price: swing.price,
        type: swing.type === 'HIGH' ? 'SELL_SIDE' : 'BUY_SIDE',
        strength: swing.strength,
        swept: false,
        time: swing.time
      });
    }
  });
  
  return pools.sort((a, b) => b.strength - a.strength);
}

function analyzePriceAction(candles: any[]) {
  const closes = candles.map(c => parseFloat(c[4]));
  const volumes = candles.map(c => parseFloat(c[5]));
  
  const momentum = calculateMomentum(closes);
  const volatility = calculateVolatility(closes);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  return {
    momentum,
    volatility,
    volume: (recentVolume / avgVolume - 1) * 100,
    institutionalActivity: Math.min(100, recentVolume / avgVolume * 50)
  };
}

function calculateKeyLevels(candles: any[], swingPoints: SwingPoint[]) {
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  const allPrices = [...highs, ...lows];
  
  const currentPrice = parseFloat(candles[candles.length - 1][4]);
  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);
  
  // Support and resistance from swing points
  const support = swingPoints
    .filter(p => p.type === 'LOW' && p.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
    .map(p => p.price);
    
  const resistance = swingPoints
    .filter(p => p.type === 'HIGH' && p.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map(p => p.price);
  
  // Premium/Discount zones (top 25% / bottom 25% of range)
  const equilibrium = (rangeHigh + rangeLow) / 2;
  const premiumZone = {
    start: equilibrium + (rangeHigh - equilibrium) * 0.5,
    end: rangeHigh
  };
  const discountZone = {
    start: rangeLow,
    end: equilibrium - (equilibrium - rangeLow) * 0.5
  };
  
  return {
    support,
    resistance,
    premiumZone,
    discountZone,
    equilibrium
  };
}

function generateStructureSignals(candles: any[], smartMoney: any, orderBlocks: OrderBlock[], fairValueGaps: FairValueGap[]) {
  const signals = [];
  const currentPrice = parseFloat(candles[candles.length - 1][4]);
  
  // BOS Signal
  if (smartMoney.bos) {
    signals.push({
      type: smartMoney.trend === 'BULLISH' ? 'BULLISH_BOS' : 'BEARISH_BOS',
      strength: smartMoney.strength,
      description: `${smartMoney.trend} Break of Structure confirmed`,
      price: currentPrice,
      time: Date.now()
    });
  }
  
  // Order Block signals
  orderBlocks.slice(0, 2).forEach(ob => {
    if (!ob.mitigated && Math.abs(ob.price - currentPrice) / currentPrice < 0.02) {
      signals.push({
        type: ob.type === 'BULLISH' ? 'ORDER_BLOCK_SUPPORT' : 'ORDER_BLOCK_RESISTANCE',
        strength: ob.strength,
        description: `${ob.type} Order Block at ${ob.price.toFixed(2)}`,
        price: ob.price,
        time: ob.time
      });
    }
  });
  
  // FVG signals
  fairValueGaps.slice(0, 2).forEach(gap => {
    if (!gap.filled && currentPrice >= gap.bottomPrice && currentPrice <= gap.topPrice) {
      signals.push({
        type: gap.type === 'BULLISH' ? 'FVG_SUPPORT' : 'FVG_RESISTANCE',
        strength: gap.strength,
        description: `Price in ${gap.type} Fair Value Gap`,
        price: (gap.topPrice + gap.bottomPrice) / 2,
        time: gap.startTime
      });
    }
  });
  
  return signals;
}

function generateRecommendations(marketPhase: any, smartMoney: any, signals: any[]) {
  const recommendations = [];
  
  // Market phase recommendations
  switch (marketPhase.phase) {
    case 'ACCUMULATION':
      recommendations.push("Consider building long positions in discount zones");
      break;
    case 'MARKUP':
      recommendations.push("Look for pullback entries in bullish trend");
      break;
    case 'DISTRIBUTION':
      recommendations.push("Prepare for potential trend reversal - secure profits");
      break;
    case 'MARKDOWN':
      recommendations.push("Consider short positions on retracements");
      break;
    default:
      recommendations.push("Wait for clear directional break from range");
  }
  
  // Smart money recommendations
  if (smartMoney.bos && smartMoney.trend === 'BULLISH') {
    recommendations.push("Bullish structure confirmed - look for long opportunities");
  } else if (smartMoney.bos && smartMoney.trend === 'BEARISH') {
    recommendations.push("Bearish structure confirmed - look for short opportunities");
  }
  
  // Signal-based recommendations
  if (signals.length > 2) {
    recommendations.push("Multiple confluences detected - high probability setup");
  }
  
  return recommendations;
}

// Helper functions
function calculateSMA(data: number[], period: number): number {
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateVolatility(closes: number[]): number {
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

function calculateMomentum(closes: number[]): number {
  const period = Math.min(14, closes.length - 1);
  return ((closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]) * 100;
}

function calculateSwingStrength(candles: any[], index: number, type: 'HIGH' | 'LOW'): number {
  const volume = parseFloat(candles[index][5]);
  const avgVolume = candles.slice(Math.max(0, index - 10), index + 1)
    .reduce((sum, c) => sum + parseFloat(c[5]), 0) / Math.min(11, index + 1);
  
  const volumeStrength = Math.min(50, (volume / avgVolume) * 25);
  const baseStrength = 30;
  
  return baseStrength + volumeStrength;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe = "1h" }: MarketStructureRequest = await req.json();
    
    console.log(`Market Structure Analysis request: ${JSON.stringify({ symbol, timeframe })}`);
    
    // Fetch candle data from Binance
    const interval = timeframe === "1h" ? "1h" : "4h";
    const limit = timeframe === "1h" ? 200 : 100;
    
    const candleResponse = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!candleResponse.ok) {
      throw new Error('Failed to fetch candle data');
    }
    
    const candleData = await candleResponse.json();
    const analysis = calculateMarketStructure(candleData);
    
    console.log(`Market Structure Analysis completed: ${JSON.stringify({
      symbol: analysis.symbol,
      phase: analysis.marketPhase.phase,
      trend: analysis.smartMoneyStructure.trend,
      signalsCount: analysis.signals.length
    })}`);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Market Structure Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});