import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client for calling other functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AnalysisWeight {
  multiTimeframe: number;
  patternRecognition: number;
  volumeProfile: number;
  orderFlow: number;
  riskManagement: number;
  precisionGate: number;
  marketStructure: number;
}

interface AggregatedSignal {
  symbol: string;
  timestamp: string;
  finalScore: number;
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  breakdown: {
    multiTimeframe: { score: number; weight: number; signal: string };
    patternRecognition: { score: number; weight: number; signal: string };
    volumeProfile: { score: number; weight: number; signal: string };
    orderFlow: { score: number; weight: number; signal: string };
    riskManagement: { score: number; weight: number; signal: string };
    precisionGate: { score: number; weight: number; signal: string };
    marketStructure: { score: number; weight: number; signal: string };
  };
  alerts: string[];
  keyLevels: {
    support: number[];
    resistance: number[];
    poc: number;
    valueAreaHigh: number;
    valueAreaLow: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe = "1h", equity = 10000, riskPercent = 2 } = await req.json();
    
    console.log('Signal Aggregation request:', { symbol, timeframe, equity, riskPercent });

    // Default weights for different analysis types
    const weights: AnalysisWeight = {
      multiTimeframe: 0.25,
      patternRecognition: 0.20,
      volumeProfile: 0.15,
      orderFlow: 0.15,
      riskManagement: 0.10,
      precisionGate: 0.10,
      marketStructure: 0.05
    };

    // Call all analysis functions in parallel
    const [
      multiTimeframeResult,
      patternResult,
      volumeResult,
      orderFlowResult,
      riskResult,
      precisionResult,
      marketStructureResult
    ] = await Promise.allSettled([
      supabase.functions.invoke('multi-timeframe-analysis', { body: { symbol } }),
      supabase.functions.invoke('pattern-recognition', { body: { symbol, timeframe } }),
      supabase.functions.invoke('volume-profile-analysis', { body: { symbol, timeframe } }),
      supabase.functions.invoke('order-flow-analysis', { body: { symbol, timeframe } }),
      supabase.functions.invoke('risk-management', { body: { symbol, equity, riskPercent, leverage: 1, side: "LONG", stopType: "ATR", atrMultiplier: 2 } }),
      supabase.functions.invoke('precision-gate-analysis', { body: { symbol, timeframe } }),
      supabase.functions.invoke('market-structure-analysis', { body: { symbol, timeframe } })
    ]);

    // Extract scores and convert signals to numerical values
    const breakdown = {
      multiTimeframe: extractMultiTimeframeScore(multiTimeframeResult),
      patternRecognition: extractPatternScore(patternResult),
      volumeProfile: extractVolumeScore(volumeResult),
      orderFlow: extractOrderFlowScore(orderFlowResult),
      riskManagement: extractRiskScore(riskResult),
      precisionGate: extractPrecisionScore(precisionResult),
      marketStructure: extractMarketStructureScore(marketStructureResult)
    };

    // Calculate weighted final score (-100 to +100)
    let finalScore = 0;
    let totalWeight = 0;
    
    Object.entries(breakdown).forEach(([key, data]) => {
      if (data.score !== null) {
        const weight = weights[key as keyof AnalysisWeight];
        finalScore += data.score * weight;
        totalWeight += weight;
      }
    });

    finalScore = totalWeight > 0 ? finalScore / totalWeight * 100 : 0;

    // Calculate confidence based on agreement between signals
    const confidence = calculateConfidence(breakdown);

    // Determine direction and strength
    const direction = finalScore > 10 ? 'BULLISH' : finalScore < -10 ? 'BEARISH' : 'NEUTRAL';
    const strength = getStrength(Math.abs(finalScore));
    const riskLevel = getRiskLevel(breakdown.riskManagement, confidence);

    // Get current price for calculations
    const currentPrice = await getCurrentPrice(symbol);
    
    // Extract key levels from volume profile
    const keyLevels = extractKeyLevels(volumeResult, patternResult);

    // Generate recommendation and alerts
    const { recommendation, alerts } = generateRecommendation(finalScore, confidence, strength, riskLevel, breakdown);

    // Calculate position sizing and levels
    const { entryPrice, stopLoss, takeProfit, positionSize } = calculatePositionDetails(
      currentPrice, direction, finalScore, equity, riskPercent, keyLevels
    );

