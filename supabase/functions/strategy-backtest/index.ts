import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategyType: 'EMA_CROSS' | 'RSI_OVERSOLD' | 'MACD_DIVERGENCE' | 'BOLLINGER_SQUEEZE' | 'SMA_CROSS' | 'STOCHASTIC_OVERSOLD' | 'WILLIAMS_R' | 'CCI_REVERSAL' | 'ICHIMOKU_CLOUD' | 'PARABOLIC_SAR' | 'VOLUME_BREAKOUT' | 'MOMENTUM_REVERSAL';
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSize: number; // Percentage of capital per trade
}

interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  pnl: number;
  pnlPercent: number;
  size: number;
}

interface BacktestResults {
  symbol: string;
  strategy: string;
  period: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  trades: Trade[];
  equityCurve: Array<{ time: number; equity: number; drawdown: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: BacktestParams = await req.json();
    console.log('Strategy Backtest request:', params);

    // Fetch historical data
    const klineData = await fetchHistoricalData(params.symbol, params.timeframe, params.startDate, params.endDate);
    
    if (!klineData || klineData.length < 100) {
      throw new Error('Insufficient historical data for backtest');
    }

    // Calculate technical indicators
    const technicalData = calculateTechnicalIndicators(klineData);
    
    // Generate trading signals based on strategy
    const signals = generateTradingSignals(technicalData, params.strategyType);
    
    // Execute backtest
    const results = executeBacktest(klineData, signals, params);

    console.log(`Strategy Backtest completed: {
      symbol: "${results.symbol}",
      strategy: "${results.strategy}",
      totalTrades: ${results.totalTrades},
      winRate: ${results.winRate.toFixed(1)}%,
      totalReturn: ${results.totalReturnPercent.toFixed(2)}%
    }`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in strategy-backtest function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchHistoricalData(symbol: string, interval: string, startDate: string, endDate: string) {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.map((candle: any[]) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}

function calculateTechnicalIndicators(klineData: any[]) {
  const closes = klineData.map(k => k.close);
  const highs = klineData.map(k => k.high);
  const lows = klineData.map(k => k.low);
  const volumes = klineData.map(k => k.volume);
  
  return klineData.map((candle, i) => ({
    ...candle,
    ema12: calculateEMA(closes.slice(0, i + 1), 12),
    ema26: calculateEMA(closes.slice(0, i + 1), 26),
    sma20: calculateSMA(closes.slice(0, i + 1), 20),
    sma50: calculateSMA(closes.slice(0, i + 1), 50),
    rsi: calculateRSI(closes.slice(0, i + 1), 14),
    macd: calculateMACD(closes.slice(0, i + 1)),
    bb: calculateBollingerBands(closes.slice(0, i + 1), 20, 2),
    stochastic: calculateStochastic(highs.slice(0, i + 1), lows.slice(0, i + 1), closes.slice(0, i + 1), 14),
    williamsR: calculateWilliamsR(highs.slice(0, i + 1), lows.slice(0, i + 1), closes.slice(0, i + 1), 14),
    cci: calculateCCI(highs.slice(0, i + 1), lows.slice(0, i + 1), closes.slice(0, i + 1), 20),
    ichimoku: calculateIchimoku(highs.slice(0, i + 1), lows.slice(0, i + 1), closes.slice(0, i + 1)),
    sar: calculateParabolicSAR(highs.slice(0, i + 1), lows.slice(0, i + 1), 0.02, 0.2),
    volumeAvg: calculateSMA(volumes.slice(0, i + 1), 20),
    momentum: calculateMomentum(closes.slice(0, i + 1), 10)
  }));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]) {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // Simple approximation for signal line
  const signal = macd * 0.8; // Simplified
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
  
  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((sum, price) => sum + price, 0) / period;
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number) {
  if (highs.length < period) return { k: 50, d: 50 };
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  const d = k * 0.8; // Simplified D calculation
  
  return { k, d };
}

function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period) return -50;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
}

function calculateCCI(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period) return 0;
  
  const typicalPrices = highs.map((high, i) => (high + lows[i] + closes[i]) / 3);
  const sma = calculateSMA(typicalPrices, period);
  const meanDeviation = typicalPrices.slice(-period).reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
  
  const currentTP = typicalPrices[typicalPrices.length - 1];
  return (currentTP - sma) / (0.015 * meanDeviation);
}

function calculateIchimoku(highs: number[], lows: number[], closes: number[]) {
  if (highs.length < 26) return { tenkanSen: 0, kijunSen: 0, senkouSpanA: 0, senkouSpanB: 0 };
  
  // Tenkan-sen (9-period)
  const tenkanHigh = Math.max(...highs.slice(-9));
  const tenkanLow = Math.min(...lows.slice(-9));
  const tenkanSen = (tenkanHigh + tenkanLow) / 2;
  
  // Kijun-sen (26-period)
  const kijunHigh = Math.max(...highs.slice(-26));
  const kijunLow = Math.min(...lows.slice(-26));
  const kijunSen = (kijunHigh + kijunLow) / 2;
  
  // Senkou Span A
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  
  // Senkou Span B (52-period)
  const spanBHigh = highs.length >= 52 ? Math.max(...highs.slice(-52)) : Math.max(...highs);
  const spanBLow = lows.length >= 52 ? Math.min(...lows.slice(-52)) : Math.min(...lows);
  const senkouSpanB = (spanBHigh + spanBLow) / 2;
  
  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB };
}

