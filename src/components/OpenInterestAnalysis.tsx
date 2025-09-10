import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Activity } from "lucide-react";

interface LiquidationCluster {
  price: number;
  volume: number;
  side: 'LONG' | 'SHORT';
  intensity: number;
}

interface OpenInterestData {
  symbol: string;
  timestamp: string;
  currentOI: {
    total: number;
    change24h: number;
    changePercent: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  liquidationClusters: LiquidationCluster[];
  divergences: Array<{
    type: string;
    strength: number;
    description: string;
  }>;
  institutionalSignals: Array<{
    signal: string;
    strength: number;
    description: string;
    recommendation: string;
  }>;
  keyLevels: {
    resistance: number[];
    support: number[];
    liquidationMagnets: number[];
  };
  sentiment: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    longShortRatio: number;
    fundingRate: number;
  };
  tradingSignals: Array<{
    signal: string;
    type: 'ENTRY' | 'EXIT' | 'WARNING';
    strength: number;
    price: number;
    reasoning: string;
  }>;
}

interface OpenInterestAnalysisProps {
  symbol?: string;
}

export function OpenInterestAnalysis({ symbol = "BTCUSDT" }: OpenInterestAnalysisProps) {
  const [data, setData] = useState<OpenInterestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpenInterestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: supabaseError } = await supabase.functions.invoke('open-interest-analysis', {
        body: { symbol, timeframe: '1h' }
      });

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Open Interest data');
      console.error('Open Interest analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenInterestData();
    const interval = setInterval(fetchOpenInterestData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [symbol]);

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return 'text-green-500';
      case 'BEARISH': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return <TrendingUp className="h-4 w-4" />;
      case 'BEARISH': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Open Interest Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading OI data...</div>
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
            <Target className="h-5 w-5" />
            Open Interest Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-4">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Open Interest Analysis - {data.symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="liquidations">Liquidations</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="levels">Key Levels</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Current OI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total OI</div>
                  <div className="text-2xl font-bold">{formatNumber(data.currentOI.total)}</div>
                  <div className={`text-sm flex items-center gap-1 ${
                    data.currentOI.changePercent > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {data.currentOI.changePercent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {data.currentOI.changePercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Sentiment</div>
                  <div className={`text-xl font-bold flex items-center gap-2 ${getSentimentColor(data.sentiment.overall)}`}>
                    {getSentimentIcon(data.sentiment.overall)}
                    {data.sentiment.overall}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.sentiment.confidence}% confidence
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Long/Short Ratio</div>
                  <div className="text-2xl font-bold">{data.sentiment.longShortRatio.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.sentiment.longShortRatio > 1 ? 'Longs dominate' : 'Shorts dominate'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Funding Rate</div>
                  <div className={`text-2xl font-bold ${
                    data.sentiment.fundingRate > 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {data.sentiment.fundingRate.toFixed(3)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.abs(data.sentiment.fundingRate) > 0.1 ? 'Extreme' : 'Normal'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Institutional Signals */}
            {data.institutionalSignals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Institutional Signals</h3>
                <div className="space-y-3">
                  {data.institutionalSignals.map((signal, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{signal.signal}</Badge>
                              <Progress value={signal.strength} className="w-20 h-2" />
                              <span className="text-sm text-muted-foreground">{signal.strength}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{signal.description}</p>
                            <p className="text-sm font-medium text-blue-600">{signal.recommendation}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Divergences */}
            {data.divergences.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">OI Divergences</h3>
                <div className="space-y-2">
                  {data.divergences.map((divergence, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant={divergence.type.includes('BULLISH') ? 'default' : 'destructive'}>
                              {divergence.type}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">{divergence.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{divergence.strength}%</div>
                            <div className="text-xs text-muted-foreground">Strength</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="liquidations" className="space-y-4">
            {/* Simplified Liquidation Zones */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Liquidation Zones & Trading Tips</h3>
              
              {/* Quick Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-red-600 mb-2">🔴 Danger Zones</h4>
                    <div className="space-y-2">
                      {data.liquidationClusters
                        .filter(c => c.intensity > 60)
                        .slice(0, 3)
                        .map((cluster, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                            <span className="font-mono text-sm">${formatPrice(cluster.price)}</span>
                            <Badge variant="destructive" className="text-xs">
                              {cluster.intensity.toFixed(0)}% Risk
                            </Badge>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-red-600 mt-2">⚠️ Vermeide Stops in diesen Bereichen!</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-green-600 mb-2">🟢 Sichere Zonen</h4>
                    <div className="space-y-2">
                      {data.liquidationClusters
                        .filter(c => c.intensity < 30)
                        .slice(0, 3)
                        .map((cluster, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="font-mono text-sm">${formatPrice(cluster.price)}</span>
                            <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                              {cluster.intensity.toFixed(0)}% Risk
                            </Badge>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">✅ Bessere Entry/Exit Bereiche</p>
                  </CardContent>
                </Card>
              </div>

              {/* Visual Zone Map */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Liquidation Zone Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.liquidationClusters.slice(0, 8).map((cluster, index) => {
                      const getRiskLevel = (intensity: number) => {
                        if (intensity > 70) return { color: 'bg-red-500', text: 'EXTREM', textColor: 'text-red-700' };
                        if (intensity > 50) return { color: 'bg-orange-500', text: 'HOCH', textColor: 'text-orange-700' };
                        if (intensity > 30) return { color: 'bg-yellow-500', text: 'MITTEL', textColor: 'text-yellow-700' };
                        return { color: 'bg-green-500', text: 'NIEDRIG', textColor: 'text-green-700' };
                      };
                      
                      const risk = getRiskLevel(cluster.intensity);
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                            cluster.intensity > 60 ? 'border-red-500 bg-red-50' :
                            cluster.intensity > 30 ? 'border-yellow-500 bg-yellow-50' :
                            'border-green-500 bg-green-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant={cluster.side === 'LONG' ? 'destructive' : 'default'}>
                                {cluster.side}
                              </Badge>
                              <div>
                                <div className="font-mono font-bold text-lg">${formatPrice(cluster.price)}</div>
                                <div className="text-xs text-muted-foreground">
                                  Volume: {formatNumber(cluster.volume)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`px-2 py-1 rounded text-xs font-bold ${risk.textColor} bg-white border`}>
                                {risk.text}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className={`w-16 h-3 rounded-full ${risk.color}`} 
                                     style={{ opacity: Math.max(0.3, cluster.intensity / 100) }} />
                                <span className="text-sm font-bold">{cluster.intensity.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Trading Strategy Tips */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-sm text-blue-600">💡 Trading Strategie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">🎯 Entry Tipps:</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Entries zwischen Liquidation Zonen platzieren</li>
                        <li>• Sichere Zonen (&lt;30% Risk) bevorzugen</li>
                        <li>• Volume Confirmation abwarten</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">🛡️ Risk Management:</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Stop-Loss NICHT in roten Zonen (&gt;60%)</li>
                        <li>• Take-Profit vor großen Clustern</li>
                        <li>• Position Size bei hohem Risk reduzieren</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="signals" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Trading Signals</h3>
              <div className="space-y-3">
                {data.tradingSignals.map((signal, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              signal.type === 'ENTRY' ? 'default' : 
                              signal.type === 'EXIT' ? 'secondary' : 'destructive'
                            }>
                              {signal.type}
                            </Badge>
                            <span className="font-medium">{signal.signal}</span>
                            {signal.type === 'WARNING' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">${formatPrice(signal.price)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Progress value={signal.strength} className="w-16 h-2" />
                              <span className="text-sm text-muted-foreground">{signal.strength}%</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="levels" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Support Levels */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-600">Support Levels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.keyLevels.support.map((level, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium">${formatPrice(level)}</span>
                      <Badge variant="outline" className="text-xs">S{index + 1}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Resistance Levels */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-red-600">Resistance Levels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.keyLevels.resistance.map((level, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium">${formatPrice(level)}</span>
                      <Badge variant="outline" className="text-xs">R{index + 1}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Liquidation Magnets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-yellow-600">Liquidation Magnets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.keyLevels.liquidationMagnets.slice(0, 5).map((level, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <span className="text-sm font-medium">${formatPrice(level)}</span>
                      <Badge variant="outline" className="text-xs">L{index + 1}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}