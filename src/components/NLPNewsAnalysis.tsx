import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  keywords: string[];
  entities: string[];
}

interface SentimentAnalysis {
  overall: number; // -1 to 1
  positive: number;
  negative: number;
  neutral: number;
  confidence: number;
  trend: '1h' | '4h' | '24h';
}

interface NLPNewsAnalysisProps {
  symbol: string;
}

export const NLPNewsAnalysis: React.FC<NLPNewsAnalysisProps> = ({ symbol }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('news');

  const generateMockNews = (): NewsItem[] => {
    const mockTitles = [
      `${symbol} Shows Strong Momentum Amid Institutional Adoption`,
      `Technical Analysis: ${symbol} Breaks Key Resistance Level`,
      `Market Alert: Whale Activity Detected in ${symbol}`,
      `${symbol} Network Upgrade Scheduled for Next Month`,
      `Regulatory Clarity Boosts ${symbol} Market Confidence`,
      `${symbol} Trading Volume Surges 300% in Past 24 Hours`,
      `Major Exchange Lists ${symbol} Perpetual Futures`,
      `${symbol} Developer Activity Reaches All-Time High`
    ];

    const sources = ['CoinDesk', 'CoinTelegraph', 'The Block', 'Decrypt', 'Bitcoin Magazine', 'CryptoNews'];
    
    return mockTitles.map((title, idx) => {
      const sentiment = Math.random() > 0.3 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral';
      const confidence = 0.6 + Math.random() * 0.4;
      
      return {
        id: `news-${idx}`,
        title,
        content: `Detailed analysis of ${title.toLowerCase()}. This news item discusses market trends, technical indicators, and potential price impacts for ${symbol}.`,
        source: sources[Math.floor(Math.random() * sources.length)],
        timestamp: Date.now() - (idx * 1800000), // 30 min intervals
        sentiment: sentiment as 'positive' | 'negative' | 'neutral',
        confidence,
        impact: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
        keywords: ['trading', 'analysis', symbol.toLowerCase(), 'market'],
        entities: [symbol, 'crypto', 'blockchain']
      };
    });
  };

  const calculateSentimentAnalysis = (news: NewsItem[]): SentimentAnalysis[] => {
    const timeframes = [
      { period: '1h', hours: 1 },
      { period: '4h', hours: 4 },
      { period: '24h', hours: 24 }
    ];

    return timeframes.map(({ period, hours }) => {
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      const relevantNews = news.filter(item => item.timestamp >= cutoff);
      
      if (relevantNews.length === 0) {
        return {
          overall: 0,
          positive: 33.33,
          negative: 33.33,
          neutral: 33.33,
          confidence: 0,
          trend: period as '1h' | '4h' | '24h'
        };
      }

      const totalWeight = relevantNews.reduce((sum, item) => sum + item.confidence, 0);
      const sentimentScores = relevantNews.map(item => {
        const score = item.sentiment === 'positive' ? 1 : item.sentiment === 'negative' ? -1 : 0;
        return score * item.confidence;
      });

      const weightedSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / totalWeight;
      
      const counts = relevantNews.reduce((acc, item) => {
        acc[item.sentiment]++;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0 });

      const total = relevantNews.length;
      
      return {
        overall: weightedSentiment,
        positive: (counts.positive / total) * 100,
        negative: (counts.negative / total) * 100,
        neutral: (counts.neutral / total) * 100,
        confidence: totalWeight / relevantNews.length,
        trend: period as '1h' | '4h' | '24h'
      };
    });
  };

  const fetchNews = async () => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockNews = generateMockNews();
    setNewsItems(mockNews);
    setSentiment(calculateSentimentAnalysis(mockNews));
    
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, [symbol]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSentimentBadgeVariant = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'default';
      case 'negative': return 'destructive';
      default: return 'secondary';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const formatSentimentScore = (score: number) => {
    if (score > 0.3) return 'Bullish';
    if (score < -0.3) return 'Bearish';
    return 'Neutral';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          NLP News Analysis
        </CardTitle>
        <CardDescription>
          Real-time sentiment analysis and news impact assessment for {symbol}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="news">Latest News</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="news" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Recent News Articles</h4>
              <Button size="sm" onClick={fetchNews} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {newsItems.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <h5 className="font-medium text-sm line-clamp-2">{item.title}</h5>
                    <div className="flex gap-2 ml-4">
                      <Badge variant={getSentimentBadgeVariant(item.sentiment)} className="text-xs">
                        {item.sentiment}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getImpactColor(item.impact)}`}>
                        {item.impact}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{item.source}</span>
                      <span className="text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Confidence:</span>
                      <Progress value={item.confidence * 100} className="w-16 h-2" />
                      <span>{(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-wrap">
                    {item.keywords.slice(0, 4).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4">
            <h4 className="text-sm font-medium">Sentiment Trends</h4>
            
            <div className="grid grid-cols-3 gap-4">
              {sentiment.map((s) => (
                <div key={s.trend} className="p-4 border rounded-lg space-y-3">
                  <div className="text-center">
                    <h5 className="font-medium">{s.trend.toUpperCase()}</h5>
                    <div className={`text-2xl font-bold ${s.overall > 0 ? 'text-green-500' : s.overall < 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                      {formatSentimentScore(s.overall)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score: {s.overall.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-500">Positive</span>
                      <span>{s.positive.toFixed(1)}%</span>
                    </div>
                    <Progress value={s.positive} className="h-2" />
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-red-500">Negative</span>
                      <span>{s.negative.toFixed(1)}%</span>
                    </div>
                    <Progress value={s.negative} className="h-2" />
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-500">Neutral</span>
                      <span>{s.neutral.toFixed(1)}%</span>
                    </div>
                    <Progress value={s.neutral} className="h-2" />
                  </div>
                  
                  <div className="text-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <h4 className="text-sm font-medium">Market Impact Analysis</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <h5 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Bullish Signals
                </h5>
                <div className="space-y-2">
                  {newsItems.filter(item => item.sentiment === 'positive').slice(0, 3).map((item) => (
                    <div key={item.id} className="text-sm">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Impact: {item.impact} | Confidence: {(item.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg space-y-3">
                <h5 className="font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Bearish Signals
                </h5>
                <div className="space-y-2">
                  {newsItems.filter(item => item.sentiment === 'negative').slice(0, 3).map((item) => (
                    <div key={item.id} className="text-sm">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Impact: {item.impact} | Confidence: {(item.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg space-y-3">
              <h5 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Key Market Movers
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newsItems
                  .filter(item => item.impact === 'high')
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{item.title}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant={getSentimentBadgeVariant(item.sentiment)} className="text-xs">
                          {item.sentiment}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};