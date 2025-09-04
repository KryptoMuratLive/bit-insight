import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrecisionGateRequest {
  symbol: string;
  timeframe?: string;
  entryType?: 'LONG' | 'SHORT' | 'BOTH';
}

interface IndicatorSignal {
  name: string;
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number;
  timeframe: string;
}

interface ConfluenceLevel {
  price: number;
  confluences: string[];
  strength: number;
  type: 'ENTRY' | 'EXIT' | 'INVALIDATION';
  direction: 'LONG' | 'SHORT';
}

interface TimingSignal {
  type: string;
  timeframe: string;
  strength: number;
  description: string;
  nextUpdate: number; // minutes until next signal update
}

interface PrecisionEntry {
  price: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  confidence: number;
  reasoning: string[];
  stopLoss: number;
  takeProfit: number[];
  riskReward: number;
  timeValidity: number; // minutes the entry is valid
}

interface PrecisionGateAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: string;
  
  overallGate: {
    status: 'OPEN' | 'CLOSED' | 'PARTIAL';
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    confidence: number;
    description: string;
  };
  
  multiTimeframeAlignment: {
    higher: { timeframe: string; bias: string; strength: number };
    current: { timeframe: string; bias: string; strength: number };
    lower: { timeframe: string; bias: string; strength: number };
    alignment: number; // 0-100% how aligned timeframes are
  };
  
  indicators: IndicatorSignal[];
  confluenceLevels: ConfluenceLevel[];
  timingSignals: TimingSignal[];
  
  precisionEntries: PrecisionEntry[];
  
  marketConditions: {
    volatility: number;
    volume: number;
    trend: string;
    momentum: number;
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  
  riskAssessment: {
    marketRisk: number;
    setupRisk: number;
    timeRisk: number;
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation: string;
  };
  
  timingAdvice: {
    optimal: boolean;
    reasonsToWait: string[];
    reasonsToEnter: string[];
    nextOptimalTime: string | null;
  };
  
  recommendations: string[];
}

function calculatePrecisionGate(candles: any[], symbol: string, timeframe: string): PrecisionGateAnalysis {
  const closes = candles.map(c => parseFloat(c[4]));
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  const volumes = candles.map(c => parseFloat(c[5]));
  const currentPrice = closes[closes.length - 1];
  
  // Calculate indicators
  const indicators = calculateIndicators(candles);
  
  // Multi-timeframe analysis simulation
  const multiTimeframeAlignment = calculateMultiTimeframeAlignment(candles);
  
  // Find confluence levels
  const confluenceLevels = findConfluenceLevels(candles, indicators);
  
  // Generate timing signals
  const timingSignals = generateTimingSignals(candles, indicators);
  
  // Determine overall gate status
  const overallGate = determineGateStatus(indicators, multiTimeframeAlignment, confluenceLevels);
  
  // Generate precision entries
  const precisionEntries = generatePrecisionEntries(candles, confluenceLevels, overallGate);
  
  // Market conditions assessment
  const marketConditions = assessMarketConditions(candles);
  
  // Risk assessment
  const riskAssessment = assessRisk(candles, overallGate, marketConditions);
  
  // Timing advice
  const timingAdvice = generateTimingAdvice(indicators, marketConditions, overallGate);
  
  // Recommendations
  const recommendations = generateRecommendations(overallGate, riskAssessment, timingAdvice);

  return {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    overallGate,
    multiTimeframeAlignment,
    indicators,
    confluenceLevels,
    timingSignals,
    precisionEntries,
    marketConditions,
    riskAssessment,
    timingAdvice,
    recommendations
  };
}

