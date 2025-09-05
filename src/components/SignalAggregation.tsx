import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoButton } from '@/components/ui/info-button';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  DollarSign,
  Shield,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';

interface SignalAggregationProps {
  symbol: string;
  timeframe?: string;
  equity?: number;
  riskPercent?: number;
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

export function SignalAggregation({ 
  symbol, 
  timeframe = "1h", 
  equity = 10000, 
  riskPercent = 2 
}: SignalAggregationProps) {
  const [data, setData] = useState<AggregatedSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregatedSignal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: supabaseError } = await supabase.functions.invoke(
        'signal-aggregation',
        {
          body: { symbol, timeframe, equity, riskPercent }
        }
      );

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error('Error fetching aggregated signal:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregatedSignal();
  }, [symbol, timeframe, equity, riskPercent]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'BEARISH': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return 'text-green-600 bg-green-50 border-green-200';
      case 'BEARISH': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'VERY_STRONG': return 'bg-purple-500';
      case 'STRONG': return 'bg-green-500';
      case 'MODERATE': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatPrice = (price: number) => {
    return price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  };

  const infoContent = {
    description: "Signal Aggregation combines all trading analyses into a unified score and recommendation.",
    howToRead: [
      "Final Score: Ranges from -100 (very bearish) to +100 (very bullish)",
      "Confidence: Higher values indicate stronger agreement between signals",
      "Strength: Shows the conviction level of the combined signal",
      "Risk Level: Considers market conditions and position sizing safety"
    ],
    tradingSignals: [
      "Score > 50 + High Confidence = Strong Buy Signal",
      "Score < -50 + High Confidence = Strong Sell Signal", 
      "Low Confidence = Wait for better setup",
      "Critical Risk = Avoid trading regardless of score"
    ],
    bestPractices: [
      "Wait for high confidence signals (>60%) before trading",
      "Consider risk level in position sizing decisions",
      "Use provided stop loss and take profit levels",
      "Monitor alerts for changing market conditions"
    ],
    riskWarning: "Aggregated signals can provide false confidence. Always validate with your own analysis and never risk more than you can afford to lose."
  };

  if (loading) {
    return (
      <Card className="trading-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Signal Aggregation
            </CardTitle>
            <InfoButton title="Signal Aggregation" content={infoContent} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="trading-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Signal Aggregation
            </CardTitle>
            <InfoButton title="Signal Aggregation" content={infoContent} />
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load aggregated signal'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchAggregatedSignal} 
            className="w-full mt-4"
            variant="outline"
          >
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Signal Card */}
      <Card className="trading-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Signal Aggregation
            </CardTitle>
            <InfoButton title="Signal Aggregation" content={infoContent} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="space-y-2">
              {data.alerts.map((alert, index) => (
                <Alert key={index} className="py-2">
                  <AlertDescription className="text-sm">{alert}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Main Signal Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className={`p-4 rounded-lg border ${getDirectionColor(data.direction)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Direction</span>
                  {getDirectionIcon(data.direction)}
                </div>
                <div className="text-2xl font-bold">{data.direction}</div>
                <div className="text-sm opacity-75">Score: {data.finalScore}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <div className="text-xl font-bold">{data.confidence}%</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Strength</div>
                  <Badge className={getStrengthColor(data.strength)}>{data.strength}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`p-4 rounded-lg ${getRiskColor(data.riskLevel)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Risk Level</span>
                </div>
                <div className="text-xl font-bold">{data.riskLevel}</div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                <div className="text-sm font-medium">{data.recommendation}</div>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Entry</div>
              <div className="font-bold">${formatPrice(data.entryPrice)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Stop Loss</div>
              <div className="font-bold text-red-600">${formatPrice(data.stopLoss)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Take Profit</div>
              <div className="font-bold text-green-600">${formatPrice(data.takeProfit)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Position Size</div>
              <div className="font-bold">{data.positionSize.toFixed(4)} BTC</div>
            </div>
          </div>

          <Button onClick={fetchAggregatedSignal} className="w-full" variant="outline">
            Refresh Analysis
          </Button>
        </CardContent>
      </Card>

      {/* Breakdown Card */}
      <Card className="trading-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Signal Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.breakdown).map(([key, breakdown]) => {
              if (breakdown.score === null) return null;
              
              const score = breakdown.score * 100;
              const isPositive = score > 0;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {breakdown.signal}
                      </Badge>
                      <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {score > 0 ? '+' : ''}{score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.abs(score)} 
                    className={`h-2 ${isPositive ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Levels Card */}
      <Card className="trading-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Key Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Support Levels</div>
              <div className="space-y-1">
                {data.keyLevels.support.slice(0, 3).map((level, index) => (
                  <div key={index} className="text-sm font-mono">
                    ${formatPrice(level)}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground mb-2">Volume Profile</div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">POC:</span> ${formatPrice(data.keyLevels.poc)}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">VA High:</span> ${formatPrice(data.keyLevels.valueAreaHigh)}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">VA Low:</span> ${formatPrice(data.keyLevels.valueAreaLow)}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground mb-2">Resistance Levels</div>
              <div className="space-y-1">
                {data.keyLevels.resistance.slice(0, 3).map((level, index) => (
                  <div key={index} className="text-sm font-mono">
                    ${formatPrice(level)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}