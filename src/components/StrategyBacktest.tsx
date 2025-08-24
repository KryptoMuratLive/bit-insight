import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  trades: Array<{
    date: string;
    side: "LONG" | "SHORT";
    entry: number;
    exit: number;
    pnl: number;
    r: number;
  }>;
}

interface StrategyBacktestProps {
  candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>;
}

export function StrategyBacktest({ candles }: StrategyBacktestProps) {
  const [strategy, setStrategy] = useState("ema_cross");
  const [lookback, setLookback] = useState(30); // days
  const [riskPerTrade, setRiskPerTrade] = useState(2); // %
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Helper functions for indicators
  const ema = (values: number[], period: number): number[] => {
    if(!values.length) return [];
    const k = 2 / (period + 1);
    const out: number[] = [];
    let prev = values[0];
    out.push(prev);
    for(let i=1;i<values.length;i++){ prev = values[i]*k + prev*(1-k); out.push(prev); }
    return out;
  };

  const rsi = (values: number[], period = 14): number[] => {
    const gains = [0];
    const losses = [0];
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      gains.push(Math.max(diff, 0));
      losses.push(Math.max(-diff, 0));
    }
    const avgG = ema(gains, period);
    const avgL = ema(losses, period);
    return avgG.map((g, i) => {
      const l = avgL[i] || 1e-8;
      const rs = g / l;
      return 100 - 100 / (1 + rs);
    });
  };

  const runBacktest = async () => {
    setRunning(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const backtestData = candles.slice(-lookback * 24); // Assuming hourly data
    if (backtestData.length < 50) {
      setRunning(false);
      return;
    }

    const closes = backtestData.map(c => c.c);
    const trades: BacktestResult['trades'] = [];
    let position: { side: "LONG" | "SHORT"; entry: number; index: number } | null = null;
    
    // Strategy implementations
    if (strategy === "ema_cross") {
      const ema20 = ema(closes, 20);
      const ema50 = ema(closes, 50);
      
      for (let i = 50; i < backtestData.length - 1; i++) {
        const currentPrice = closes[i];
        const prevEma20 = ema20[i - 1];
        const currEma20 = ema20[i];
        const prevEma50 = ema50[i - 1];
        const currEma50 = ema50[i];
        
        // Entry signals
        if (!position) {
          // Bullish crossover
          if (prevEma20 <= prevEma50 && currEma20 > currEma50) {
            position = { side: "LONG", entry: currentPrice, index: i };
          }
          // Bearish crossover
          else if (prevEma20 >= prevEma50 && currEma20 < currEma50) {
            position = { side: "SHORT", entry: currentPrice, index: i };
          }
        }
        // Exit signals
        else {
          let shouldExit = false;
          let exitPrice = currentPrice;
          
          if (position.side === "LONG" && prevEma20 >= prevEma50 && currEma20 < currEma50) {
            shouldExit = true;
          } else if (position.side === "SHORT" && prevEma20 <= prevEma50 && currEma20 > currEma50) {
            shouldExit = true;
          }
          
          if (shouldExit) {
            const pnl = position.side === "LONG" ? 
              exitPrice - position.entry : 
              position.entry - exitPrice;
            const pnlPercent = (pnl / position.entry) * 100;
            
            trades.push({
              date: new Date(backtestData[i].t).toLocaleDateString(),
              side: position.side,
              entry: position.entry,
              exit: exitPrice,
              pnl: pnlPercent,
              r: pnlPercent / riskPerTrade
            });
            
            position = null;
          }
        }
      }
    } else if (strategy === "rsi_mean_reversion") {
      const rsiValues = rsi(closes, 14);
      
      for (let i = 20; i < backtestData.length - 1; i++) {
        const currentPrice = closes[i];
        const currentRSI = rsiValues[i];
        
        if (!position) {
          if (currentRSI < 30) { // Oversold
            position = { side: "LONG", entry: currentPrice, index: i };
          } else if (currentRSI > 70) { // Overbought
            position = { side: "SHORT", entry: currentPrice, index: i };
          }
        } else {
          let shouldExit = false;
          
          if (position.side === "LONG" && currentRSI > 50) {
            shouldExit = true;
          } else if (position.side === "SHORT" && currentRSI < 50) {
            shouldExit = true;
          }
          
          if (shouldExit || i - position.index > 24) { // Max 24 hour hold
            const pnl = position.side === "LONG" ? 
              currentPrice - position.entry : 
              position.entry - currentPrice;
            const pnlPercent = (pnl / position.entry) * 100;
            
            trades.push({
              date: new Date(backtestData[i].t).toLocaleDateString(),
              side: position.side,
              entry: position.entry,
              exit: currentPrice,
              pnl: pnlPercent,
              r: pnlPercent / riskPerTrade
            });
            
            position = null;
          }
        }
      }
    }

    // Calculate performance metrics
    if (trades.length > 0) {
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      
      const winRate = (winningTrades.length / trades.length) * 100;
      const totalReturn = trades.reduce((sum, t) => sum + t.pnl, 0);
      
      const avgWin = winningTrades.length > 0 ? 
        winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? 
        Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
      
      const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
      const expectancy = ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss);
      
      // Calculate max drawdown
      let peak = 0;
      let maxDD = 0;
      let cumReturn = 0;
      
      trades.forEach(trade => {
        cumReturn += trade.pnl;
        if (cumReturn > peak) peak = cumReturn;
        const drawdown = peak - cumReturn;
        if (drawdown > maxDD) maxDD = drawdown;
      });
      
      // Simple Sharpe ratio calculation (assuming daily returns)
      const returns = trades.map(t => t.pnl);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
      
      setResult({
        totalTrades: trades.length,
        winRate,
        totalReturn,
        maxDrawdown: maxDD,
        sharpeRatio,
        profitFactor,
        avgWin,
        avgLoss,
        expectancy,
        trades: trades.slice(-10) // Last 10 trades
      });
    }
    
    setRunning(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Strategy Backtesting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy Configuration */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ema_cross">EMA Crossover</SelectItem>
                  <SelectItem value="rsi_mean_reversion">RSI Mean Reversion</SelectItem>
                  <SelectItem value="precision_gate">Precision Gate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Lookback (days)</Label>
              <Input
                type="number"
                value={lookback}
                onChange={(e) => setLookback(Number(e.target.value))}
                className="h-8"
                min="7"
                max="90"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Risk per Trade (%)</Label>
            <Input
              type="number"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              className="h-8"
              min="0.5"
              max="10"
              step="0.5"
            />
          </div>
          
          <Button 
            onClick={runBacktest} 
            disabled={running || candles.length < 100}
            className="w-full"
            size="sm"
          >
            {running ? "Running Backtest..." : "Run Backtest"}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="text-xs font-medium">Backtest Results</div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Total Return</div>
                <div className={result.totalReturn >= 0 ? "text-green-500" : "text-red-500"}>
                  {result.totalReturn.toFixed(2)}%
                </div>
              </div>
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Win Rate</div>
                <div>{result.winRate.toFixed(1)}%</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Sharpe Ratio</div>
                <div>{result.sharpeRatio.toFixed(2)}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Max Drawdown</div>
                <div className="text-red-500">{result.maxDrawdown.toFixed(2)}%</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Profit Factor</div>
                <div>{result.profitFactor.toFixed(2)}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-muted-foreground">Total Trades</div>
                <div>{result.totalTrades}</div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="border rounded p-3 space-y-2">
              <div className="text-xs font-medium">Performance Summary</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Avg Win: <span className="text-green-500">{result.avgWin.toFixed(2)}%</span></div>
                <div>Avg Loss: <span className="text-red-500">{result.avgLoss.toFixed(2)}%</span></div>
                <div>Expectancy: <span className={result.expectancy >= 0 ? "text-green-500" : "text-red-500"}>{result.expectancy.toFixed(2)}%</span></div>
                <div>
                  Rating: <Badge variant={
                    result.sharpeRatio > 1.5 ? "default" : 
                    result.sharpeRatio > 1 ? "secondary" : 
                    "destructive"
                  }>
                    {result.sharpeRatio > 1.5 ? "Excellent" : result.sharpeRatio > 1 ? "Good" : "Poor"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="space-y-2">
              <div className="text-xs font-medium">Recent Trades</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.trades.map((trade, i) => (
                  <div key={i} className="flex items-center justify-between p-1 border rounded text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.side === "LONG" ? "default" : "destructive"}>
                        {trade.side}
                      </Badge>
                      <span className="text-muted-foreground">{trade.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                        {trade.pnl.toFixed(2)}%
                      </span>
                      <span className="text-muted-foreground">
                        {trade.r.toFixed(1)}R
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {candles.length < 100 && (
          <div className="text-xs text-muted-foreground text-center">
            Need more data for backtesting
          </div>
        )}
      </CardContent>
    </Card>
  );
}