function calculateIndicators(candles: any[]): IndicatorSignal[] {
  const closes = candles.map(c => parseFloat(c[4]));
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  const volumes = candles.map(c => parseFloat(c[5]));
  
  const indicators: IndicatorSignal[] = [];
  
  // RSI
  const rsi = calculateRSI(closes, 14);
  indicators.push({
    name: 'RSI',
    value: rsi,
    signal: rsi > 70 ? 'SELL' : rsi < 30 ? 'BUY' : 'NEUTRAL',
    strength: rsi > 80 || rsi < 20 ? 90 : rsi > 70 || rsi < 30 ? 70 : 30,
    timeframe: '1h'
  });
  
  // MACD
  const macd = calculateMACD(closes);
  indicators.push({
    name: 'MACD',
    value: macd.histogram,
    signal: macd.histogram > 0 && macd.macd > macd.signal ? 'BUY' : 
            macd.histogram < 0 && macd.macd < macd.signal ? 'SELL' : 'NEUTRAL',
    strength: Math.abs(macd.histogram) > 100 ? 85 : Math.abs(macd.histogram) > 50 ? 65 : 40,
    timeframe: '1h'
  });
  
  // Moving Averages
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const currentPrice = closes[closes.length - 1];
  
  indicators.push({
    name: 'EMA_CROSS',
    value: ema21 - ema50,
    signal: ema21 > ema50 && currentPrice > ema21 ? 'BUY' : 
            ema21 < ema50 && currentPrice < ema21 ? 'SELL' : 'NEUTRAL',
    strength: Math.abs((ema21 - ema50) / ema50) > 0.02 ? 80 : 
              Math.abs((ema21 - ema50) / ema50) > 0.01 ? 60 : 40,
    timeframe: '1h'
  });
  
  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  indicators.push({
    name: 'BOLLINGER',
    value: (currentPrice - bb.middle) / (bb.upper - bb.lower),
    signal: currentPrice > bb.upper ? 'SELL' : currentPrice < bb.lower ? 'BUY' : 'NEUTRAL',
    strength: currentPrice > bb.upper || currentPrice < bb.lower ? 75 : 35,
    timeframe: '1h'
  });
  
  // Volume analysis
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  
  indicators.push({
    name: 'VOLUME',
    value: currentVolume / avgVolume,
    signal: currentVolume > avgVolume * 1.5 ? (closes[closes.length - 1] > closes[closes.length - 2] ? 'BUY' : 'SELL') : 'NEUTRAL',
    strength: currentVolume > avgVolume * 2 ? 90 : currentVolume > avgVolume * 1.5 ? 70 : 30,
    timeframe: '1h'
  });
  
  // ADX for trend strength
  const adx = calculateADX(highs, lows, closes, 14);
  indicators.push({
    name: 'ADX',
    value: adx,
    signal: adx > 25 ? (ema21 > ema50 ? 'BUY' : 'SELL') : 'NEUTRAL',
    strength: adx > 40 ? 85 : adx > 25 ? 65 : 30,
    timeframe: '1h'
  });
  
  return indicators;
}

function calculateMultiTimeframeAlignment(candles: any[]) {
  // Simulate multiple timeframe analysis
  const closes = candles.map(c => parseFloat(c[4]));
  
  // Higher timeframe (simulated)
  const higherTF = {
    timeframe: '4h',
    bias: calculateBias(closes.slice(-48)), // Last 48 hours for 4h simulation
    strength: 75
  };
  
  // Current timeframe
  const currentTF = {
    timeframe: '1h',
    bias: calculateBias(closes.slice(-12)), // Last 12 hours
    strength: 70
  };
  
  // Lower timeframe (simulated)
  const lowerTF = {
    timeframe: '15m',
    bias: calculateBias(closes.slice(-4)), // Last 4 hours for 15m simulation
    strength: 65
  };
  
  // Calculate alignment
  const biases = [higherTF.bias, currentTF.bias, lowerTF.bias];
  const bullishCount = biases.filter(b => b === 'BULLISH').length;
  const bearishCount = biases.filter(b => b === 'BEARISH').length;
  
  let alignment = 0;
  if (bullishCount === 3 || bearishCount === 3) alignment = 100;
  else if (bullishCount === 2 || bearishCount === 2) alignment = 66;
  else alignment = 33;
  
  return {
    higher: higherTF,
    current: currentTF,
    lower: lowerTF,
    alignment
  };
}