    const result: AggregatedSignal = {
      symbol,
      timestamp: new Date().toISOString(),
      finalScore: Math.round(finalScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      direction,
      strength,
      riskLevel,
      recommendation,
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      breakdown,
      alerts,
      keyLevels
    };

    console.log('Signal Aggregation completed:', {
      symbol,
      finalScore: result.finalScore,
      confidence: result.confidence,
      direction: result.direction,
      strength: result.strength
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in signal-aggregation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      finalScore: 0,
      confidence: 0,
      direction: 'NEUTRAL',
      recommendation: 'Error occurred during analysis'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for extracting scores from each analysis
function extractMultiTimeframeScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  let score = 0;
  
  if (data.overallSignal?.direction === 'BULLISH') score = data.overallSignal.score || 0.5;
  else if (data.overallSignal?.direction === 'BEARISH') score = -(data.overallSignal.score || 0.5);
  else score = 0;
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.25,
    signal: data.overallSignal?.direction || 'NEUTRAL'
  };
}

function extractPatternScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  let score = 0;
  
  if (data.overallSignal?.direction === 'BULLISH') score = (data.overallSignal.strength || 50) / 100;
  else if (data.overallSignal?.direction === 'BEARISH') score = -((data.overallSignal.strength || 50) / 100);
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.20,
    signal: data.overallSignal?.direction || 'NEUTRAL'
  };
}

function extractVolumeScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  // Volume profile gives market structure insights
  const score = (data.confidence || 50) / 100 - 0.5; // Convert to -0.5 to +0.5 range
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.15,
    signal: score > 0 ? 'BULLISH' : score < 0 ? 'BEARISH' : 'NEUTRAL'
  };
}

function extractOrderFlowScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  let score = 0;
  
  if (data.marketMicrostructure?.sentiment === 'BULLISH') score = 0.6;
  else if (data.marketMicrostructure?.sentiment === 'BEARISH') score = -0.6;
  
  // Adjust based on volume imbalance
  if (data.riskMetrics?.volumeImbalance) {
    score += Math.max(-0.4, Math.min(0.4, data.riskMetrics.volumeImbalance / 100));
  }
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.15,
    signal: data.marketMicrostructure?.sentiment || 'NEUTRAL'
  };
}

function extractRiskScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  // Risk management affects position sizing, not direction
  const riskLevel = data.portfolioRisk?.totalRisk || 5;
  const score = Math.max(-1, Math.min(1, (5 - riskLevel) / 5)); // Lower risk = higher score
  
  return {
    score,
    weight: 0.10,
    signal: riskLevel < 3 ? 'LOW_RISK' : riskLevel > 7 ? 'HIGH_RISK' : 'MEDIUM_RISK'
  };
}

function extractPrecisionScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  let score = 0;
  
  if (data.gateStatus === 'GO') {
    score = (data.confidence || 50) / 100;
    if (data.side === 'SHORT') score = -score;
  }
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.10,
    signal: data.gateStatus || 'NO'
  };
}

function extractMarketStructureScore(result: any) {
  if (result.status !== 'fulfilled' || !result.value?.data) {
    return { score: null, weight: 0, signal: 'ERROR' };
  }
  
  const data = result.value.data;
  let score = 0;
  
  if (data.overallBias === 'BULLISH') score = (data.confidence || 50) / 100;
  else if (data.overallBias === 'BEARISH') score = -((data.confidence || 50) / 100);
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.05,
    signal: data.overallBias || 'NEUTRAL'
  };
}

function calculateConfidence(breakdown: any): number {
  const scores = Object.values(breakdown).map((item: any) => item.score).filter(s => s !== null);
  if (scores.length === 0) return 0;
  
  // Calculate agreement between signals
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const agreement = Math.max(0, 1 - variance);
  
  return Math.min(100, agreement * 100);
}

function getStrength(absScore: number): 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' {
  if (absScore < 20) return 'WEAK';
  if (absScore < 50) return 'MODERATE';
  if (absScore < 80) return 'STRONG';
  return 'VERY_STRONG';
}

function getRiskLevel(riskData: any, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!riskData.score || confidence < 30) return 'CRITICAL';
  if (riskData.score < 0.3) return 'HIGH';
  if (riskData.score < 0.7) return 'MEDIUM';
  return 'LOW';
}