function calculateParabolicSAR(highs: number[], lows: number[], accelerationFactor: number, maxAF: number): number {
  if (highs.length < 2) return lows[lows.length - 1] || 0;
  
  // Simplified SAR calculation
  const currentHigh = highs[highs.length - 1];
  const currentLow = lows[lows.length - 1];
  const previousLow = lows[lows.length - 2];
  
  return previousLow + (accelerationFactor * (currentHigh - previousLow));
}

function calculateMomentum(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const previous = prices[prices.length - 1 - period];
  return ((current - previous) / previous) * 100;
}

function generateTradingSignals(technicalData: any[], strategyType: string) {
  const signals: Array<{ index: number; type: 'BUY' | 'SELL'; reason: string }> = [];
  
  for (let i = 1; i < technicalData.length; i++) {
    const current = technicalData[i];
    const previous = technicalData[i - 1];
    
    switch (strategyType) {
      case 'EMA_CROSS':
        // EMA 12/26 crossover strategy
        if (previous.ema12 <= previous.ema26 && current.ema12 > current.ema26) {
          signals.push({ index: i, type: 'BUY', reason: 'EMA Bullish Cross' });
        } else if (previous.ema12 >= previous.ema26 && current.ema12 < current.ema26) {
          signals.push({ index: i, type: 'SELL', reason: 'EMA Bearish Cross' });
        }
        break;
        
      case 'RSI_OVERSOLD':
        // RSI oversold/overbought strategy
        if (previous.rsi <= 30 && current.rsi > 30) {
          signals.push({ index: i, type: 'BUY', reason: 'RSI Oversold Recovery' });
        } else if (previous.rsi >= 70 && current.rsi < 70) {
          signals.push({ index: i, type: 'SELL', reason: 'RSI Overbought Reversal' });
        }
        break;
        
      case 'MACD_DIVERGENCE':
        // MACD signal line crossover
        if (previous.macd.macd <= previous.macd.signal && current.macd.macd > current.macd.signal) {
          signals.push({ index: i, type: 'BUY', reason: 'MACD Bullish Cross' });
        } else if (previous.macd.macd >= previous.macd.signal && current.macd.macd < current.macd.signal) {
          signals.push({ index: i, type: 'SELL', reason: 'MACD Bearish Cross' });
        }
        break;
        
        case 'BOLLINGER_SQUEEZE':
        // Bollinger Band squeeze strategy
        if (current.close <= current.bb.lower) {
          signals.push({ index: i, type: 'BUY', reason: 'Bollinger Lower Band Touch' });
        } else if (current.close >= current.bb.upper) {
          signals.push({ index: i, type: 'SELL', reason: 'Bollinger Upper Band Touch' });
        }
        break;
        
      case 'SMA_CROSS':
        // SMA 20/50 crossover strategy
        if (previous.sma20 <= previous.sma50 && current.sma20 > current.sma50) {
          signals.push({ index: i, type: 'BUY', reason: 'SMA Bullish Cross' });
        } else if (previous.sma20 >= previous.sma50 && current.sma20 < current.sma50) {
          signals.push({ index: i, type: 'SELL', reason: 'SMA Bearish Cross' });
        }
        break;
        
      case 'STOCHASTIC_OVERSOLD':
        // Stochastic oversold/overbought strategy
        if (previous.stochastic.k <= 20 && current.stochastic.k > 20) {
          signals.push({ index: i, type: 'BUY', reason: 'Stochastic Oversold Recovery' });
        } else if (previous.stochastic.k >= 80 && current.stochastic.k < 80) {
          signals.push({ index: i, type: 'SELL', reason: 'Stochastic Overbought Reversal' });
        }
        break;
        
      case 'WILLIAMS_R':
        // Williams %R strategy
        if (previous.williamsR <= -80 && current.williamsR > -80) {
          signals.push({ index: i, type: 'BUY', reason: 'Williams %R Oversold Recovery' });
        } else if (previous.williamsR >= -20 && current.williamsR < -20) {
          signals.push({ index: i, type: 'SELL', reason: 'Williams %R Overbought Reversal' });
        }
        break;
        
      case 'CCI_REVERSAL':
        // CCI reversal strategy
        if (previous.cci <= -100 && current.cci > -100) {
          signals.push({ index: i, type: 'BUY', reason: 'CCI Oversold Reversal' });
        } else if (previous.cci >= 100 && current.cci < 100) {
          signals.push({ index: i, type: 'SELL', reason: 'CCI Overbought Reversal' });
        }
        break;
        
      case 'ICHIMOKU_CLOUD':
        // Ichimoku cloud strategy
        if (current.close > current.ichimoku.senkouSpanA && current.close > current.ichimoku.senkouSpanB) {
          if (current.ichimoku.tenkanSen > current.ichimoku.kijunSen) {
            signals.push({ index: i, type: 'BUY', reason: 'Ichimoku Bullish Above Cloud' });
          }
        } else if (current.close < current.ichimoku.senkouSpanA && current.close < current.ichimoku.senkouSpanB) {
          if (current.ichimoku.tenkanSen < current.ichimoku.kijunSen) {
            signals.push({ index: i, type: 'SELL', reason: 'Ichimoku Bearish Below Cloud' });
          }
        }
        break;
        
      case 'PARABOLIC_SAR':
        // Parabolic SAR strategy
        if (current.close > current.sar && previous.close <= previous.sar) {
          signals.push({ index: i, type: 'BUY', reason: 'SAR Bullish Reversal' });
        } else if (current.close < current.sar && previous.close >= previous.sar) {
          signals.push({ index: i, type: 'SELL', reason: 'SAR Bearish Reversal' });
        }
        break;
        
      case 'VOLUME_BREAKOUT':
        // Volume breakout strategy
        if (current.volume > current.volumeAvg * 2 && current.close > previous.close) {
          signals.push({ index: i, type: 'BUY', reason: 'High Volume Bullish Breakout' });
        } else if (current.volume > current.volumeAvg * 2 && current.close < previous.close) {
          signals.push({ index: i, type: 'SELL', reason: 'High Volume Bearish Breakdown' });
        }
        break;
        
      case 'MOMENTUM_REVERSAL':
        // Momentum reversal strategy
        if (current.momentum > 5 && previous.momentum <= 0) {
          signals.push({ index: i, type: 'BUY', reason: 'Momentum Bullish Reversal' });
        } else if (current.momentum < -5 && previous.momentum >= 0) {
          signals.push({ index: i, type: 'SELL', reason: 'Momentum Bearish Reversal' });
        }
        break;
    }
  }
  
  return signals;
}