function findConfluenceLevels(candles: any[], indicators: IndicatorSignal[]): ConfluenceLevel[] {
  const closes = candles.map(c => parseFloat(c[4]));
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  const currentPrice = closes[closes.length - 1];
  
  const levels: ConfluenceLevel[] = [];
  
  // Support/Resistance levels
  const supports = findSupportLevels(lows);
  const resistances = findResistanceLevels(highs);
  
  // EMA levels
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  
  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  
  // Check for confluences at support levels
  supports.forEach(support => {
    const confluences = [];
    let strength = 40;
    
    if (Math.abs(support - ema21) / support < 0.005) {
      confluences.push('EMA21');
      strength += 20;
    }
    if (Math.abs(support - ema50) / support < 0.005) {
      confluences.push('EMA50');
      strength += 20;
    }
    if (Math.abs(support - bb.lower) / support < 0.005) {
      confluences.push('BB Lower');
      strength += 15;
    }
    
    // Check for RSI oversold
    const rsiIndicator = indicators.find(i => i.name === 'RSI');
    if (rsiIndicator && rsiIndicator.value < 35) {
      confluences.push('RSI Oversold');
      strength += 15;
    }
    
    if (confluences.length >= 2) {
      levels.push({
        price: support,
        confluences,
        strength: Math.min(95, strength),
        type: 'ENTRY',
        direction: 'LONG'
      });
    }
  });
  
  // Check for confluences at resistance levels
  resistances.forEach(resistance => {
    const confluences = [];
    let strength = 40;
    
    if (Math.abs(resistance - ema21) / resistance < 0.005) {
      confluences.push('EMA21');
      strength += 20;
    }
    if (Math.abs(resistance - ema50) / resistance < 0.005) {
      confluences.push('EMA50');
      strength += 20;
    }
    if (Math.abs(resistance - bb.upper) / resistance < 0.005) {
      confluences.push('BB Upper');
      strength += 15;
    }
    
    // Check for RSI overbought
    const rsiIndicator = indicators.find(i => i.name === 'RSI');
    if (rsiIndicator && rsiIndicator.value > 65) {
      confluences.push('RSI Overbought');
      strength += 15;
    }
    
    if (confluences.length >= 2) {
      levels.push({
        price: resistance,
        confluences,
        strength: Math.min(95, strength),
        type: 'ENTRY',
        direction: 'SHORT'
      });
    }
  });
  
  return levels.sort((a, b) => b.strength - a.strength);
}

function generateTimingSignals(candles: any[], indicators: IndicatorSignal[]): TimingSignal[] {
  const signals: TimingSignal[] = [];
  
  // MACD timing
  const macdIndicator = indicators.find(i => i.name === 'MACD');
  if (macdIndicator && macdIndicator.strength > 60) {
    signals.push({
      type: 'MACD_MOMENTUM',
      timeframe: '1h',
      strength: macdIndicator.strength,
      description: `MACD showing ${macdIndicator.signal} momentum`,
      nextUpdate: 60
    });
  }
  
  // RSI divergence timing
  const rsiIndicator = indicators.find(i => i.name === 'RSI');
  if (rsiIndicator && (rsiIndicator.value > 70 || rsiIndicator.value < 30)) {
    signals.push({
      type: 'RSI_EXTREME',
      timeframe: '1h',
      strength: rsiIndicator.strength,
      description: `RSI at ${rsiIndicator.value.toFixed(0)} - potential reversal zone`,
      nextUpdate: 60
    });
  }
  
  // Volume confirmation
  const volumeIndicator = indicators.find(i => i.name === 'VOLUME');
  if (volumeIndicator && volumeIndicator.strength > 70) {
    signals.push({
      type: 'VOLUME_CONFIRMATION',
      timeframe: '1h',
      strength: volumeIndicator.strength,
      description: 'High volume confirming price movement',
      nextUpdate: 60
    });
  }
  
  // Trend strength timing
  const adxIndicator = indicators.find(i => i.name === 'ADX');
  if (adxIndicator && adxIndicator.value > 25) {
    signals.push({
      type: 'TREND_STRENGTH',
      timeframe: '1h',
      strength: adxIndicator.strength,
      description: `Strong trend detected (ADX: ${adxIndicator.value.toFixed(0)})`,
      nextUpdate: 240
    });
  }
  
  return signals;
}

