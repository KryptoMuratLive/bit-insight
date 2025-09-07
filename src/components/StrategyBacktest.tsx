import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategyType: 'EMA_CROSS' | 'RSI_OVERSOLD' | 'MACD_DIVERGENCE' | 'BOLLINGER_SQUEEZE';
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSize: number;
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

export function StrategyBacktest() {
  const [params, setParams] = useState<BacktestParams>({
    symbol: 'BTCUSDT',
    timeframe: '1h',
    strategyType: 'EMA_CROSS',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    positionSize: 10
  });
  
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-backtest', {
        body: params
      });

      if (error) throw error;
      
      setResults(data);
      toast.success('Backtest completed successfully');
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const formatDate = (timestamp: number) => 
    new Date(timestamp).toLocaleDateString();

  const getStrategyName = (strategy: string) => {
    const names = {
      'EMA_CROSS': 'EMA Crossover',
      'RSI_OVERSOLD': 'RSI Oversold/Overbought',
      'MACD_DIVERGENCE': 'MACD Signal Cross',
      'BOLLINGER_SQUEEZE': 'Bollinger Band Squeeze'
    };
    return names[strategy as keyof typeof names] || strategy;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategy Backtest
          </CardTitle>
          <CardDescription>
            Test trading strategies with historical data and analyze performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={params.symbol}
                onChange={(e) => setParams(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="BTCUSDT"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={params.timeframe} onValueChange={(value) => setParams(prev => ({ ...prev, timeframe: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={params.strategyType} onValueChange={(value: any) => setParams(prev => ({ ...prev, strategyType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMA_CROSS">EMA Crossover</SelectItem>
                  <SelectItem value="RSI_OVERSOLD">RSI Oversold/Overbought</SelectItem>
                  <SelectItem value="MACD_DIVERGENCE">MACD Signal Cross</SelectItem>
                  <SelectItem value="BOLLINGER_SQUEEZE">Bollinger Band Squeeze</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={params.startDate}
                onChange={(e) => setParams(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={params.endDate}
                onChange={(e) => setParams(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital ($)</Label>
              <Input
                id="capital"
                type="number"
                value={params.initialCapital}
                onChange={(e) => setParams(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="positionSize">Position Size (%)</Label>
              <Input
                id="positionSize"
                type="number"
                value={params.positionSize}
                onChange={(e) => setParams(prev => ({ ...prev, positionSize: Number(e.target.value) }))}
                min="1"
                max="100"
              />
            </div>
          </div>

          <Button onClick={runBacktest} disabled={loading} className="w-full">
            {loading ? 'Running Backtest...' : 'Run Backtest'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                {getStrategyName(results.strategy)} • {results.symbol} • {results.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(results.finalCapital)}
                  </div>
                  <div className="text-sm text-muted-foreground">Final Capital</div>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold ${results.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(results.totalReturnPercent)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Return</div>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatPercent(results.winRate)}
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {results.profitFactor.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Profit Factor</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Trading Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="font-medium">{results.totalTrades}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Winning Trades:</span>
                  <span className="font-medium text-green-600">{results.winningTrades}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Losing Trades:</span>
                  <span className="font-medium text-red-600">{results.losingTrades}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span>Average Win:</span>
                  <span className="font-medium text-green-600">{formatCurrency(results.averageWin)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Average Loss:</span>
                  <span className="font-medium text-red-600">{formatCurrency(results.averageLoss)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Largest Win:</span>
                  <span className="font-medium text-green-600">{formatCurrency(results.largestWin)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Largest Loss:</span>
                  <span className="font-medium text-red-600">{formatCurrency(results.largestLoss)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Sharpe Ratio:</span>
                  <span className="font-medium">{results.sharpeRatio.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Max Drawdown:</span>
                  <span className="font-medium text-red-600">{formatCurrency(results.maxDrawdown)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Max Drawdown %:</span>
                  <span className="font-medium text-red-600">{formatPercent(results.maxDrawdownPercent)}</span>
                </div>
                
                <Separator />
                
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Risk Assessment</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {results.maxDrawdownPercent > 20 ? 'High Risk: Consider reducing position size' :
                     results.maxDrawdownPercent > 10 ? 'Moderate Risk: Monitor closely' :
                     'Low Risk: Well-controlled risk profile'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
              <CardDescription>Portfolio value over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.equityCurve.map(point => ({
                    ...point,
                    date: formatDate(point.time)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'equity' ? formatCurrency(value as number) : formatPercent(value as number),
                        name === 'equity' ? 'Portfolio Value' : 'Drawdown'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Last 10 trades from the backtest</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.trades.slice(-10).reverse().map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.pnl >= 0 ? "default" : "destructive"}>
                        {trade.type}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(trade.entryTime)} → {formatDate(trade.exitTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(trade.pnl)}
                      </div>
                      <div className={`text-xs ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(trade.pnlPercent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}