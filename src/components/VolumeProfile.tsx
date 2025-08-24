import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VolumeNode {
  price: number;
  volume: number;
  percentage: number;
}

interface VolumeProfileProps {
  candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>;
  lastPrice: number;
}

export function VolumeProfile({ candles, lastPrice }: VolumeProfileProps) {
  const volumeProfile = useMemo(() => {
    if (!candles.length) return [];
    
    const maxPrice = Math.max(...candles.map(c => c.h));
    const minPrice = Math.min(...candles.map(c => c.l));
    const priceStep = (maxPrice - minPrice) / 50; // 50 price levels
    
    const volumeByPrice: Record<number, number> = {};
    
    candles.forEach(candle => {
      const avgPrice = (candle.h + candle.l + candle.c) / 3;
      const priceLevel = Math.floor((avgPrice - minPrice) / priceStep) * priceStep + minPrice;
      volumeByPrice[priceLevel] = (volumeByPrice[priceLevel] || 0) + candle.v;
    });
    
    const totalVolume = Object.values(volumeByPrice).reduce((sum, vol) => sum + vol, 0);
    
    return Object.entries(volumeByPrice)
      .map(([price, volume]) => ({
        price: parseFloat(price),
        volume,
        percentage: (volume / totalVolume) * 100
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 20); // Top 20 levels
  }, [candles]);

  const maxPercentage = Math.max(...volumeProfile.map(v => v.percentage));
  const pocLevel = volumeProfile.reduce((max, curr) => curr.volume > max.volume ? curr : max, volumeProfile[0]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Volume Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-xs text-muted-foreground mb-2">
          POC: ${pocLevel?.price.toFixed(2)} ({pocLevel?.percentage.toFixed(1)}%)
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {volumeProfile.map((level, i) => {
            const isNearCurrent = Math.abs(level.price - lastPrice) < (lastPrice * 0.005);
            const isPOC = level === pocLevel;
            
            return (
              <div key={i} className="flex items-center gap-1 text-xs">
                <div className={`w-12 text-right ${isNearCurrent ? 'text-yellow-400 font-bold' : isPOC ? 'text-blue-400' : ''}`}>
                  ${level.price.toFixed(0)}
                </div>
                <div className="flex-1 bg-muted rounded h-2 relative">
                  <div 
                    className={`h-full rounded transition-all ${
                      isPOC ? 'bg-blue-500' : 
                      isNearCurrent ? 'bg-yellow-500' : 
                      'bg-primary/60'
                    }`}
                    style={{ width: `${(level.percentage / maxPercentage) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-muted-foreground">
                  {level.percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}