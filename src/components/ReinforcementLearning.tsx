import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Target, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface RLAgent {
  id: string;
  name: string;
  algorithm: 'DQN' | 'PPO' | 'A3C' | 'SAC' | 'TD3';
  state: 'training' | 'testing' | 'deployed' | 'optimizing';
  performance: number;
  episodes: number;
  winRate: number;
  avgReward: number;
  lastUpdate: number;
}

interface TrainingMetrics {
  episode: number;
  reward: number;
  loss: number;
  epsilon: number;
  winRate: number;
  avgReturn: number;
}

interface StrategyAction {
  timestamp: number;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reward: number;
  state: string;
  reasoning: string;
}

interface ReinforcementLearningProps {
  symbol: string;
  marketData: any[];
}

export const ReinforcementLearning: React.FC<ReinforcementLearningProps> = ({ symbol, marketData }) => {
  const [agents, setAgents] = useState<RLAgent[]>([]);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([]);
  const [recentActions, setRecentActions] = useState<StrategyAction[]>([]);
  const [activeTab, setActiveTab] = useState('agents');
  const [isTraining, setIsTraining] = useState(false);

  const initializeAgents = () => {
    const agentConfigs: RLAgent[] = [
      {
        id: 'dqn-001',
        name: 'Deep Q-Network Pro',
        algorithm: 'DQN',
        state: 'deployed',
        performance: 87.3,
        episodes: 15420,
        winRate: 68.4,
        avgReward: 0.0234,
        lastUpdate: Date.now() - 300000
      },
      {
        id: 'ppo-002',
        name: 'Proximal Policy Optimizer',
        algorithm: 'PPO',
        state: 'training',
        performance: 82.1,
        episodes: 8760,
        winRate: 64.7,
        avgReward: 0.0189,
        lastUpdate: Date.now() - 120000
      },
      {
        id: 'sac-003',
        name: 'Soft Actor-Critic Elite',
        algorithm: 'SAC',
        state: 'testing',
        performance: 91.2,
        episodes: 22340,
        winRate: 71.8,
        avgReward: 0.0267,
        lastUpdate: Date.now() - 180000
      },
      {
        id: 'td3-004',
        name: 'Twin Delayed DDPG',
        algorithm: 'TD3',
        state: 'optimizing',
        performance: 85.6,
        episodes: 12890,
        winRate: 66.2,
        avgReward: 0.0198,
        lastUpdate: Date.now() - 240000
      }
    ];
    setAgents(agentConfigs);
  };

  const generateTrainingMetrics = () => {
    const metrics: TrainingMetrics[] = [];
    for (let episode = 1; episode <= 100; episode++) {
      // Simulate training progression
      const progress = episode / 100;
      const baseReward = 0.01 + (progress * 0.02) + (Math.random() - 0.5) * 0.01;
      const loss = Math.max(0.001, 0.1 * Math.exp(-episode / 30) + Math.random() * 0.02);
      const epsilon = Math.max(0.01, 1.0 - progress * 0.99);
      const winRate = Math.min(80, 30 + progress * 50 + (Math.random() - 0.5) * 10);
      
      metrics.push({
        episode,
        reward: baseReward,
        loss,
        epsilon,
        winRate,
        avgReturn: baseReward * episode * 0.1
      });
    }
    setTrainingMetrics(metrics);
  };

  const generateRecentActions = () => {
    const actions: StrategyAction[] = [];
    const actionTypes: ('buy' | 'sell' | 'hold')[] = ['buy', 'sell', 'hold'];
    const reasonings = [
      'Strong upward momentum detected',
      'RSI oversold with bullish divergence',
      'Support level confirmed, risk/reward favorable',
      'Resistance broken with volume confirmation',
      'Market uncertainty, preserving capital',
      'Profit taking at key resistance',
      'Stop loss triggered on momentum shift',
      'Technical pattern completion signal'
    ];

    for (let i = 0; i < 20; i++) {
      const timestamp = Date.now() - (i * 900000); // 15 min intervals
      const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const confidence = 0.6 + Math.random() * 0.4;
      const reward = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
      
      actions.push({
        timestamp,
        action,
        confidence,
        reward,
        state: `Market: ${Math.random() > 0.5 ? 'Trending' : 'Ranging'}`,
        reasoning: reasonings[Math.floor(Math.random() * reasonings.length)]
      });
    }
    setRecentActions(actions);
  };

  const startTraining = async () => {
    setIsTraining(true);
    
    // Simulate training process
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAgents(prev => prev.map(agent => ({
        ...agent,
        episodes: agent.episodes + Math.floor(Math.random() * 50),
        performance: Math.min(100, agent.performance + Math.random() * 2),
        lastUpdate: Date.now()
      })));
    }
    
    setIsTraining(false);
  };

  useEffect(() => {
    initializeAgents();
    generateTrainingMetrics();
    generateRecentActions();
  }, [symbol]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'deployed': return 'bg-green-500';
      case 'training': return 'bg-blue-500';
      case 'testing': return 'bg-yellow-500';
      case 'optimizing': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-500';
      case 'sell': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getBestAgent = () => {
    return agents.reduce((best, current) => 
      current.performance > best.performance ? current : best, agents[0] || null
    );
  };

  const getTotalEpisodes = () => {
    return agents.reduce((sum, agent) => sum + agent.episodes, 0);
  };

  const getAvgPerformance = () => {
    return agents.length > 0 ? agents.reduce((sum, agent) => sum + agent.performance, 0) / agents.length : 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Reinforcement Learning Engine
        </CardTitle>
        <CardDescription>
          Adaptive AI agents learning optimal trading strategies for {symbol}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            {/* Agent Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{agents.length}</div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{getTotalEpisodes().toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Episodes</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{getAvgPerformance().toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{agent.name}</h4>
                      <p className="text-sm text-muted-foreground">{agent.algorithm}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStateColor(agent.state)}`} />
                      <Badge variant="outline" className="text-xs">
                        {agent.state}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance</span>
                      <span className="font-medium">{agent.performance.toFixed(1)}%</span>
                    </div>
                    <Progress value={agent.performance} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Episodes:</span>
                        <div className="font-medium">{agent.episodes.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate:</span>
                        <div className="font-medium">{agent.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-muted-foreground">Avg Reward:</span>
                      <span className="font-medium ml-2">{(agent.avgReward * 100).toFixed(2)}%</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(agent.lastUpdate).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={startTraining}
                disabled={isTraining}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {isTraining ? 'Training in Progress...' : 'Start Training Session'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold text-blue-500">
                  {trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1]?.reward.toFixed(3) : '0.000'}
                </div>
                <p className="text-xs text-muted-foreground">Latest Reward</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold text-green-500">
                  {trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1]?.winRate.toFixed(1) : '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold text-purple-500">
                  {trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1]?.loss.toFixed(4) : '0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">Training Loss</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold text-orange-500">
                  {trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1]?.epsilon.toFixed(3) : '0.000'}
                </div>
                <p className="text-xs text-muted-foreground">Epsilon</p>
              </div>
            </div>

            <div className="h-64">
              <h4 className="text-sm font-medium mb-3">Training Progress</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="episode" className="text-xs" />
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
                    dataKey="reward" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Reward"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="Win Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-48">
              <h4 className="text-sm font-medium mb-3">Loss & Exploration</h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trainingMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="episode" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="loss" 
                    stackId="1"
                    stroke="hsl(var(--destructive))" 
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.3}
                    name="Loss"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="epsilon" 
                    stackId="2"
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.3}
                    name="Epsilon"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Recent Agent Actions</h4>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-500">
                  Buy: {recentActions.filter(a => a.action === 'buy').length}
                </Badge>
                <Badge variant="outline" className="text-red-500">
                  Sell: {recentActions.filter(a => a.action === 'sell').length}
                </Badge>
                <Badge variant="outline" className="text-yellow-500">
                  Hold: {recentActions.filter(a => a.action === 'hold').length}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActions.map((action, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target className={`h-4 w-4 ${getActionColor(action.action)}`} />
                      <span className={`font-medium ${getActionColor(action.action)}`}>
                        {action.action.toUpperCase()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {(action.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${action.reward >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {action.reward >= 0 ? '+' : ''}{(action.reward * 100).toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{action.reasoning}</p>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">State:</span>
                    <Badge variant="secondary" className="text-xs">{action.state}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Best Performing Agent</h4>
                {getBestAgent() && (
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gold bg-yellow-500" />
                      <span className="font-medium">{getBestAgent().name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Performance:</span>
                        <div className="text-lg font-bold text-green-500">
                          {getBestAgent().performance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate:</span>
                        <div className="text-lg font-bold">
                          {getBestAgent().winRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Episodes completed:</span>
                      <span className="font-medium ml-2">{getBestAgent().episodes.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Performance Metrics</h4>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="text-sm">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{agent.performance.toFixed(1)}%</span>
                        <Progress value={agent.performance} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};