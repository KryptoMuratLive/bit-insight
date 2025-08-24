import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entry: number;
  exit?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  setup: string;
  notes: string;
  marketContext: {
    atr: number;
    adx: number;
    rsi: number;
    trend: string;
  };
  r: number; // Risk multiple
}

interface TradeJournalProps {
  symbol: string;
  lastPrice: number;
  atr: number;
  adx: number;
  rsi: number;
}

export function TradeJournal({ symbol, lastPrice, atr, adx, rsi }: TradeJournalProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [newTrade, setNewTrade] = useState({
    side: "LONG" as "LONG" | "SHORT",
    entry: lastPrice,
    quantity: 0.01,
    setup: "",
    notes: "",
    risk: 100 // USD risk amount
  });

  // Load trades from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem("trading-journal");
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem("trading-journal", JSON.stringify(trades));
  }, [trades]);

  const addTrade = () => {
    const trade: Trade = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      symbol,
      side: newTrade.side,
      entry: newTrade.entry,
      quantity: newTrade.quantity,
      status: "OPEN",
      setup: newTrade.setup,
      notes: newTrade.notes,
      marketContext: {
        atr,
        adx,
        rsi,
        trend: adx > 25 ? "TRENDING" : "RANGING"
      },
      r: 0
    };
    
    setTrades([trade, ...trades]);
    setNewTrade({
      side: "LONG",
      entry: lastPrice,
      quantity: 0.01,
      setup: "",
      notes: "",
      risk: 100
    });
  };

  const closeTrade = (id: string, exitPrice: number) => {
    setTrades(trades.map(trade => {
      if (trade.id === id && trade.status === "OPEN") {
        const pnl = trade.side === "LONG" ? 
          (exitPrice - trade.entry) * trade.quantity :
          (trade.entry - exitPrice) * trade.quantity;
        const pnlPercent = (pnl / (trade.entry * trade.quantity)) * 100;
        
        return {
          ...trade,
          exit: exitPrice,
          pnl,
          pnlPercent,
          status: "CLOSED" as const,
          r: pnl / 100 // Simplified R calculation
        };
      }
      return trade;
    }));
  };

  const performance = React.useMemo(() => {
    const closedTrades = trades.filter(t => t.status === "CLOSED");
    if (closedTrades.length === 0) return null;
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const winRate = (winningTrades.length / closedTrades.length) * 100;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0;
    
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
    const expectancy = ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss);
    
    return {
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      totalTrades: closedTrades.length
    };
  }, [trades]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Trade Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Summary */}
        {performance && (
          <div className="border rounded p-3 space-y-2">
            <div className="text-xs font-medium">Performance Summary</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Total P&L</div>
                <div className={performance.totalPnL >= 0 ? "text-green-500" : "text-red-500"}>
                  ${performance.totalPnL.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Win Rate</div>
                <div>{performance.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Trades</div>
                <div>{performance.totalTrades}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Win</div>
                <div className="text-green-500">${performance.avgWin.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Loss</div>
                <div className="text-red-500">${performance.avgLoss.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Profit Factor</div>
                <div>{performance.profitFactor.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Add New Trade */}
        <div className="border rounded p-3 space-y-3">
          <div className="text-xs font-medium">Log New Trade</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Side</Label>
              <Select value={newTrade.side} onValueChange={(v) => setNewTrade({...newTrade, side: v as "LONG" | "SHORT"})}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">LONG</SelectItem>
                  <SelectItem value="SHORT">SHORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entry Price</Label>
              <Input
                type="number"
                value={newTrade.entry}
                onChange={(e) => setNewTrade({...newTrade, entry: Number(e.target.value)})}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                value={newTrade.quantity}
                onChange={(e) => setNewTrade({...newTrade, quantity: Number(e.target.value)})}
                className="h-8"
                step="0.001"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Setup</Label>
              <Input
                value={newTrade.setup}
                onChange={(e) => setNewTrade({...newTrade, setup: e.target.value})}
                className="h-8"
                placeholder="e.g. EMA Cross"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={newTrade.notes}
              onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
              className="h-16"
              placeholder="Market conditions, reasoning, etc."
            />
          </div>
          <Button onClick={addTrade} size="sm" className="w-full">Log Trade</Button>
        </div>

        {/* Recent Trades */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Recent Trades</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {trades.slice(0, 10).map(trade => (
              <div key={trade.id} className="border rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.side === "LONG" ? "default" : "destructive"}>
                      {trade.side}
                    </Badge>
                    <Badge variant={
                      trade.status === "OPEN" ? "secondary" : 
                      trade.status === "CLOSED" ? (trade.pnl && trade.pnl > 0 ? "default" : "destructive") : 
                      "outline"
                    }>
                      {trade.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Entry: ${trade.entry.toFixed(2)}</div>
                  <div>Qty: {trade.quantity}</div>
                  {trade.exit && <div>Exit: ${trade.exit.toFixed(2)}</div>}
                  {trade.pnl !== undefined && (
                    <div className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                      P&L: ${trade.pnl.toFixed(2)}
                    </div>
                  )}
                </div>
                
                {trade.setup && (
                  <div className="text-xs text-muted-foreground">Setup: {trade.setup}</div>
                )}
                
                {trade.status === "OPEN" && (
                  <div className="flex gap-1 mt-2">
                    <Input
                      type="number"
                      placeholder="Exit price"
                      className="h-6 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const exitPrice = Number((e.target as HTMLInputElement).value);
                          if (exitPrice > 0) {
                            closeTrade(trade.id, exitPrice);
                          }
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 px-2 text-xs"
                      onClick={() => closeTrade(trade.id, lastPrice)}
                    >
                      Close @ Market
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}