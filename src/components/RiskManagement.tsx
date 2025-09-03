import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { InfoButton } from "@/components/ui/info-button";
import { supabase } from "@/integrations/supabase/client";

interface RiskManagementProps {
  symbol: string;
  equity?: number;
}

interface RiskAnalysis {
  positionCalculation: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    leveragedSize: number;
    marginRequired: number;
    maxLoss: number;
    maxProfit: number;
    riskReward: number;
    roi: number;
  };
  portfolioRisk: {
    totalRisk: number;
    correlatedRisk: number;
    diversificationRatio: number;
    maxDrawdown: number;
    sharpeRatio: number;
    riskAdjustedReturn: number;
  };
  marketRisk: {
    volatility: number;
    liquidityRisk: number;
    correlationRisk: number;
    leverageRisk: number;
  };
  optimalSizing: {
    kellyPercent: number;
    maxSafeSize: number;
    recommendedSize: number;
    confidence: number;
  };
  riskWarnings: Array<{
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

export function RiskManagement({ symbol, equity = 10000 }: RiskManagementProps) {
  const [data, setData] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Risk parameters
  const [riskPercent, setRiskPercent] = useState(2);
  const [stopType, setStopType] = useState<"ATR" | "FIXED" | "SUPPORT_RESISTANCE">("ATR");
  const [atrMultiplier, setAtrMultiplier] = useState(2);
  const [fixedStopPercent, setFixedStopPercent] = useState(3);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState(10);

  const fetchAnalysis = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        symbol,
        equity,
        riskPercent,
        leverage,
        side,
        stopType,
        atrMultiplier: stopType === "ATR" ? atrMultiplier : undefined,
        fixedStopPercent: stopType === "FIXED" ? fixedStopPercent : undefined
      };

      const { data: result, error: supabaseError } = await supabase.functions.invoke('risk-management', {
        body: params
      });

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error('Risk Management analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [symbol, equity, riskPercent, leverage, side, stopType, atrMultiplier, fixedStopPercent]);

  const infoContent = {
    description: "Advanced Risk Management berechnet optimale Positionsgrößen, Stop-Loss Levels und Portfolio-Risiken basierend auf wissenschaftlichen Methoden wie Kelly Criterion und modernen Portfolio-Theorien.",
    howToRead: [
      "Risk per Trade: Nie mehr als 1-2% des Kapitals pro Trade riskieren - Grundregel des Überlebens",
      "Kelly Criterion: Mathematisch optimale Positionsgröße basierend auf Gewinnwahrscheinlichkeit und R/R",
      "Portfolio Heat: Gesamtrisiko aller offenen Positionen - sollte nie 10% überschreiten",
      "Correlation Risk: Korrelierte Positionen erhöhen das Gesamtrisiko exponentiell"
    ],
    tradingSignals: [
      "🟢 KELLY OPTIMAL: Position size based on mathematical edge calculation",
      "🟡 MAX SAFE SIZE: Maximale sichere Positionsgröße ohne Ruin-Risiko",
      "🔴 PORTFOLIO HEAT: Warnung bei überhitztem Portfolio (>6% Gesamtrisiko)",
      "⚠️ LEVERAGE RISK: Hebel-Warnung bei gefährlichen Multiplikatoren"
    ],
    bestPractices: [
      "Nie mehr als 2% pro Trade riskieren - auch bei 10 Verlust-Trades in Folge überlebst du",
      "Diversifiziere zwischen unkorrelierten Assets (Bitcoin ≠ Altcoins ≠ Forex)",
      "Nutze ATR-basierte Stops für volatilitäts-angepasste Exits",
      "Portfolio Heat unter 10% halten - sonst Drawdown-Spirale möglich",
      "Kelly Criterion befolgen aber nie über 5% des Kapitals pro Trade"
    ],
    riskWarning: "WARNUNG: Falsches Risk Management führt zum Totalverlust! 90% der Trader verlieren wegen zu großen Positionen, nicht wegen falscher Richtung. Position Sizing ist wichtiger als Entry-Timing. Überheblung kann dich innerhalb Minuten ruinieren."
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Advanced Risk Management
            <InfoButton title="Risk Management" content={infoContent} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Calculating risk metrics...</span>
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
            Advanced Risk Management
            <InfoButton title="Risk Management" content={infoContent} />
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
          Advanced Risk Management
          <div className="flex items-center gap-2">
            <InfoButton title="Risk Management" content={infoContent} />
            <Button onClick={fetchAnalysis} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Configuration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Risk per Trade (%)</Label>
            <Input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="h-8"
              min="0.1"
              max="10"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Leverage</Label>
            <Select value={leverage.toString()} onValueChange={(v) => setLeverage(Number(v))}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 5, 10, 20, 50].map(lev => (
                  <SelectItem key={lev} value={lev.toString()}>{lev}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Side</Label>
            <Select value={side} onValueChange={(v) => setSide(v as "LONG" | "SHORT")}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LONG">LONG</SelectItem>
                <SelectItem value="SHORT">SHORT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Stop Type</Label>
            <Select value={stopType} onValueChange={(v) => setStopType(v as any)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATR">ATR-based</SelectItem>
                <SelectItem value="FIXED">Fixed %</SelectItem>
                <SelectItem value="SUPPORT_RESISTANCE">S/R Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {stopType === "ATR" ? (
          <div className="space-y-2">
            <Label className="text-xs">ATR Multiplier</Label>
            <Input
              type="number"
              value={atrMultiplier}
              onChange={(e) => setAtrMultiplier(Number(e.target.value))}
              className="h-8"
              min="0.5"
              max="5"
              step="0.1"
            />
          </div>
        ) : stopType === "FIXED" ? (
          <div className="space-y-2">
            <Label className="text-xs">Stop Loss %</Label>
            <Input
              type="number"
              value={fixedStopPercent}
              onChange={(e) => setFixedStopPercent(Number(e.target.value))}
              className="h-8"
              min="0.5"
              max="10"
              step="0.1"
            />
          </div>
        ) : null}

        {/* Risk Warnings */}
        {data.riskWarnings.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">Risk Warnings</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {data.riskWarnings.map((warning, i) => (
                <div key={i} className={`border rounded p-2 ${
                  warning.level === 'CRITICAL' ? 'border-red-500 bg-red-50/50' :
                  warning.level === 'HIGH' ? 'border-orange-500 bg-orange-50/50' :
                  warning.level === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50/50' :
                  'border-blue-500 bg-blue-50/50'
                }`}>
                  <div className="flex items-center gap-1">
                    <Badge variant={
                      warning.level === 'CRITICAL' ? 'destructive' :
                      warning.level === 'HIGH' ? 'destructive' :
                      warning.level === 'MEDIUM' ? 'secondary' : 'default'
                    } className="text-xs">
                      {warning.level}
                    </Badge>
                    <span className="text-xs font-medium">{warning.message}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{warning.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Position Calculation Results */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium">Position Calculation</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Entry: ${data.positionCalculation.entryPrice.toFixed(2)}</div>
            <div>Size: {data.positionCalculation.leveragedSize.toFixed(4)} {symbol.replace('USDT', '')}</div>
            <div className={side === "LONG" ? "text-red-500" : "text-green-500"}>
              Stop: ${data.positionCalculation.stopLoss.toFixed(2)}
            </div>
            <div className={side === "LONG" ? "text-green-500" : "text-red-500"}>
              TP: ${data.positionCalculation.takeProfit.toFixed(2)}
            </div>
            <div>Margin: ${data.positionCalculation.marginRequired.toFixed(2)}</div>
            <div>Max Loss: ${data.positionCalculation.maxLoss.toFixed(2)}</div>
            <div className="text-green-500">Max Profit: ${data.positionCalculation.maxProfit.toFixed(2)}</div>
            <div>R:R = 1:{data.positionCalculation.riskReward.toFixed(1)}</div>
          </div>
        </div>

        {/* Optimal Sizing */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium">Kelly Criterion & Optimal Sizing</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Kelly%: {data.optimalSizing.kellyPercent.toFixed(1)}%</div>
            <div>Confidence: {data.optimalSizing.confidence}%</div>
            <div>Max Safe: ${data.optimalSizing.maxSafeSize.toFixed(2)}</div>
            <div className="text-green-500">Recommended: ${data.optimalSizing.recommendedSize.toFixed(2)}</div>
          </div>
        </div>

        {/* Portfolio Risk */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium flex items-center gap-2">
            Portfolio Risk Analysis
            <Badge variant={data.portfolioRisk.totalRisk > 8 ? "destructive" : data.portfolioRisk.totalRisk > 5 ? "secondary" : "default"}>
              {data.portfolioRisk.totalRisk.toFixed(1)}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Total Risk: {data.portfolioRisk.totalRisk.toFixed(1)}%</div>
            <div>Correlated Risk: {data.portfolioRisk.correlatedRisk.toFixed(1)}%</div>
            <div>Diversification: {data.portfolioRisk.diversificationRatio.toFixed(2)}</div>
            <div>Max Drawdown: {data.portfolioRisk.maxDrawdown.toFixed(1)}%</div>
          </div>
        </div>

        {/* Market Risk */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium">Market Risk Factors</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Volatility: {data.marketRisk.volatility.toFixed(0)}%</div>
            <div>Liquidity Risk: {data.marketRisk.liquidityRisk.toFixed(0)}%</div>
            <div>Correlation Risk: {data.marketRisk.correlationRisk.toFixed(0)}%</div>
            <div>Leverage Risk: {data.marketRisk.leverageRisk.toFixed(0)}%</div>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">AI Recommendations</div>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {data.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="text-xs text-muted-foreground bg-muted/30 rounded p-1">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date().toLocaleTimeString('de-DE')} | {symbol} Risk Analysis
        </div>
      </CardContent>
    </Card>
  );
}