function determineGateStatus(
  indicators: IndicatorSignal[], 
  mtfAlignment: any, 
  confluenceLevels: ConfluenceLevel[]
) {
  const bullishSignals = indicators.filter(i => i.signal === 'BUY').length;
  const bearishSignals = indicators.filter(i => i.signal === 'SELL').length;
  const totalSignals = indicators.length;
  
  const bullishStrength = indicators.filter(i => i.signal === 'BUY').reduce((sum, i) => sum + i.strength, 0);
  const bearishStrength = indicators.filter(i => i.signal === 'SELL').reduce((sum, i) => sum + i.strength, 0);
  
  const longConfluences = confluenceLevels.filter(c => c.direction === 'LONG').length;
  const shortConfluences = confluenceLevels.filter(c => c.direction === 'SHORT').length;
  
  let status: 'OPEN' | 'CLOSED' | 'PARTIAL' = 'CLOSED';
  let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
  let confidence = 0;
  let description = '';
  
  // Calculate base confidence from indicators
  if (bullishSignals >= totalSignals * 0.7) {
    direction = 'LONG';
    confidence = (bullishStrength / (bullishSignals || 1)) * (bullishSignals / totalSignals);
  } else if (bearishSignals >= totalSignals * 0.7) {
    direction = 'SHORT';
    confidence = (bearishStrength / (bearishSignals || 1)) * (bearishSignals / totalSignals);
  } else if (bullishSignals > bearishSignals) {
    direction = 'LONG';
    confidence = 50;
  } else if (bearishSignals > bullishSignals) {
    direction = 'SHORT';
    confidence = 50;
  }
  
  // Adjust confidence based on MTF alignment
  confidence += (mtfAlignment.alignment / 100) * 20;
  
  // Adjust confidence based on confluences
  if (direction === 'LONG' && longConfluences > 0) {
    confidence += longConfluences * 10;
  } else if (direction === 'SHORT' && shortConfluences > 0) {
    confidence += shortConfluences * 10;
  }
  
  confidence = Math.min(95, Math.max(0, confidence));
  
  // Determine gate status
  if (confidence >= 75) {
    status = 'OPEN';
    description = `High probability ${direction} setup with ${confidence.toFixed(0)}% confidence`;
  } else if (confidence >= 50) {
    status = 'PARTIAL';
    description = `Moderate ${direction} bias with ${confidence.toFixed(0)}% confidence`;
  } else {
    status = 'CLOSED';
    description = 'No clear directional bias - wait for better setup';
  }
  
  return {
    status,
    direction,
    confidence,
    description
  };
}

function generatePrecisionEntries(
  candles: any[], 
  confluenceLevels: ConfluenceLevel[], 
  overallGate: any
): PrecisionEntry[] {
  if (overallGate.status === 'CLOSED') return [];
  
  const entries: PrecisionEntry[] = [];
  const currentPrice = parseFloat(candles[candles.length - 1][4]);
  const atr = calculateATR(candles, 14);
  
  confluenceLevels
    .filter(c => c.direction === overallGate.direction && c.strength > 60)
    .slice(0, 2)
    .forEach(confluence => {
      const isLong = confluence.direction === 'LONG';
      const distance = Math.abs(confluence.price - currentPrice) / currentPrice;
      
      let entryType: 'MARKET' | 'LIMIT' | 'STOP' = 'LIMIT';
      if (distance < 0.002) entryType = 'MARKET';
      else if (distance > 0.01) entryType = 'STOP';
      
      const stopLoss = isLong ? 
        confluence.price - (atr * 1.5) : 
        confluence.price + (atr * 1.5);
      
      const takeProfit = isLong ? [
        confluence.price + (atr * 2),
        confluence.price + (atr * 3),
        confluence.price + (atr * 4)
      ] : [
        confluence.price - (atr * 2),
        confluence.price - (atr * 3),
        confluence.price - (atr * 4)
      ];
      
      const riskReward = Math.abs((takeProfit[0] - confluence.price) / (confluence.price - stopLoss));
      
      entries.push({
        price: confluence.price,
        type: entryType,
        confidence: confluence.strength,
        reasoning: [
          `${confluence.confluences.length} confluences detected`,
          ...confluence.confluences.map(c => `- ${c}`),
          `${riskReward.toFixed(1)}:1 Risk/Reward ratio`
        ],
        stopLoss,
        takeProfit,
        riskReward,
        timeValidity: entryType === 'MARKET' ? 15 : 240 // minutes
      });
    });
  
  return entries.sort((a, b) => b.confidence - a.confidence);
}

