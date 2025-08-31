import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimeFrameAnalysis {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
  adx: number;
  atr: number;
  ema_cross: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  support_resistance: number[];
  momentum: number;
}

interface OverallSignal {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  bullishScore: number;
  bearishScore: number;
  netScore: number;
}

interface MultiTimeframeData {
  symbol: string;
  timestamp: string;
  timeframes: TimeFrameAnalysis[];
  correlation: number;
  overallSignal: OverallSignal;
  confidence: number;
}

interface MultiTimeframeAnalysisProps {
  symbol: string;
}

export const MultiTimeframeAnalysis: React.FC<MultiTimeframeAnalysisProps> = ({ symbol }) => {
  const [data, setData] = useState<MultiTimeframeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: functionError } = await supabase.functions.invoke('multi-timeframe-analysis', {
        body: { symbol }
      });

      if (functionError) throw functionError;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
      console.error('Multi-timeframe analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchAnalysis();
    }
  }, [symbol]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BEARISH': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'BEARISH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 70) return 'text-green-600 dark:text-green-400';
    if (strength >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Multi-Timeframe Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Multi-Timeframe Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchAnalysis} variant="outline" size="sm">
              Retry Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Multi-Timeframe Analysis
          </div>
          <Button onClick={fetchAnalysis} variant="outline" size="sm">
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data && (
          <>
            {/* Overall Signal */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Overall Signal</h3>
                <Badge className={getTrendColor(data.overallSignal.direction)}>
                  {getTrendIcon(data.overallSignal.direction)}
                  {data.overallSignal.direction}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p className={`font-semibold ${getStrengthColor(data.confidence)}`}>
                    {data.confidence.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Correlation</p>
                  <p className={`font-semibold ${getStrengthColor(data.correlation)}`}>
                    {data.correlation.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bullish Score</p>
                  <p className="font-semibold text-green-600">
                    {data.overallSignal.bullishScore.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bearish Score</p>
                  <p className="font-semibold text-red-600">
                    {data.overallSignal.bearishScore.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeframe Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Timeframe Analysis
              </h3>
              
              {data.timeframes.map((tf, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tf.timeframe.toUpperCase()}</Badge>
                      <Badge className={getTrendColor(tf.trend)}>
                        {getTrendIcon(tf.trend)}
                        {tf.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Strength:</span>
                      <span className={`font-semibold ${getStrengthColor(tf.strength)}`}>
                        {tf.strength.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">ADX</p>
                      <p className="font-medium">{tf.adx.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ATR</p>
                      <p className="font-medium">{tf.atr.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">EMA Cross</p>
                      <Badge variant="outline" className="text-xs">
                        {tf.ema_cross}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Momentum</p>
                      <p className={`font-medium ${tf.momentum > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tf.momentum > 0 ? '+' : ''}{tf.momentum.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">S/R Levels</p>
                      <p className="font-medium">{tf.support_resistance.length}</p>
                    </div>
                  </div>
                  
                  {tf.support_resistance.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Key Levels:</p>
                      <div className="flex flex-wrap gap-1">
                        {tf.support_resistance.slice(0, 4).map((level, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {level.toFixed(2)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Trading Recommendation */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Trading Recommendation</h3>
              </div>
              
              <div className="text-sm space-y-2">
                <p>
                  <strong>Signal Strength:</strong> {data.confidence >= 70 ? 'Strong' : data.confidence >= 40 ? 'Moderate' : 'Weak'}
                </p>
                <p>
                  <strong>Timeframe Alignment:</strong> {data.correlation >= 80 ? 'Excellent' : data.correlation >= 60 ? 'Good' : 'Poor'}
                </p>
                <p className="text-muted-foreground">
                  {data.confidence >= 70 && data.correlation >= 60 
                    ? "High probability setup with good timeframe alignment. Consider position entry."
                    : data.confidence >= 40 
                    ? "Moderate setup. Wait for better confirmation or use smaller position size."
                    : "Low confidence signal. Avoid trading or wait for better setup."
                  }
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Last updated: {new Date(data.timestamp).toLocaleString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};