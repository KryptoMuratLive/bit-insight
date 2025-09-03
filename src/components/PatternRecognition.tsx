import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { InfoButton } from "@/components/ui/info-button";
import { supabase } from "@/integrations/supabase/client";

interface PatternRecognitionProps {
  symbol: string;
  timeframe?: string;
}

interface Pattern {
  type: string;
  confidence: number;
  timeframe: string;
  description: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  startTime: number;
  endTime: number;
  targetPrice?: number;
  stopLoss?: number;
  riskReward?: number;
}

interface Divergence {
  type: string;
  strength: number;
  description: string;
  indicator: string;
  timeframe: string;
}

interface PatternAnalysis {
  patterns: Pattern[];
  divergences: Divergence[];
  technicalLevels: {
    support: number[];
    resistance: number[];
    pivotPoints: any[];
  };
  overallSignal: {
    direction: string;
    strength: number;
    recommendation: string;
  };
}

export function PatternRecognition({ symbol, timeframe = '1h' }: PatternRecognitionProps) {
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: supabaseError } = await supabase.functions.invoke('pattern-recognition', {
        body: { symbol, timeframe }
      });

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error('Pattern Recognition analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [symbol, timeframe]);

  const infoContent = {
    description: "Pattern Recognition erkennt klassische Chart-Patterns und Divergenzen in Echtzeit. Diese Formationen zeigen potenzielle Trendwenden oder -fortsetzungen basierend auf bewährten technischen Analysemethoden.",
    howToRead: [
      "Bullish Patterns (Grün): Deuten auf steigende Preise hin - Kaufsignale",
      "Bearish Patterns (Rot): Deuten auf fallende Preise hin - Verkaufssignale",
      "Confidence %: Wahrscheinlichkeit dass das Pattern funktioniert (>70% = stark)",
      "Divergenzen: Unterschiede zwischen Preis und Indikatoren - frühe Warnsignale"
    ],
    tradingSignals: [
      "🟢 HEAD & SHOULDERS: 80%+ Confidence = starkes Verkaufssignal",
      "🟢 DOUBLE BOTTOM: 75%+ = Kaufsignal bei Ausbruch nach oben", 
      "🟡 TRIANGLES: 60%+ = Breakout in Trendrichtung erwarten",
      "🔥 DIVERGENCES: RSI vs. Preis = Trendwende-Warnung"
    ],
    bestPractices: [
      "Warte auf Volumen-Bestätigung bei Pattern-Completion",
      "Kombiniere Patterns mit Support/Resistance Levels",
      "Nutze Risk/Reward Ratios für optimale Entry-Punkte",
      "Beachte Divergenzen als frühe Trendwende-Signale",
      "Patterns in höheren Timeframes sind zuverlässiger"
    ],
    riskWarning: "Pattern Recognition hat Fehlsignale! Nur ~60-80% der Patterns funktionieren. Immer Stop-Loss setzen und Position-Sizing beachten. Niemals nur auf ein Pattern allein vertrauen."
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Pattern Recognition & Divergences
            <InfoButton title="Pattern Recognition" content={infoContent} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing patterns...</span>
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
            Pattern Recognition & Divergences
            <InfoButton title="Pattern Recognition" content={infoContent} />
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
          Pattern Recognition & Divergences
          <div className="flex items-center gap-2">
            <InfoButton title="Pattern Recognition" content={infoContent} />
            <Button onClick={fetchAnalysis} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Signal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Overall Signal</span>
            <Badge variant={data.overallSignal.direction === "BULLISH" ? "default" : data.overallSignal.direction === "BEARISH" ? "destructive" : "secondary"} className="text-xs">
              {data.overallSignal.direction} ({data.overallSignal.strength.toFixed(0)}%)
            </Badge>
          </div>
          <div className="text-xs bg-muted/50 rounded p-2">{data.overallSignal.recommendation}</div>
        </div>

        {/* Chart Patterns */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Chart Patterns</div>
          {data.patterns.length === 0 ? (
            <div className="text-xs text-muted-foreground">No patterns detected</div>
          ) : (
            data.patterns.slice(0, 4).map((pattern, i) => (
              <div key={i} className="border rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">{pattern.type}</div>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={pattern.bias === "BULLISH" ? "default" : pattern.bias === "BEARISH" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {pattern.bias}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{pattern.confidence}%</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{pattern.description}</div>
                {pattern.targetPrice && (
                  <div className="text-xs text-green-400">Target: ${pattern.targetPrice.toFixed(2)} | R/R: {pattern.riskReward?.toFixed(1) || 'N/A'}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Divergences */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Divergences</div>
          {data.divergences.length === 0 ? (
            <div className="text-xs text-muted-foreground">No divergences detected</div>
          ) : (
            data.divergences.map((div, i) => (
              <div key={i} className="border rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">{div.type}</div>
                  <span className="text-xs text-muted-foreground">{div.strength}%</span>
                </div>
                <div className="text-xs text-muted-foreground">{div.description}</div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date().toLocaleTimeString('de-DE')} | {symbol} {timeframe}
        </div>
      </CardContent>
    </Card>
  );
}