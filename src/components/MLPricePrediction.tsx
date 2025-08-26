import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MLPrediction {
  timestamp: number;
  price: number;
  confidence: number;
  direction: 'up' | 'down' | 'sideways';
  model: string;
}

interface MLModel {
  name: string;
  type: 'LSTM' | 'Transformer' | 'GRU' | 'CNN' | 'Ensemble';
  accuracy: number;
  confidence: number;
  status: 'training' | 'ready' | 'predicting';
  lastUpdate: number;
}

interface MLPricePredictionProps {
  symbol: string;
  currentPrice: number;
}

export const MLPricePrediction: React.FC<MLPricePredictionProps> = ({ symbol, currentPrice }) => {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [models, setModels] = useState<MLModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  const initializeModels = () => {
    const modelConfigs: MLModel[] = [
      {
        name: 'Deep LSTM',
        type: 'LSTM',
        accuracy: 78.5,
        confidence: 85.2,
        status: 'ready',
        lastUpdate: Date.now() - 300000
      },
      {
        name: 'Transformer-XL',
        type: 'Transformer',
        accuracy: 82.1,
        confidence: 88.7,
        status: 'ready',
        lastUpdate: Date.now() - 180000
      },
      {
        name: 'CNN-GRU Hybrid',
        type: 'GRU',
        accuracy: 75.3,
        confidence: 81.4,
        status: 'training',
        lastUpdate: Date.now() - 600000
      },
      {
        name: 'Multi-Model Ensemble',
        type: 'Ensemble',
        accuracy: 84.7,
        confidence: 91.2,
        status: 'ready',
        lastUpdate: Date.now() - 120000
      }
    ];
    setModels(modelConfigs);
  };

  const generatePredictions = async () => {
    setLoading(true);
    
    // Simulate ML model predictions
    const timeframes = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    const interval = timeframes[selectedTimeframe as keyof typeof timeframes];
    const predictions: MLPrediction[] = [];
    
    for (let i = 1; i <= 24; i++) {
      const timestamp = Date.now() + (i * interval);
      
      // Simulate different model predictions with varying confidence
      const volatility = 0.02 + (Math.random() * 0.03); // 2-5% volatility
      const trend = Math.sin(i * 0.2) * 0.01; // Slight trend component
      const randomWalk = (Math.random() - 0.5) * volatility;
      
      const priceChange = trend + randomWalk;
      const predictedPrice = currentPrice * (1 + priceChange);
      
      const confidence = 60 + Math.random() * 35; // 60-95% confidence
      const direction = priceChange > 0.005 ? 'up' : priceChange < -0.005 ? 'down' : 'sideways';
      
      // Cycle through models
      const modelNames = ['Deep LSTM', 'Transformer-XL', 'CNN-GRU Hybrid', 'Multi-Model Ensemble'];
      const model = modelNames[i % modelNames.length];
      
      predictions.push({
        timestamp,
        price: predictedPrice,
        confidence,
        direction,
        model
      });
    }
    
    setPredictions(predictions);
    setLoading(false);
  };

  useEffect(() => {
    initializeModels();
    generatePredictions();
  }, [symbol, selectedTimeframe]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'training': return 'bg-yellow-500';
      case 'predicting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const chartData = predictions.slice(0, 12).map((pred, idx) => ({
    time: new Date(pred.timestamp).toLocaleTimeString(),
    predicted: pred.price,
    confidence: pred.confidence,
    current: idx === 0 ? currentPrice : null
  }));

  const avgConfidence = predictions.length > 0 
    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
    : 0;

  const consensusDirection = predictions.length > 0 
    ? predictions.slice(0, 6).reduce((acc, p) => {
        acc[p.direction] = (acc[p.direction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const strongestDirection = Object.entries(consensusDirection).reduce((a, b) => 
    consensusDirection[a[0]] > consensusDirection[b[0]] ? a : b, ['sideways', 0])[0];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ML Price Prediction
            </CardTitle>
            <CardDescription>
              Advanced machine learning models for {symbol} price forecasting
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {['15m', '1h', '4h', '1d'].map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Model Status */}
        <div>
          <h4 className="text-sm font-medium mb-3">Active Models</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {models.map((model, idx) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{model.name}</span>
                  <div className={`w-2 h-2 rounded-full ${getModelStatusColor(model.status)}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Accuracy</span>
                    <span>{model.accuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={model.accuracy} className="h-1" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {model.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Consensus Prediction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {getDirectionIcon(strongestDirection)}
              {strongestDirection.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Consensus Direction</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold">
              {avgConfidence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg Confidence</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold">
              {predictions.length > 0 ? predictions[0]?.price.toFixed(2) : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Next {selectedTimeframe} Target</p>
          </div>
        </div>

        {/* Price Prediction Chart */}
        <div className="h-64">
          <h4 className="text-sm font-medium mb-3">Price Prediction Chart</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
              />
              {chartData[0]?.current && (
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Predictions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Recent Predictions</h4>
            <Button 
              size="sm" 
              onClick={generatePredictions}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {predictions.slice(0, 6).map((prediction, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded text-xs">
                <div className="flex items-center gap-2">
                  {getDirectionIcon(prediction.direction)}
                  <span>{new Date(prediction.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${prediction.price.toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs">
                    {prediction.confidence.toFixed(0)}%
                  </Badge>
                  <span className="text-muted-foreground">{prediction.model}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};