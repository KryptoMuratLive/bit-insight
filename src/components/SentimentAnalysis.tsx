import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SentimentData {
  overall: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number; // -100 to 100
  fearGreedIndex: number; // 0 to 100
  sources: {
    social: { score: number; mentions: number };
    news: { score: number; articles: number };
    onchain: { score: number; metrics: string[] };
  };
  lastUpdated: number;
}

interface SentimentAnalysisProps {
  symbol: string;
}

export function SentimentAnalysis({ symbol }: SentimentAnalysisProps) {
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulate sentiment data (in real implementation, this would call APIs)
  const fetchSentiment = async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock sentiment data
    const mockSentiment: SentimentData = {
      overall: Math.random() > 0.5 ? "BULLISH" : Math.random() > 0.25 ? "BEARISH" : "NEUTRAL",
      score: Math.floor(Math.random() * 200) - 100, // -100 to 100
      fearGreedIndex: Math.floor(Math.random() * 100), // 0 to 100
      sources: {
        social: {
          score: Math.floor(Math.random() * 200) - 100,
          mentions: Math.floor(Math.random() * 10000) + 1000
        },
        news: {
          score: Math.floor(Math.random() * 200) - 100,
          articles: Math.floor(Math.random() * 50) + 10
        },
        onchain: {
          score: Math.floor(Math.random() * 200) - 100,
          metrics: ["Exchange Inflows", "Whale Activity", "HODLer Behavior"]
        }
      },
      lastUpdated: Date.now()
    };
    
    setSentiment(mockSentiment);
    setLoading(false);
  };

  useEffect(() => {
    fetchSentiment();
  }, [symbol]);

  const getSentimentColor = (score: number) => {
    if (score > 20) return "text-green-500";
    if (score < -20) return "text-red-500";
    return "text-yellow-500";
  };

  const getFearGreedLevel = (index: number) => {
    if (index <= 25) return { label: "Extreme Fear", color: "text-red-600" };
    if (index <= 45) return { label: "Fear", color: "text-red-400" };
    if (index <= 55) return { label: "Neutral", color: "text-yellow-500" };
    if (index <= 75) return { label: "Greed", color: "text-green-400" };
    return { label: "Extreme Greed", color: "text-green-600" };
  };

  if (!sentiment) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Loading sentiment data...</div>
        </CardContent>
      </Card>
    );
  }

  const fearGreed = getFearGreedLevel(sentiment.fearGreedIndex);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Sentiment Analysis
          <Badge variant={
            sentiment.overall === "BULLISH" ? "default" : 
            sentiment.overall === "BEARISH" ? "destructive" : 
            "secondary"
          }>
            {sentiment.overall}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Sentiment */}
        <div className="border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">Overall Sentiment</div>
            <div className={`text-sm font-mono ${getSentimentColor(sentiment.score)}`}>
              {sentiment.score > 0 ? '+' : ''}{sentiment.score}
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                sentiment.score > 0 ? 'bg-green-500' : sentiment.score < 0 ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.abs(sentiment.score)}%` }}
            />
          </div>
        </div>

        {/* Fear & Greed Index */}
        <div className="border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">Fear & Greed Index</div>
            <div className={`text-sm font-mono ${fearGreed.color}`}>
              {sentiment.fearGreedIndex}
            </div>
          </div>
          <div className="text-xs text-center">
            <span className={fearGreed.color}>{fearGreed.label}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: `${sentiment.fearGreedIndex}%` }}
            />
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Source Breakdown</div>
          
          {/* Social Media */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="text-xs">
              <div>Social Media</div>
              <div className="text-muted-foreground">{sentiment.sources.social.mentions.toLocaleString()} mentions</div>
            </div>
            <div className={`text-xs font-mono ${getSentimentColor(sentiment.sources.social.score)}`}>
              {sentiment.sources.social.score > 0 ? '+' : ''}{sentiment.sources.social.score}
            </div>
          </div>

          {/* News */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="text-xs">
              <div>News Articles</div>
              <div className="text-muted-foreground">{sentiment.sources.news.articles} articles</div>
            </div>
            <div className={`text-xs font-mono ${getSentimentColor(sentiment.sources.news.score)}`}>
              {sentiment.sources.news.score > 0 ? '+' : ''}{sentiment.sources.news.score}
            </div>
          </div>

          {/* On-Chain */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="text-xs">
              <div>On-Chain Metrics</div>
              <div className="text-muted-foreground">{sentiment.sources.onchain.metrics.join(", ")}</div>
            </div>
            <div className={`text-xs font-mono ${getSentimentColor(sentiment.sources.onchain.score)}`}>
              {sentiment.sources.onchain.score > 0 ? '+' : ''}{sentiment.sources.onchain.score}
            </div>
          </div>
        </div>

        {/* Trading Signals */}
        <div className="border rounded p-3 space-y-2">
          <div className="text-xs font-medium">Sentiment Signals</div>
          <div className="space-y-1 text-xs">
            {sentiment.fearGreedIndex <= 25 && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">🚀</Badge>
                <span>Extreme fear = potential buying opportunity</span>
              </div>
            )}
            {sentiment.fearGreedIndex >= 75 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">⚠️</Badge>
                <span>Extreme greed = potential sell signal</span>
              </div>
            )}
            {Math.abs(sentiment.score) < 20 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">📊</Badge>
                <span>Neutral sentiment = range-bound market</span>
              </div>
            )}
          </div>
        </div>

        {/* Update */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Updated: {new Date(sentiment.lastUpdated).toLocaleTimeString()}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchSentiment}
            disabled={loading}
          >
            {loading ? "..." : "Refresh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}