async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error('Error fetching current price:', error);
    return 0;
  }
}

function extractKeyLevels(volumeResult: any, patternResult: any) {
  const levels = {
    support: [] as number[],
    resistance: [] as number[],
    poc: 0,
    valueAreaHigh: 0,
    valueAreaLow: 0
  };
  
  // Extract from volume profile
  if (volumeResult.status === 'fulfilled' && volumeResult.value?.data) {
    const vData = volumeResult.value.data;
    levels.poc = vData.pocLevel?.price || 0;
    levels.valueAreaHigh = vData.valueAreaHigh || 0;
    levels.valueAreaLow = vData.valueAreaLow || 0;
  }
  
  // Extract from pattern recognition
  if (patternResult.status === 'fulfilled' && patternResult.value?.data) {
    const pData = patternResult.value.data;
    levels.support = pData.technicalLevels?.support || [];
    levels.resistance = pData.technicalLevels?.resistance || [];
  }
  
  return levels;
}

function generateRecommendation(finalScore: number, confidence: number, strength: string, riskLevel: string, breakdown: any) {
  const alerts: string[] = [];
  let recommendation = '';
  
  // Risk alerts
  if (riskLevel === 'CRITICAL') alerts.push('🚨 CRITICAL RISK - Avoid trading');
  if (riskLevel === 'HIGH') alerts.push('⚠️ HIGH RISK - Use reduced position size');
  if (confidence < 30) alerts.push('📊 LOW CONFIDENCE - Wait for better setup');
  
  // Signal quality alerts
  if (strength === 'VERY_STRONG' && confidence > 70) {
    alerts.push('🎯 HIGH PROBABILITY SETUP');
  }
  
  // Generate recommendation
  if (finalScore > 50 && confidence > 60) {
    recommendation = 'STRONG BUY - Multiple signals align for bullish move';
  } else if (finalScore > 20 && confidence > 50) {
    recommendation = 'BUY - Moderate bullish signals, manage risk carefully';
  } else if (finalScore < -50 && confidence > 60) {
    recommendation = 'STRONG SELL - Multiple signals align for bearish move';
  } else if (finalScore < -20 && confidence > 50) {
    recommendation = 'SELL - Moderate bearish signals, manage risk carefully';
  } else if (confidence < 30) {
    recommendation = 'WAIT - Conflicting signals, avoid trading';
  } else {
    recommendation = 'NEUTRAL - No clear directional bias, range trading only';
  }
  
  return { recommendation, alerts };
}

function calculatePositionDetails(currentPrice: number, direction: string, finalScore: number, equity: number, riskPercent: number, keyLevels: any) {
  if (!currentPrice) {
    return { entryPrice: 0, stopLoss: 0, takeProfit: 0, positionSize: 0 };
  }
  
  const entryPrice = currentPrice;
  let stopLoss = 0;
  let takeProfit = 0;
  
  if (direction === 'BULLISH') {
    // Use nearest support for stop loss
    const nearestSupport = keyLevels.support
      .filter((level: number) => level < currentPrice)
      .sort((a: number, b: number) => b - a)[0];
    
    stopLoss = nearestSupport || currentPrice * 0.98; // 2% stop if no support found
    
    // Use nearest resistance for take profit
    const nearestResistance = keyLevels.resistance
      .filter((level: number) => level > currentPrice)
      .sort((a: number, b: number) => a - b)[0];
    
    takeProfit = nearestResistance || currentPrice * 1.04; // 4% target if no resistance found
    
  } else if (direction === 'BEARISH') {
    // Use nearest resistance for stop loss
    const nearestResistance = keyLevels.resistance
      .filter((level: number) => level > currentPrice)
      .sort((a: number, b: number) => a - b)[0];
    
    stopLoss = nearestResistance || currentPrice * 1.02; // 2% stop if no resistance found
    
    // Use nearest support for take profit
    const nearestSupport = keyLevels.support
      .filter((level: number) => level < currentPrice)
      .sort((a: number, b: number) => b - a)[0];
    
    takeProfit = nearestSupport || currentPrice * 0.96; // 4% target if no support found
  }
  
  // Calculate position size based on risk
  const riskAmount = equity * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  
  return {
    entryPrice: Math.round(entryPrice * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    positionSize: Math.round(positionSize * 10000) / 10000
  };
}