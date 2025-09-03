import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { InfoButton } from "@/components/ui/info-button";
import { supabase } from "@/integrations/supabase/client";

interface OrderFlowProps {
  symbol: string;
  timeframe?: string;
}

interface OrderFlowData {
  time: number;
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
  vwap: number;
  poc: number;
}

interface InstitutionalActivity {
  timestamp: number;
  price: number;
  volume: number;
  type: 'ACCUMULATION' | 'DISTRIBUTION' | 'ABSORPTION' | 'REJECTION';
  intensity: number;
  confidence: number;
  description: string;
}

interface OrderFlowAnalysis {
  orderFlow: OrderFlowData[];
  institutionalActivity: InstitutionalActivity[];
  marketMicrostructure: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: number;
    absorption: number;
    liquidityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE';
  };
  tradingSignals: {
    signal: string;
    strength: number;
    recommendation: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
  }[];
  riskMetrics: {
    volumeImbalance: number;
    liquidityRisk: number;
    slippageEstimate: number;
    optimalTradeSize: number;
  };
}

export function OrderFlow({ symbol, timeframe = '1m' }: OrderFlowProps) {
  const [data, setData] = useState<OrderFlowAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: supabaseError } = await supabase.functions.invoke('order-flow-analysis', {
        body: { symbol, timeframe }
      });

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error('Order Flow analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [symbol, timeframe]);

  const infoContent = {
    description: "Order Flow Analysis zeigt das Verhältnis von Kauf- und Verkaufsdruck in Echtzeit. Es erkennt institutionelle Aktivitäten und Smart Money Bewegungen durch Volumen- und Delta-Analyse.",
    howToRead: [
      "CVD (Cumulative Volume Delta): Zeigt kumulierten Kauf-/Verkaufsdruck - steigend = Bullish, fallend = Bearish",
      "Volume Imbalance: Ungleichgewicht zwischen Kauf-/Verkaufsvolumen - extreme Werte deuten auf Wendepunkte",
      "Smart Money Activity: Große Volumen-Spikes mit geringer Preisbewegung = Akkumulation/Distribution",
      "VWAP: Volume Weighted Average Price - wichtige Referenzlinie für faire Bewertung"
    ],
    tradingSignals: [
      "🟢 AKKUMULATION: Hohe Volumina bei stabilen Preisen = Smart Money sammelt",
      "🔴 DISTRIBUTION: Hohe Volumina bei Verkaufsdruck = Smart Money verkauft",
      "⚡ ABSORPTION: Massives Volumen absorbiert ohne Preisbewegung = bevorstehender Breakout",
      "📈 CVD DIVERGENZ: CVD steigt während Preis fällt = versteckte Stärke"
    ],
    bestPractices: [
      "Handel in Richtung des CVD-Trends für höhere Erfolgswahrscheinlichkeit",
      "Warte auf Volumen-Bestätigung bei wichtigen Support/Resistance Levels",
      "Nutze VWAP als dynamische Support/Resistance und Fair Value Referenz",
      "Beobachte Smart Money Activity für frühe Trendwende-Signale",
      "Kombiniere Order Flow mit Price Action für beste Ergebnisse"
    ],
    riskWarning: "Order Flow zeigt Intention, nicht Garantie! Institutionelle Akkumulation kann Zeit brauchen. Immer Stop-Loss verwenden und Liquiditätsrisiko beachten. Bei geringer Liquidität höhere Slippage möglich."
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Order Flow & CVD Analysis
            <InfoButton title="Order Flow Analysis" content={infoContent} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing order flow...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Order Flow & CVD Analysis
            <InfoButton title="Order Flow Analysis" content={infoContent} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-destructive">{error || 'No data available'}</div>
          <Button onClick={fetchAnalysis} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Order Flow & CVD Analysis
          <div className="flex items-center gap-2">
            <Badge variant={data.marketMicrostructure.sentiment === "BULLISH" ? "default" : data.marketMicrostructure.sentiment === "BEARISH" ? "destructive" : "secondary"}>
              {data.marketMicrostructure.sentiment}
            </Badge>
            <InfoButton title="Order Flow Analysis" content={infoContent} />
            <Button onClick={fetchAnalysis} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Microstructure */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Market Microstructure</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Momentum:</span>
              <span className={`ml-1 font-mono ${data.marketMicrostructure.momentum > 0 ? 'text-green-500' : data.marketMicrostructure.momentum < 0 ? 'text-red-500' : ''}`}>
                {data.marketMicrostructure.momentum > 0 ? '+' : ''}{data.marketMicrostructure.momentum.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Liquidity:</span>
              <Badge variant={data.marketMicrostructure.liquidityLevel === 'HIGH' ? 'default' : data.marketMicrostructure.liquidityLevel === 'MEDIUM' ? 'secondary' : 'destructive'} className="ml-1 text-xs">
                {data.marketMicrostructure.liquidityLevel}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Absorption:</span>
              <span className="ml-1 font-mono">{data.marketMicrostructure.absorption.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Regime:</span>
              <span className="ml-1 text-xs">{data.marketMicrostructure.marketRegime}</span>
            </div>
          </div>
        </div>

        {/* Trading Signals */}
        {data.tradingSignals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">Active Signals</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {data.tradingSignals.slice(0, 2).map((signal, i) => (
                <div key={i} className="border rounded p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{signal.signal}</div>
                    <Badge variant="default" className="text-xs">{signal.strength.toFixed(0)}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{signal.recommendation}</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div>Entry: ${signal.entry.toFixed(2)}</div>
                    <div className="text-red-400">SL: ${signal.stopLoss.toFixed(2)}</div>
                    <div className="text-green-400">TP: ${signal.takeProfit.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CVD Data */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Recent Order Flow</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {data.orderFlow.slice(-4).map((flow, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">
                  {new Date(flow.time).toLocaleTimeString()}
                </div>
                <div className={`font-mono ${flow.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {flow.delta > 0 ? '+' : ''}{(flow.delta / 1000).toFixed(1)}K
                </div>
                <div className="text-muted-foreground">${flow.price.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Money Activity */}
        {data.institutionalActivity.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">Smart Money Activity</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {data.institutionalActivity.slice(-2).map((activity, i) => (
                <div key={i} className="border rounded p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={activity.type === "ACCUMULATION" ? "default" : activity.type === "ABSORPTION" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {activity.type === "ACCUMULATION" ? "🟢 ACC" : 
                       activity.type === "ABSORPTION" ? "🟡 ABS" : 
                       activity.type === "DISTRIBUTION" ? "🔴 DIST" : "⚡ REJ"}
                    </Badge>
                    <span className="text-xs">{activity.confidence.toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">${activity.price.toFixed(2)} | {(activity.volume/1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Metrics */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Risk Metrics</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Vol. Imbalance:</span>
              <span className="ml-1 font-mono">{data.riskMetrics.volumeImbalance.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Slippage:</span>
              <span className="ml-1 font-mono">{(data.riskMetrics.slippageEstimate * 100).toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Liquidity Risk:</span>
              <span className="ml-1 font-mono">{data.riskMetrics.liquidityRisk.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Optimal Size:</span>
              <span className="ml-1 font-mono">{(data.riskMetrics.optimalTradeSize/1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date().toLocaleTimeString('de-DE')} | {symbol} {timeframe}
        </div>
      </CardContent>
    </Card>
  );
}