function assessMarketConditions(candles: any[]) {
  const closes = candles.map(c => parseFloat(c[4]));
  const volumes = candles.map(c => parseFloat(c[5]));
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));
  
  const volatility = calculateVolatility(closes);
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const momentum = calculateMomentum(closes);
  
  // Trend analysis
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  let trend = 'SIDEWAYS';
  if (ema21 > ema50 * 1.01) trend = 'UPTREND';
  else if (ema21 < ema50 * 0.99) trend = 'DOWNTREND';
  
  // Liquidity assessment
  let liquidity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (currentVolume > avgVolume * 1.5) liquidity = 'HIGH';
  else if (currentVolume < avgVolume * 0.7) liquidity = 'LOW';
  
  return {
    volatility,
    volume: (currentVolume / avgVolume - 1) * 100,
    trend,
    momentum,
    liquidity
  };
}

function assessRisk(candles: any[], overallGate: any, marketConditions: any) {
  let marketRisk = 30;
  let setupRisk = 50;
  let timeRisk = 20;
  
  // Market risk factors
  if (marketConditions.volatility > 3) marketRisk += 30;
  if (marketConditions.liquidity === 'LOW') marketRisk += 20;
  if (marketConditions.trend === 'SIDEWAYS') marketRisk += 15;
  
  // Setup risk factors
  setupRisk = 100 - overallGate.confidence;
  
  // Time risk (news events, market open/close, etc.)
  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 6) timeRisk += 20; // Low liquidity hours
  
  const overallRisk = (marketRisk + setupRisk + timeRisk) / 3;
  
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (overallRisk < 30) riskLevel = 'LOW';
  else if (overallRisk > 60) riskLevel = 'HIGH';
  
  let recommendation = '';
  switch (riskLevel) {
    case 'LOW':
      recommendation = 'Favorable risk conditions - proceed with confidence';
      break;
    case 'MEDIUM':
      recommendation = 'Moderate risk - use proper position sizing';
      break;
    case 'HIGH':
      recommendation = 'High risk environment - consider reducing position size or waiting';
      break;
  }
  
  return {
    marketRisk,
    setupRisk,
    timeRisk,
    overallRisk: riskLevel,
    recommendation
  };
}

function generateTimingAdvice(indicators: IndicatorSignal[], marketConditions: any, overallGate: any) {
  const reasonsToWait: string[] = [];
  const reasonsToEnter: string[] = [];
  
  // Check timing factors
  if (marketConditions.volatility > 4) {
    reasonsToWait.push('High volatility - wait for calmer conditions');
  }
  
  if (marketConditions.liquidity === 'LOW') {
    reasonsToWait.push('Low liquidity - risk of slippage');
  }
  
  const volumeIndicator = indicators.find(i => i.name === 'VOLUME');
  if (volumeIndicator && volumeIndicator.strength > 70) {
    reasonsToEnter.push('Strong volume confirmation');
  }
  
  const rsiIndicator = indicators.find(i => i.name === 'RSI');
  if (rsiIndicator && rsiIndicator.signal !== 'NEUTRAL') {
    reasonsToEnter.push(`RSI showing ${rsiIndicator.signal} signal`);
  }
  
  if (overallGate.confidence > 75) {
    reasonsToEnter.push('High confidence setup');
  }
  
  const optimal = reasonsToEnter.length > reasonsToWait.length && overallGate.status === 'OPEN';
  
  let nextOptimalTime = null;
  if (!optimal && reasonsToWait.length > 0) {
    nextOptimalTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
  }
  
  return {
    optimal,
    reasonsToWait,
    reasonsToEnter,
    nextOptimalTime
  };
}

function generateRecommendations(overallGate: any, riskAssessment: any, timingAdvice: any): string[] {
  const recommendations = [];
  
  if (overallGate.status === 'OPEN') {
    recommendations.push(`${overallGate.direction} setup detected with ${overallGate.confidence.toFixed(0)}% confidence`);
  }
  
  if (riskAssessment.overallRisk === 'HIGH') {
    recommendations.push('Consider reducing position size due to elevated risk');
  }
  
  if (!timingAdvice.optimal) {
    recommendations.push('Wait for better timing before entering');
  } else {
    recommendations.push('Timing conditions favorable for entry');
  }
  
  if (overallGate.status === 'PARTIAL') {
    recommendations.push('Setup has moderate probability - wait for stronger confirmation');
  }
  
  if (overallGate.status === 'CLOSED') {
    recommendations.push('No clear setup - patience is key in trading');
  }
  
  return recommendations;
}

