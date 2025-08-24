import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MarketStructureProps {
  candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>;
}

interface StructureBreak {
  time: number;
  type: "BOS" | "CHoCH";
  direction: "BULLISH" | "BEARISH";
  price: number;
  strength: number;
}

export function MarketStructure({ candles }: MarketStructureProps) {
  const { structure, trend } = useMemo(() => {
    if (candles.length < 20) return { structure: [], trend: "NEUTRAL" };
    
    // Find swing highs and lows
    const swings: Array<{time: number; price: number; type: "HIGH" | "LOW"}> = [];
    
    for (let i = 5; i < candles.length - 5; i++) {
      const current = candles[i];
      const leftCandles = candles.slice(i - 5, i);
      const rightCandles = candles.slice(i + 1, i + 6);
      
      // Swing High
      if (leftCandles.every(c => c.h < current.h) && rightCandles.every(c => c.h < current.h)) {
        swings.push({ time: current.t, price: current.h, type: "HIGH" });
      }
      
      // Swing Low
      if (leftCandles.every(c => c.l > current.l) && rightCandles.every(c => c.l > current.l)) {
        swings.push({ time: current.t, price: current.l, type: "LOW" });
      }
    }
    
    // Detect structure breaks
    const breaks: StructureBreak[] = [];
    let currentTrend = "NEUTRAL";
    
    for (let i = 1; i < swings.length; i++) {
      const prev = swings[i - 1];
      const curr = swings[i];
      
      if (prev.type === "LOW" && curr.type === "HIGH") {
        // Potential bullish structure
        const prevLows = swings.filter(s => s.type === "LOW" && s.time < curr.time).slice(-3);
        if (prevLows.length >= 2) {
          const isHigherLow = prev.price > prevLows[prevLows.length - 2].price;
          if (isHigherLow && curr.price > candles[Math.floor(candles.length * 0.8)].h) {
            breaks.push({
              time: curr.time,
              type: currentTrend === "BEARISH" ? "CHoCH" : "BOS",
              direction: "BULLISH",
              price: curr.price,
              strength: Math.min((curr.price - prev.price) / prev.price * 100, 10)
            });
            currentTrend = "BULLISH";
          }
        }
      } else if (prev.type === "HIGH" && curr.type === "LOW") {
        // Potential bearish structure
        const prevHighs = swings.filter(s => s.type === "HIGH" && s.time < curr.time).slice(-3);
        if (prevHighs.length >= 2) {
          const isLowerHigh = prev.price < prevHighs[prevHighs.length - 2].price;
          if (isLowerHigh && curr.price < candles[Math.floor(candles.length * 0.8)].l) {
            breaks.push({
              time: curr.time,
              type: currentTrend === "BULLISH" ? "CHoCH" : "BOS",
              direction: "BEARISH",
              price: curr.price,
              strength: Math.min((prev.price - curr.price) / curr.price * 100, 10)
            });
            currentTrend = "BEARISH";
          }
        }
      }
    }
    
    return { structure: breaks.slice(-5), trend: currentTrend };
  }, [candles]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Market Structure
          <Badge variant={trend === "BULLISH" ? "default" : trend === "BEARISH" ? "destructive" : "secondary"}>
            {trend}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {structure.length === 0 ? (
          <div className="text-xs text-muted-foreground">No structure breaks detected</div>
        ) : (
          structure.map((break_, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={break_.type === "CHoCH" ? "default" : "outline"}
                  className={break_.direction === "BULLISH" ? "bg-green-600" : "bg-red-600"}
                >
                  {break_.type}
                </Badge>
                <div className="text-xs">
                  <div>${break_.price.toFixed(2)}</div>
                  <div className="text-muted-foreground">
                    {new Date(break_.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="text-xs text-right">
                <div className="font-mono">
                  {break_.direction === "BULLISH" ? "📈" : "📉"} 
                  {break_.strength.toFixed(1)}%
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}