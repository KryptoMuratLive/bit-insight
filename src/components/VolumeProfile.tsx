import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { InfoButton } from "@/components/ui/info-button";
import { supabase } from "@/integrations/supabase/client";

interface VolumeNode {
  price: number;
  volume: number;
  percentage: number;
  classification: string;
}

interface VolumeProfileAnalysis {
  volumeProfile: VolumeNode[];
  pocLevel: VolumeNode;
  valueAreaHigh: number;
  valueAreaLow: number;
  valueAreaVolume: number;
  highVolumeNodes: VolumeNode[];
  lowVolumeNodes: VolumeNode[];
  analysis: {
    marketStructure: string;
    supportResistance: string[];
    recommendation: string;
    confidence: number;
  };
}

interface VolumeProfileProps {
  symbol: string;
  timeframe?: string;
}

export function VolumeProfile({ symbol, timeframe = '1h' }: VolumeProfileProps) {
  const [data, setData] = useState<VolumeProfileAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: supabaseError } = await supabase.functions.invoke('volume-profile-analysis', {
        body: { symbol, timeframe }
      });

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error('Volume Profile analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [symbol, timeframe]);

  const infoContent = {
    description: "Volume Profile zeigt, wie viel Handelsvolumen bei verschiedenen Preisniveaus stattgefunden hat. Es identifiziert wichtige Support- und Widerstandszonen basierend auf tatsächlicher Handelsaktivität.",
    howToRead: [
      "POC (Point of Control): Das Preisniveau mit dem höchsten Handelsvolumen - stärkste Support/Widerstand-Zone",
      "Value Area: Bereich mit 70% des gesamten Handelsvolumens - normale Handelsspanne",
      "HVN (High Volume Nodes): Preiszonen mit hohem Volumen - starke Magnet-Effekte",
      "LVN (Low Volume Nodes): Preiszonen mit niedrigem Volumen - schwache Unterstützung, schnelle Preisbewegungen möglich"
    ],
    tradingSignals: [
      "🟢 LONG: Preis über Value Area + POC als Support nutzen",
      "🔴 SHORT: Preis unter Value Area + POC als Widerstand nutzen", 
      "🟡 BREAKOUT: Durchbruch durch HVN mit Volumen-Bestätigung",
      "⚡ SCHNELLE MOVES: LVN-Bereiche werden meist schnell durchlaufen"
    ],
    bestPractices: [
      "Kombiniere Volume Profile mit Trend-Indikatoren für bessere Signale",
      "Warte auf Volumen-Bestätigung bei Durchbrüchen durch POC",
      "Nutze Value Area Grenzen als Take-Profit Ziele",
      "Beobachte Reaktionen an HVN-Levels für Entry-Punkte"
    ],
    riskWarning: "Volume Profile basiert auf historischen Daten. Marktstruktur kann sich ändern. Immer mit anderen Indikatoren kombinieren und Risk Management anwenden."
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Volume Profile Analysis
            <InfoButton title="Volume Profile" content={infoContent} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing volume data...</span>
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
            Volume Profile Analysis
            <InfoButton title="Volume Profile" content={infoContent} />
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

  const maxPercentage = Math.max(...data.volumeProfile.map(v => v.percentage));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Volume Profile Analysis
          <div className="flex items-center gap-2">
            <InfoButton title="Volume Profile" content={infoContent} />
            <Button onClick={fetchAnalysis} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Analysis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Market Structure</span>
            <Badge variant={data.analysis.confidence > 70 ? "default" : "secondary"} className="text-xs">
              {data.analysis.confidence}% Confidence
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{data.analysis.marketStructure}</div>
          <div className="text-xs bg-muted/50 rounded p-2">{data.analysis.recommendation}</div>
        </div>

        {/* Key Levels */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Key Levels</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-blue-400 font-medium">POC:</span> ${data.pocLevel.price.toFixed(2)}
            </div>
            <div>
              <span className="text-green-400 font-medium">VA High:</span> ${data.valueAreaHigh.toFixed(2)}
            </div>
            <div>
              <span className="text-red-400 font-medium">VA Low:</span> ${data.valueAreaLow.toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">HVN Count:</span> {data.highVolumeNodes.length}
            </div>
          </div>
        </div>

        {/* Volume Profile Chart */}
        <div className="space-y-1">
          <div className="text-xs font-medium">Volume Distribution</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.volumeProfile.slice(0, 15).map((level, i) => {
              const isPOC = level.price === data.pocLevel.price;
              const isInValueArea = level.price >= data.valueAreaLow && level.price <= data.valueAreaHigh;
              const isHVN = level.classification.includes('High Volume');
              
              return (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <div className={`w-14 text-right font-mono ${
                    isPOC ? 'text-blue-400 font-bold' : 
                    isHVN ? 'text-green-400' : 
                    isInValueArea ? 'text-yellow-400' : ''
                  }`}>
                    ${level.price.toFixed(1)}
                  </div>
                  <div className="flex-1 bg-muted rounded h-2 relative">
                    <div 
                      className={`h-full rounded transition-all ${
                        isPOC ? 'bg-blue-500' : 
                        isHVN ? 'bg-green-500' : 
                        isInValueArea ? 'bg-yellow-500' : 
                        'bg-primary/60'
                      }`}
                      style={{ width: `${(level.percentage / maxPercentage) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-muted-foreground">
                    {level.percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support/Resistance Levels */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Key S/R Levels</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {data.analysis.supportResistance.slice(0, 4).map((level, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {level}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date().toLocaleTimeString('de-DE')} | {symbol} {timeframe}
        </div>
      </CardContent>
    </Card>
  );
}