// Helper functions
function calculateBias(closes: number[]): string {
  const start = closes[0];
  const end = closes[closes.length - 1];
  const change = (end - start) / start;
  
  if (change > 0.02) return 'BULLISH';
  if (change < -0.02) return 'BEARISH';
  return 'NEUTRAL';
}

function findSupportLevels(lows: number[]): number[] {
  const supports = [];
  const lookback = 10;
  
  for (let i = lookback; i < lows.length - lookback; i++) {
    let isSupport = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && lows[j] <= lows[i]) {
        isSupport = false;
        break;
      }
    }
    if (isSupport) supports.push(lows[i]);
  }
  
  return supports.slice(-3); // Last 3 support levels
}

function findResistanceLevels(highs: number[]): number[] {
  const resistances = [];
  const lookback = 10;
  
  for (let i = lookback; i < highs.length - lookback; i++) {
    let isResistance = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && highs[j] >= highs[i]) {
        isResistance = false;
        break;
      }
    }
    if (isResistance) resistances.push(highs[i]);
  }
  
  return resistances.slice(-3); // Last 3 resistance levels
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  
  // Simplified signal line (normally EMA of MACD)
  const signal = macd * 0.9;
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = closes[0];
  
  for (let i = 1; i < closes.length; i++) {
    ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateBollingerBands(closes: number[], period: number, stdDev: number) {
  const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const variance = closes.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 20;
  
  // Simplified ADX calculation
  let totalTrueRange = 0;
  let totalDMPlus = 0;
  let totalDMMinus = 0;
  
  for (let i = 1; i <= period; i++) {
    const idx = highs.length - i;
    const tr = Math.max(
      highs[idx] - lows[idx],
      Math.abs(highs[idx] - closes[idx - 1]),
      Math.abs(lows[idx] - closes[idx - 1])
    );
    
    totalTrueRange += tr;
    
    const dmPlus = highs[idx] - highs[idx - 1] > lows[idx - 1] - lows[idx] ? 
                   Math.max(highs[idx] - highs[idx - 1], 0) : 0;
    const dmMinus = lows[idx - 1] - lows[idx] > highs[idx] - highs[idx - 1] ? 
                    Math.max(lows[idx - 1] - lows[idx], 0) : 0;
    
    totalDMPlus += dmPlus;
    totalDMMinus += dmMinus;
  }
  
  const avgTR = totalTrueRange / period;
  const diPlus = (totalDMPlus / period) / avgTR * 100;
  const diMinus = (totalDMMinus / period) / avgTR * 100;
  
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  return dx;
}

function calculateATR(candles: any[], period: number): number {
  if (candles.length < period + 1) return 100;
  
  let totalTR = 0;
  
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = parseFloat(candles[i][2]);
    const low = parseFloat(candles[i][3]);
    const prevClose = i > 0 ? parseFloat(candles[i-1][4]) : parseFloat(candles[i][1]);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    totalTR += tr;
  }
  
  return totalTR / period;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe = "1h", entryType = "BOTH" }: PrecisionGateRequest = await req.json();
    
    console.log(`Precision Gate Analysis request: ${JSON.stringify({ symbol, timeframe, entryType })}`);
    
    // Fetch candle data from Binance
    const interval = timeframe === "1h" ? "1h" : "15m";
    const limit = timeframe === "1h" ? 100 : 200;
    
    const candleResponse = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!candleResponse.ok) {
      throw new Error('Failed to fetch candle data');
    }
    
    const candleData = await candleResponse.json();
    const analysis = calculatePrecisionGate(candleData, symbol, timeframe);
    
    console.log(`Precision Gate Analysis completed: ${JSON.stringify({
      symbol: analysis.symbol,
      gateStatus: analysis.overallGate.status,
      confidence: analysis.overallGate.confidence,
      direction: analysis.overallGate.direction,
      entriesCount: analysis.precisionEntries.length
    })}`);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Precision Gate Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});