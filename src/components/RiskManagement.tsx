import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface RiskManagementProps {
  symbol: string;
  lastPrice: number;
  atr: number;
  equity: number;
}

export function RiskManagement({ symbol, lastPrice, atr, equity }: RiskManagementProps) {
  const [riskPercent, setRiskPercent] = useState(2);
  const [stopType, setStopType] = useState<"ATR" | "FIXED">("ATR");
  const [atrMultiplier, setAtrMultiplier] = useState(2);
  const [fixedStopPercent, setFixedStopPercent] = useState(3);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState(10);

  const riskCalculation = useMemo(() => {
    const riskAmount = (equity * riskPercent) / 100;
    
    let stopDistance: number;
    if (stopType === "ATR") {
      stopDistance = atr * atrMultiplier;
    } else {
      stopDistance = (lastPrice * fixedStopPercent) / 100;
    }
    
    const stopPrice = side === "LONG" ? 
      lastPrice - stopDistance : 
      lastPrice + stopDistance;
    
    const takeProfitPrice = side === "LONG" ?
      lastPrice + (stopDistance * 2) : // 2:1 RR
      lastPrice - (stopDistance * 2);
    
    const positionSize = riskAmount / stopDistance;
    const leveragedPosition = positionSize * leverage;
    const marginRequired = (leveragedPosition * lastPrice) / leverage;
    const maxLoss = riskAmount;
    const maxProfit = stopDistance * 2 * positionSize;
    
    return {
      riskAmount,
      stopDistance,
      stopPrice,
      takeProfitPrice,
      positionSize,
      leveragedPosition,
      marginRequired,
      maxLoss,
      maxProfit,
      riskReward: 2,
      stopPercent: (stopDistance / lastPrice) * 100
    };
  }, [equity, riskPercent, lastPrice, atr, stopType, atrMultiplier, fixedStopPercent, side, leverage]);

  const portfolioHeat = useMemo(() => {
    // Simulated portfolio positions for heat calculation
    const positions = [
      { symbol: "BTCUSDT", risk: riskPercent, correlation: 1.0 },
      { symbol: "ETHUSDT", risk: 1.5, correlation: 0.8 },
      { symbol: "ADAUSDT", risk: 1.0, correlation: 0.6 }
    ];
    
    const totalRisk = positions.reduce((sum, pos) => sum + pos.risk, 0);
    const correlatedRisk = positions.reduce((sum, pos, i) => {
      const correlationFactor = positions.slice(0, i).reduce((corr, prevPos) => 
        corr + (pos.risk * prevPos.risk * pos.correlation), 0);
      return sum + correlationFactor;
    }, totalRisk);
    
    return {
      totalRisk,
      correlatedRisk,
      diversificationRatio: totalRisk / Math.max(correlatedRisk, 0.1)
    };
  }, [riskPercent]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Advanced Risk Management</CardTitle>
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
            <Select value={stopType} onValueChange={(v) => setStopType(v as "ATR" | "FIXED")}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATR">ATR-based</SelectItem>
                <SelectItem value="FIXED">Fixed %</SelectItem>
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
        ) : (
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
        )}

        {/* Risk Calculation Results */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium">Position Calculation</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Entry: ${lastPrice.toFixed(2)}</div>
            <div>Size: {riskCalculation.leveragedPosition.toFixed(4)} BTC</div>
            <div className={side === "LONG" ? "text-red-500" : "text-green-500"}>
              Stop: ${riskCalculation.stopPrice.toFixed(2)}
            </div>
            <div className={side === "LONG" ? "text-green-500" : "text-red-500"}>
              TP: ${riskCalculation.takeProfitPrice.toFixed(2)}
            </div>
            <div>Margin: ${riskCalculation.marginRequired.toFixed(2)}</div>
            <div>Max Loss: ${riskCalculation.maxLoss.toFixed(2)}</div>
            <div className="text-green-500">Max Profit: ${riskCalculation.maxProfit.toFixed(2)}</div>
            <div>R:R = 1:{riskCalculation.riskReward}</div>
          </div>
        </div>

        {/* Portfolio Heat */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium flex items-center gap-2">
            Portfolio Heat Map
            <Badge variant={portfolioHeat.totalRisk > 6 ? "destructive" : portfolioHeat.totalRisk > 4 ? "secondary" : "default"}>
              {portfolioHeat.totalRisk.toFixed(1)}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Total Risk: {portfolioHeat.totalRisk.toFixed(1)}%</div>
            <div>Correlated Risk: {portfolioHeat.correlatedRisk.toFixed(1)}%</div>
            <div>Diversification: {portfolioHeat.diversificationRatio.toFixed(2)}</div>
            <div className={portfolioHeat.totalRisk > 6 ? "text-red-500" : "text-green-500"}>
              Status: {portfolioHeat.totalRisk > 6 ? "HIGH RISK" : "SAFE"}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1">Calculate Order</Button>
          <Button size="sm" variant="outline" className="flex-1">Save Setup</Button>
        </div>
      </CardContent>
    </Card>
  );
}