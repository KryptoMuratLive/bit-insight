import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PatternRecognitionProps {
  candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>;
}

interface Pattern {
  type: string;
  confidence: number;
  timeframe: string;
  description: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  startTime: number;
  endTime: number;
}

export function PatternRecognition({ candles }: PatternRecognitionProps) {
  const detectedPatterns = useMemo(() => {
    if (candles.length < 20) return [];
    
    const patterns: Pattern[] = [];
    
    // Helper function to find pivot points
    const findPivots = (period = 5) => {
      const pivots = [];
      for (let i = period; i < candles.length - period; i++) {
        const current = candles[i];
        const left = candles.slice(i - period, i);
        const right = candles.slice(i + 1, i + period + 1);
        
        // Pivot High
        if (left.every(c => c.h < current.h) && right.every(c => c.h < current.h)) {
          pivots.push({ time: current.t, price: current.h, type: "HIGH", index: i });
        }
        
        // Pivot Low
        if (left.every(c => c.l > current.l) && right.every(c => c.l > current.l)) {
          pivots.push({ time: current.t, price: current.l, type: "LOW", index: i });
        }
      }
      return pivots;
    };
    
    const pivots = findPivots();
    
    // 1. Head and Shoulders Pattern
    const detectHeadAndShoulders = () => {
      const highs = pivots.filter(p => p.type === "HIGH").slice(-5);
      if (highs.length >= 3) {
        for (let i = 0; i < highs.length - 2; i++) {
          const leftShoulder = highs[i];
          const head = highs[i + 1];
          const rightShoulder = highs[i + 2];
          
          const isValidPattern = 
            head.price > leftShoulder.price && 
            head.price > rightShoulder.price &&
            Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.03; // Similar heights
          
          if (isValidPattern) {
            patterns.push({
              type: "Head & Shoulders",
              confidence: 75,
              timeframe: "Medium",
              description: "Bearish reversal pattern detected",
              bias: "BEARISH",
              startTime: leftShoulder.time,
              endTime: rightShoulder.time
            });
          }
        }
      }
    };
    
    // 2. Double Top/Bottom
    const detectDoubleTopBottom = () => {
      const recentPivots = pivots.slice(-4);
      if (recentPivots.length >= 2) {
        for (let i = 0; i < recentPivots.length - 1; i++) {
          const first = recentPivots[i];
          const second = recentPivots[i + 1];
          
          if (first.type === second.type) {
            const priceDiff = Math.abs(first.price - second.price) / first.price;
            
            if (priceDiff < 0.02) { // Within 2%
              patterns.push({
                type: first.type === "HIGH" ? "Double Top" : "Double Bottom",
                confidence: 65,
                timeframe: "Short",
                description: `${first.type === "HIGH" ? "Bearish" : "Bullish"} reversal pattern`,
                bias: first.type === "HIGH" ? "BEARISH" : "BULLISH",
                startTime: first.time,
                endTime: second.time
              });
            }
          }
        }
      }
    };
    
    // 3. Triangle Patterns
    const detectTriangles = () => {
      if (pivots.length >= 4) {
        const recentPivots = pivots.slice(-6);
        const highs = recentPivots.filter(p => p.type === "HIGH");
        const lows = recentPivots.filter(p => p.type === "LOW");
        
        if (highs.length >= 2 && lows.length >= 2) {
          // Ascending Triangle
          const highsFlat = highs.length >= 2 && 
            Math.abs(highs[highs.length - 1].price - highs[highs.length - 2].price) / highs[0].price < 0.01;
          const lowsRising = lows.length >= 2 && 
            lows[lows.length - 1].price > lows[lows.length - 2].price;
          
          if (highsFlat && lowsRising) {
            patterns.push({
              type: "Ascending Triangle",
              confidence: 60,
              timeframe: "Medium",
              description: "Bullish continuation pattern",
              bias: "BULLISH",
              startTime: Math.min(...recentPivots.map(p => p.time)),
              endTime: Math.max(...recentPivots.map(p => p.time))
            });
          }
          
          // Descending Triangle
          const lowsFlat = lows.length >= 2 && 
            Math.abs(lows[lows.length - 1].price - lows[lows.length - 2].price) / lows[0].price < 0.01;
          const highsFalling = highs.length >= 2 && 
            highs[highs.length - 1].price < highs[highs.length - 2].price;
          
          if (lowsFlat && highsFalling) {
            patterns.push({
              type: "Descending Triangle",
              confidence: 60,
              timeframe: "Medium",
              description: "Bearish continuation pattern",
              bias: "BEARISH",
              startTime: Math.min(...recentPivots.map(p => p.time)),
              endTime: Math.max(...recentPivots.map(p => p.time))
            });
          }
        }
      }
    };
    
    // 4. Flag/Pennant Patterns
    const detectFlags = () => {
      const recent20 = candles.slice(-20);
      const recent5 = candles.slice(-5);
      
      // Strong move followed by consolidation
      const strongMove = Math.abs(recent20[recent20.length - 1].c - recent20[0].c) / recent20[0].c > 0.05;
      const consolidation = Math.abs(recent5[recent5.length - 1].c - recent5[0].c) / recent5[0].c < 0.02;
      
      if (strongMove && consolidation) {
        const moveDirection = recent20[recent20.length - 1].c > recent20[0].c ? "BULLISH" : "BEARISH";
        patterns.push({
          type: "Bull Flag",
          confidence: 55,
          timeframe: "Short",
          description: `${moveDirection} continuation pattern`,
          bias: moveDirection,
          startTime: recent20[0].t,
          endTime: recent20[recent20.length - 1].t
        });
      }
    };
    
    // Run pattern detection
    detectHeadAndShoulders();
    detectDoubleTopBottom();
    detectTriangles();
    detectFlags();
    
    // Sort by confidence and return top 5
    return patterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }, [candles]);

  const divergences = useMemo(() => {
    if (candles.length < 14) return [];
    
    // Simple RSI divergence detection
    const rsi = (values: number[], period = 14) => {
      const gains = [0];
      const losses = [0];
      for (let i = 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        gains.push(Math.max(diff, 0));
        losses.push(Math.max(-diff, 0));
      }
      
      let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b) / period;
      let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b) / period;
      
      const rsiValues = [100 - 100 / (1 + avgGain / avgLoss)];
      
      for (let i = period + 1; i < values.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rsiValues.push(100 - 100 / (1 + avgGain / avgLoss));
      }
      
      return rsiValues;
    };
    
    const closes = candles.map(c => c.c);
    const rsiValues = rsi(closes);
    
    const divergenceList = [];
    const recent = 10;
    
    if (rsiValues.length >= recent) {
      const recentPrices = closes.slice(-recent);
      const recentRSI = rsiValues.slice(-recent);
      
      // Bullish divergence: price makes lower low, RSI makes higher low
      const priceLL = recentPrices[recentPrices.length - 1] < Math.min(...recentPrices.slice(0, -1));
      const rsiHL = recentRSI[recentRSI.length - 1] > Math.min(...recentRSI.slice(0, -1));
      
      if (priceLL && rsiHL) {
        divergenceList.push({
          type: "Bullish RSI Divergence",
          strength: 70,
          description: "Price lower low, RSI higher low"
        });
      }
      
      // Bearish divergence: price makes higher high, RSI makes lower high  
      const priceHH = recentPrices[recentPrices.length - 1] > Math.max(...recentPrices.slice(0, -1));
      const rsiLH = recentRSI[recentRSI.length - 1] < Math.max(...recentRSI.slice(0, -1));
      
      if (priceHH && rsiLH) {
        divergenceList.push({
          type: "Bearish RSI Divergence",
          strength: 70,
          description: "Price higher high, RSI lower high"
        });
      }
    }
    
    return divergenceList;
  }, [candles]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pattern Recognition & Divergences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chart Patterns */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Chart Patterns</div>
          {detectedPatterns.length === 0 ? (
            <div className="text-xs text-muted-foreground">No patterns detected</div>
          ) : (
            detectedPatterns.map((pattern, i) => (
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
                <div className="text-xs text-muted-foreground">
                  Timeframe: {pattern.timeframe} | 
                  {new Date(pattern.startTime).toLocaleDateString()} - {new Date(pattern.endTime).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Divergences */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Divergences</div>
          {divergences.length === 0 ? (
            <div className="text-xs text-muted-foreground">No divergences detected</div>
          ) : (
            divergences.map((div, i) => (
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
      </CardContent>
    </Card>
  );
}