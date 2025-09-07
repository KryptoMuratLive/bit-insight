import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategyType: 'EMA_CROSS' | 'RSI_OVERSOLD' | 'MACD_DIVERGENCE' | 'BOLLINGER_SQUEEZE';
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
  
  return klineData.map((candle, i) => ({
    ...candle,
    ema12: calculateEMA(closes.slice(0, i + 1), 12),
    ema26: calculateEMA(closes.slice(0, i + 1), 26),
    rsi: calculateRSI(closes.slice(0, i + 1), 14),
    macd: calculateMACD(closes.slice(0, i + 1)),
    bb: calculateBollingerBands(closes.slice(0, i + 1), 20, 2)
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