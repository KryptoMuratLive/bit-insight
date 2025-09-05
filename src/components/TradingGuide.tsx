import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Target, 
  Shield, 
  TrendingUp,
  BarChart3,
  Activity,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Zap
} from 'lucide-react';

interface TradingGuideProps {
  className?: string;
}

export function TradingGuide({ className }: TradingGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  const functions = [
    {
      name: "Signal Aggregation",
      icon: <Zap className="h-4 w-4" />,
      color: "bg-purple-500",
      description: "Kombiniert alle Analysen zu einem finalen Trade-Score",
      usage: "Hauptsignal für Trading-Entscheidungen - wartet auf hohe Konfidenz (>60%)",
      signals: ["Score >50: Bullish", "Score <-50: Bearish", "Konfidenz <30: Warten"]
    },
    {
      name: "Multi-Timeframe Analysis",
      icon: <BarChart3 className="h-4 w-4" />,
      color: "bg-blue-500",
      description: "Analysiert Trends über mehrere Zeitrahmen (1h, 4h, 1d)",
      usage: "Bestätigt Trend-Richtung und Stärke - sucht nach Alignment",
      signals: ["Bullish Alignment: Long-Bias", "Bearish Alignment: Short-Bias", "Mixed: Seitwärts"]
    },
    {
      name: "Pattern Recognition",
      icon: <Target className="h-4 w-4" />,
      color: "bg-orange-500", 
      description: "Erkennt Chart-Patterns und Divergenzen automatisch",
      usage: "Timing für Entries - wartet auf starke Patterns (>80% Konfidenz)",
      signals: ["Head & Shoulders: Reversal", "Flags: Continuation", "Divergence: Momentum-Shift"]
    },
    {
      name: "Volume Profile",
      icon: <Activity className="h-4 w-4" />,
      color: "bg-green-500",
      description: "Zeigt Point of Control (POC) und Value Area",
      usage: "Identifiziert wichtige Support/Resistance Levels",
      signals: ["POC: Starker S/R", "Value Area: Fairer Preis", "HVN/LVN: Liquidity Zones"]
    },
    {
      name: "Order Flow Analysis", 
      icon: <TrendingUp className="h-4 w-4" />,
      color: "bg-cyan-500",
      description: "Analysiert institutionelle Aktivität und Mikrostruktur",
      usage: "Bestätigt Momentum und Liquidity - achtet auf Absorption",
      signals: ["Accumulation: Institutional Buying", "Distribution: Institutional Selling", "Imbalance: Directional Flow"]
    },
    {
      name: "Risk Management",
      icon: <Shield className="h-4 w-4" />,
      color: "bg-red-500",
      description: "Berechnet optimale Position Size und Stop Loss Levels",
      usage: "Bestimmt maximales Risiko pro Trade (1-2% empfohlen)",
      signals: ["Kelly %: Optimale Size", "R/R Ratio: Risk/Reward", "Max Drawdown: Portfolio Risk"]
    },
    {
      name: "Market Structure",
      icon: <BookOpen className="h-4 w-4" />,
      color: "bg-indigo-500",
      description: "Identifiziert Marktphasen und strukturelle Levels",
      usage: "Bestimmt Marktregime - Trend, Range oder Breakout",
      signals: ["Trending: Follow Momentum", "Ranging: Mean Reversion", "Breakout: Volatility Expansion"]
    },
    {
      name: "Precision Gate",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "bg-emerald-500",
      description: "Final Gate Check - GO/NO GO Entscheidung",
      usage: "Finale Validierung vor Trade-Ausführung",
      signals: ["GO: Alle Kriterien erfüllt", "NO: Warten auf besseres Setup"]
    }
  ];

  const strategies = [
    {
      title: "Trend Following Strategy",
      description: "Nutzt Multi-Timeframe + Order Flow für starke Trends",
      steps: [
        "1. Multi-Timeframe zeigt Bullish/Bearish Alignment (>80%)",
        "2. Order Flow bestätigt institutionelle Aktivität",
        "3. Pattern Recognition zeigt Fortsetzungs-Patterns",
        "4. Volume Profile: Entry near POC oder Value Area",
        "5. Risk Management: 1-2% Risk, RR >2:1"
      ]
    },
    {
      title: "Mean Reversion Strategy", 
      description: "Nutzt Volume Profile + Market Structure für Ranges",
      steps: [
        "1. Market Structure zeigt Ranging-Phase",
        "2. Volume Profile: Entry an Value Area Grenzen",
        "3. Pattern Recognition: Reversal Patterns",
        "4. Order Flow: Absorption an Extremen",
        "5. Tight Stops, schnelle Profits"
      ]
    },
    {
      title: "Breakout Strategy",
      description: "Nutzt Pattern Recognition + Order Flow für Volatility",
      steps: [
        "1. Pattern Recognition zeigt Breakout-Pattern",
        "2. Volume Profile: Breakout über/unter Value Area",
        "3. Order Flow bestätigt Follow-Through",
        "4. Multi-Timeframe alignment in Breakout-Richtung",
        "5. Größere Position Size bei hoher Konfidenz"
      ]
    }
  ];

  const bestPractices = [
    "Warte immer auf Signal Aggregation Konfidenz >60%",
    "Nie mehr als 2% des Accounts pro Trade riskieren", 
    "Bestätige Signale mit mindestens 2-3 Funktionen",
    "Nutze Volume Profile Levels für Entry/Exit",
    "Beachte Risk Management Empfehlungen",
    "Trade nur bei 'GO' Signal von Precision Gate",
    "Vermeide Trading bei Critical Risk Level"
  ];

  return (
    <Card className={`w-full mb-6 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Trading Dashboard - Strategien & Funktions-Guide
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Komplettes Trading-System mit 8 Advanced Analytics Funktionen. Klicken für Details.
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            
            {/* Dashboard Functions Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Dashboard Funktionen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {functions.map((func, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1 rounded ${func.color} text-white`}>
                        {func.icon}
                      </div>
                      <h4 className="font-medium">{func.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{func.description}</p>
                    <div className="text-xs">
                      <div className="font-medium text-primary">Verwendung:</div>
                      <div>{func.usage}</div>
                    </div>
                    <div className="text-xs">
                      <div className="font-medium text-primary">Signale:</div>
                      <div className="space-y-1">
                        {func.signals.map((signal, i) => (
                          <Badge key={i} variant="outline" className="text-xs mr-1 mb-1">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Strategies */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Trading Strategien
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {strategies.map((strategy, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{strategy.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                    <div className="space-y-1">
                      {strategy.steps.map((step, i) => (
                        <div key={i} className="text-xs flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Practices */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Best Practices & Regeln
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {bestPractices.map((practice, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{practice}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Wichtige Warnung</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Dieses Dashboard ist ein Analyse-Tool. Keine Garantie für profitable Trades. 
                    Immer eigene Due Diligence durchführen und nur Geld riskieren, das du verlieren kannst.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                <BookOpen className="h-5 w-5" />
                Quick Start - Erste Schritte
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <div className="font-medium mb-2">Für Anfänger:</div>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>Starte mit Signal Aggregation - warte auf hohe Konfidenz</li>
                    <li>Prüfe Risk Management für Position Size</li>
                    <li>Nutze Volume Profile für Entry/Exit Levels</li>
                    <li>Bestätige mit Precision Gate vor Trade</li>
                  </ol>
                </div>
                <div>
                  <div className="font-medium mb-2">Für Fortgeschrittene:</div>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>Multi-Timeframe für Trend-Bestätigung</li>
                    <li>Order Flow für Timing-Optimierung</li>
                    <li>Pattern Recognition für spezifische Setups</li>
                    <li>Market Structure für Regime-Anpassung</li>
                  </ol>
                </div>
              </div>
            </div>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}