function executeBacktest(klineData: any[], signals: any[], params: BacktestParams): BacktestResults {
  let capital = params.initialCapital;
  let position = null;
  const trades: Trade[] = [];
  const equityCurve = [];
  let maxEquity = capital;
  let maxDrawdown = 0;
  
  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    const candle = klineData[signal.index];
    
    if (signal.type === 'BUY' && !position) {
      // Open long position
      const positionValue = capital * (params.positionSize / 100);
      const shares = positionValue / candle.close;
      
      position = {
        type: 'LONG',
        entryPrice: candle.close,
        entryTime: candle.time,
        shares: shares,
        entryValue: positionValue
      };
      
    } else if (signal.type === 'SELL' && position && position.type === 'LONG') {
      // Close long position
      const exitValue = position.shares * candle.close;
      const pnl = exitValue - position.entryValue;
      const pnlPercent = (pnl / position.entryValue) * 100;
      
      capital += pnl;
      
      trades.push({
        entryTime: position.entryTime,
        exitTime: candle.time,
        entryPrice: position.entryPrice,
        exitPrice: candle.close,
        type: 'LONG',
        pnl: pnl,
        pnlPercent: pnlPercent,
        size: position.entryValue
      });
      
      position = null;
    }
    
    // Update equity curve
    const currentEquity = position ? 
      capital + (position.shares * candle.close - position.entryValue) : 
      capital;
      
    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    
    const drawdown = maxEquity - currentEquity;
    const drawdownPercent = (drawdown / maxEquity) * 100;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    equityCurve.push({
      time: candle.time,
      equity: currentEquity,
      drawdown: drawdownPercent
    });
  }
  
  // Calculate performance metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const totalReturn = capital - params.initialCapital;
  const totalReturnPercent = (totalReturn / params.initialCapital) * 100;
  
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
  
  const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
  
  // Simplified Sharpe ratio calculation
  const returns = trades.map(t => t.pnlPercent);
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
  const returnStdDev = returns.length > 1 ? 
    Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 1;
  const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
  
  const maxDrawdownPercent = (maxDrawdown / params.initialCapital) * 100;
  
  return {
    symbol: params.symbol,
    strategy: params.strategyType,
    period: `${params.startDate} to ${params.endDate}`,
    initialCapital: params.initialCapital,
    finalCapital: capital,
    totalReturn: totalReturn,
    totalReturnPercent: totalReturnPercent,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: winRate,
    profitFactor: profitFactor,
    sharpeRatio: sharpeRatio,
    maxDrawdown: maxDrawdown,
    maxDrawdownPercent: maxDrawdownPercent,
    averageWin: averageWin,
    averageLoss: averageLoss,
    largestWin: largestWin,
    largestLoss: largestLoss,
    trades: trades,
    equityCurve: equityCurve
  };
}