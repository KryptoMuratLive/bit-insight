import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskParameters {
  symbol: string;
  equity: number;
  riskPercent: number;
  leverage: number;
  side: 'LONG' | 'SHORT';
  stopType: 'ATR' | 'FIXED' | 'SUPPORT_RESISTANCE';
  atrMultiplier?: number;
  fixedStopPercent?: number;
}

interface PositionCalculation {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  leveragedSize: number;
  marginRequired: number;
  maxLoss: number;
  maxProfit: number;
  riskReward: number;
  roi: number;
}

interface PortfolioRisk {
  totalRisk: number;
  correlatedRisk: number;
  diversificationRatio: number;
  maxDrawdown: number;
  sharpeRatio: number;
  riskAdjustedReturn: number;
}

interface RiskWarning {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendation: string;
}

interface RiskAnalysis {
  positionCalculation: PositionCalculation;
  portfolioRisk: PortfolioRisk;
  marketRisk: {
    volatility: number;
    liquidityRisk: number;
    correlationRisk: number;
    leverageRisk: number;
  };
  optimalSizing: {
    kellyPercent: number;
    maxSafeSize: number;
    recommendedSize: number;
    confidence: number;
  };
  riskWarnings: RiskWarning[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: RiskParameters = await req.json();
    
    console.log('Risk Management request:', params);

    // Fetch market data for risk calculations
    const [klinesResponse, tickerResponse] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${params.symbol}&interval=1h&limit=100`),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${params.symbol}`)
    ]);

    if (!klinesResponse.ok || !tickerResponse.ok) {
      throw new Error('Failed to fetch market data');
    }

    const klines = await klinesResponse.json();
    const ticker = await tickerResponse.json();
    
    const candles = klines.map((k: any) => ({
      t: parseInt(k[0]),
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5])
    }));

    const currentPrice = parseFloat(ticker.lastPrice);
    const volume24h = parseFloat(ticker.volume);
    
    // Calculate ATR for volatility-based stops
    const calculateATR = (candles: any[], period = 14) => {
      const trueRanges = [];
      for (let i = 1; i < candles.length; i++) {
        const high = candles[i].h;
        const low = candles[i].l;
        const prevClose = candles[i - 1].c;
        
        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
      }
      
      return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    };

    // Find support/resistance levels
    const findSupportResistance = (candles: any[]) => {
      const highs = [];
      const lows = [];
      
      for (let i = 2; i < candles.length - 2; i++) {
        const current = candles[i];
        const isHigh = candles.slice(i - 2, i).every(c => c.h < current.h) &&
                      candles.slice(i + 1, i + 3).every(c => c.h < current.h);
        const isLow = candles.slice(i - 2, i).every(c => c.l > current.l) &&
                     candles.slice(i + 1, i + 3).every(c => c.l > current.l);
        
        if (isHigh) highs.push(current.h);
        if (isLow) lows.push(current.l);
      }
      
      return { support: lows.slice(-3), resistance: highs.slice(-3) };
    };

    const atr = calculateATR(candles);
    const { support, resistance } = findSupportResistance(candles);
    
    // Calculate volatility
    const returns = candles.slice(1).map((c, i) => Math.log(c.c / candles[i].c));
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(365) * 100;

    // Position Calculation
    let stopLossDistance: number;
    let stopLossPrice: number;

    switch (params.stopType) {
      case 'ATR':
        stopLossDistance = atr * (params.atrMultiplier || 2);
        break;
      case 'FIXED':
        stopLossDistance = currentPrice * (params.fixedStopPercent || 3) / 100;
        break;
      case 'SUPPORT_RESISTANCE':
        if (params.side === 'LONG') {
          const nearestSupport = support.filter(s => s < currentPrice).sort((a, b) => b - a)[0];
          stopLossDistance = nearestSupport ? currentPrice - nearestSupport : atr * 2;
        } else {
          const nearestResistance = resistance.filter(r => r > currentPrice).sort((a, b) => a - b)[0];
          stopLossDistance = nearestResistance ? nearestResistance - currentPrice : atr * 2;
        }
        break;
      default:
        stopLossDistance = atr * 2;
    }

    stopLossPrice = params.side === 'LONG' ? 
      currentPrice - stopLossDistance : 
      currentPrice + stopLossDistance;

    const takeProfitPrice = params.side === 'LONG' ?
      currentPrice + (stopLossDistance * 2) : // 2:1 R/R
      currentPrice - (stopLossDistance * 2);

    const riskAmount = params.equity * params.riskPercent / 100;
    const positionSize = riskAmount / stopLossDistance;
    const leveragedSize = positionSize * params.leverage;
    const marginRequired = (leveragedSize * currentPrice) / params.leverage;
    const maxLoss = riskAmount;
    const maxProfit = stopLossDistance * 2 * positionSize;
    const riskReward = 2; // Fixed 2:1 for this example
    const roi = (maxProfit / marginRequired) * 100;

    const positionCalculation: PositionCalculation = {
      entryPrice: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      positionSize,
      leveragedSize,
      marginRequired,
      maxLoss,
      maxProfit,
      riskReward,
      roi
    };

    // Portfolio Risk Analysis (simulated data)
    const correlatedPositions = [
      { symbol: params.symbol, risk: params.riskPercent, correlation: 1.0 },
      { symbol: 'ETHUSDT', risk: 1.5, correlation: 0.85 },
      { symbol: 'ADAUSDT', risk: 1.0, correlation: 0.65 }
    ];

    const totalRisk = correlatedPositions.reduce((sum, pos) => sum + pos.risk, 0);
    const correlatedRisk = correlatedPositions.reduce((sum, pos, i) => {
      const correlationEffect = correlatedPositions.slice(0, i).reduce((corr, prevPos) => 
        corr + (pos.risk * prevPos.risk * pos.correlation * 0.5), 0);
      return sum + correlationEffect;
    }, totalRisk);

    const diversificationRatio = totalRisk / Math.max(correlatedRisk, 0.1);
    const maxDrawdown = totalRisk * 1.5; // Estimated
    const sharpeRatio = 1.2; // Simulated
    const riskAdjustedReturn = roi / volatility;

    const portfolioRisk: PortfolioRisk = {
      totalRisk,
      correlatedRisk,
      diversificationRatio,
      maxDrawdown,
      sharpeRatio,
      riskAdjustedReturn
    };

    // Market Risk Assessment
    const liquidityRisk = volume24h < 1000000 ? 80 : volume24h < 10000000 ? 40 : 15;
    const correlationRisk = correlatedRisk > totalRisk * 0.8 ? 70 : 30;
    const leverageRisk = params.leverage > 10 ? (params.leverage - 10) * 8 : 0;

    // Kelly Criterion for optimal sizing
    const winRate = 0.6; // Assumed based on 2:1 R/R
    const avgWin = maxProfit;
    const avgLoss = maxLoss;
    const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const kellySize = Math.max(0, Math.min(kellyPercent * params.equity, params.equity * 0.1));

    const optimalSizing = {
      kellyPercent: kellyPercent * 100,
      maxSafeSize: params.equity * 0.05, // 5% max
      recommendedSize: Math.min(kellySize, params.equity * 0.03), // 3% recommended
      confidence: 75
    };

    // Risk Warnings
    const riskWarnings: RiskWarning[] = [];

    if (params.riskPercent > 5) {
      riskWarnings.push({
        level: 'HIGH',
        message: 'Risk per trade exceeds 5% - extremely dangerous',
        recommendation: 'Reduce risk to 1-2% maximum per trade'
      });
    }

    if (params.leverage > 20) {
      riskWarnings.push({
        level: 'CRITICAL',
        message: 'Excessive leverage detected',
        recommendation: 'Use maximum 10x leverage for crypto trading'
      });
    }

    if (totalRisk > 15) {
      riskWarnings.push({
        level: 'HIGH',
        message: 'Total portfolio risk exceeds safe limits',
        recommendation: 'Close some positions or reduce individual position sizes'
      });
    }

    if (liquidityRisk > 60) {
      riskWarnings.push({
        level: 'MEDIUM',
        message: 'Low liquidity detected - higher slippage risk',
        recommendation: 'Use limit orders and smaller position sizes'
      });
    }

    if (volatility > 100) {
      riskWarnings.push({
        level: 'HIGH',
        message: 'Extremely high volatility environment',
        recommendation: 'Reduce position sizes and widen stop losses'
      });
    }

    // Recommendations
    const recommendations = [];
    
    if (params.riskPercent > 2) {
      recommendations.push('Consider reducing risk per trade to 1-2% for better long-term survival');
    }
    
    if (marginRequired > params.equity * 0.2) {
      recommendations.push('Position size too large relative to account - risk of margin call');
    }
    
    if (riskReward < 1.5) {
      recommendations.push('Risk/Reward ratio too low - aim for minimum 1.5:1');
    }
    
    if (diversificationRatio < 0.7) {
      recommendations.push('Portfolio too concentrated - add uncorrelated assets');
    }

    recommendations.push(`Optimal position size based on Kelly Criterion: ${optimalSizing.recommendedSize.toFixed(2)} ${params.symbol.replace('USDT', '')}`);

    const analysis: RiskAnalysis = {
      positionCalculation,
      portfolioRisk,
      marketRisk: {
        volatility,
        liquidityRisk,
        correlationRisk,
        leverageRisk
      },
      optimalSizing,
      riskWarnings,
      recommendations
    };

    console.log('Risk Management Analysis completed:', {
      symbol: params.symbol,
      totalRisk: totalRisk.toFixed(1),
      warnings: riskWarnings.length,
      leverageRisk: leverageRisk.toFixed(0)
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in risk-management function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      positionCalculation: {
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        leveragedSize: 0,
        marginRequired: 0,
        maxLoss: 0,
        maxProfit: 0,
        riskReward: 0,
        roi: 0
      },
      portfolioRisk: {
        totalRisk: 0,
        correlatedRisk: 0,
        diversificationRatio: 1,
        maxDrawdown: 0,
        sharpeRatio: 0,
        riskAdjustedReturn: 0
      },
      marketRisk: {
        volatility: 0,
        liquidityRisk: 50,
        correlationRisk: 50,
        leverageRisk: 0
      },
      optimalSizing: {
        kellyPercent: 0,
        maxSafeSize: 0,
        recommendedSize: 0,
        confidence: 0
      },
      riskWarnings: [],
      recommendations: ['Analysis unavailable due to error']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});