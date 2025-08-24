import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrderFlowProps {
  candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>;
}

export function OrderFlow({ candles }: OrderFlowProps) {
  const { cvd, momentum, sentiment } = useMemo(() => {
    if (candles.length < 20) return { cvd: [], momentum: 0, sentiment: "NEUTRAL" };
    
    // Calculate Cumulative Volume Delta (simplified)
    let cumulativeDelta = 0;
    const cvdData = candles.map((candle, i) => {
      // Estimate buy vs sell volume based on close vs open
      const bodyDirection = candle.c > candle.o ? 1 : -1;
      const volumeDelta = candle.v * bodyDirection * 0.6; // 60% of volume attributed to direction
      
      cumulativeDelta += volumeDelta;
      
      return {
        time: candle.t,
        cvd: cumulativeDelta,
        delta: volumeDelta,
        price: candle.c
      };
    });
    
    // Calculate momentum from recent CVD changes
    const recentCVD = cvdData.slice(-10);
    const cvdMomentum = recentCVD.length > 1 ? 
      (recentCVD[recentCVD.length - 1].cvd - recentCVD[0].cvd) / Math.abs(recentCVD[0].cvd || 1) * 100 : 0;
    
    // Determine sentiment
    let currentSentiment = "NEUTRAL";
    if (cvdMomentum > 5) currentSentiment = "BULLISH";
    else if (cvdMomentum < -5) currentSentiment = "BEARISH";
    
    return {
      cvd: cvdData.slice(-20),
      momentum: cvdMomentum,
      sentiment: currentSentiment
    };
  }, [candles]);

  const institutionalFlow = useMemo(() => {
    if (cvd.length < 10) return [];
    
    // Detect large volume spikes that might indicate institutional activity
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.v, 0) / 20;
    
    return candles
      .slice(-10)
      .filter(candle => candle.v > avgVolume * 2)
      .map(candle => ({
        time: candle.t,
        volume: candle.v,
        price: candle.c,
        type: candle.c > candle.o ? "ACCUMULATION" : "DISTRIBUTION",
        intensity: Math.min((candle.v / avgVolume - 1) * 100, 200)
      }));
  }, [candles, cvd]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Order Flow & CVD
          <Badge variant={sentiment === "BULLISH" ? "default" : sentiment === "BEARISH" ? "destructive" : "secondary"}>
            {sentiment}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* CVD Momentum */}
        <div className="flex items-center justify-between p-2 border rounded">
          <div className="text-xs">
            <div className="font-medium">CVD Momentum</div>
            <div className="text-muted-foreground">10-period change</div>
          </div>
          <div className={`text-sm font-mono ${momentum > 0 ? 'text-green-500' : momentum < 0 ? 'text-red-500' : ''}`}>
            {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}%
          </div>
        </div>

        {/* Recent CVD Data */}
        <div className="space-y-1">
          <div className="text-xs font-medium">Recent CVD</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {cvd.slice(-5).map((data, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">
                  {new Date(data.time).toLocaleTimeString()}
                </div>
                <div className={`font-mono ${data.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.delta > 0 ? '+' : ''}{(data.delta / 1000).toFixed(1)}K
                </div>
                <div className="text-muted-foreground">
                  ${data.price.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Activity */}
        {institutionalFlow.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Smart Money Activity</div>
            <div className="space-y-1">
              {institutionalFlow.map((flow, i) => (
                <div key={i} className="flex items-center gap-2 p-1 border rounded text-xs">
                  <Badge 
                    variant={flow.type === "ACCUMULATION" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {flow.type === "ACCUMULATION" ? "🟢" : "🔴"}
                  </Badge>
                  <div className="flex-1">
                    <div>${flow.price.toFixed(0)}</div>
                    <div className="text-muted-foreground">
                      {(flow.volume / 1000).toFixed(1)}K vol
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{flow.intensity.toFixed(0)}%</div>
                    <div className="text-muted-foreground">
                      {new Date(flow.time).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}