import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Server, Activity, Settings, Play, Pause, RotateCcw } from 'lucide-react';

interface DeploymentConfig {
  provider: 'aws' | 'gcp' | 'azure' | 'digitalocean';
  region: string;
  instanceType: string;
  autoscaling: boolean;
  monitoring: boolean;
  backup: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  uptime: number;
  cpu: number;
  memory: number;
  requests: number;
  errors: number;
}

interface DeploymentMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  requests: number;
  latency: number;
  errors: number;
}

export const CloudDeployment: React.FC = () => {
  const [config, setConfig] = useState<DeploymentConfig>({
    provider: 'aws',
    region: 'us-east-1',
    instanceType: 't3.large',
    autoscaling: true,
    monitoring: true,
    backup: true
  });
  
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metrics, setMetrics] = useState<DeploymentMetrics[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const initializeServices = () => {
    const serviceConfigs: ServiceStatus[] = [
      {
        name: 'Trading Bot Engine',
        status: 'running',
        uptime: 2847600, // 33 days
        cpu: 45.2,
        memory: 67.8,
        requests: 15420,
        errors: 3
      },
      {
        name: 'ML Prediction Service',
        status: 'running',
        uptime: 2847600,
        cpu: 78.9,
        memory: 82.1,
        requests: 8934,
        errors: 1
      },
      {
        name: 'Market Data Feed',
        status: 'running',
        uptime: 2847600,
        cpu: 23.4,
        memory: 34.5,
        requests: 45780,
        errors: 0
      },
      {
        name: 'Risk Management',
        status: 'running',
        uptime: 2847600,
        cpu: 12.7,
        memory: 28.9,
        requests: 12340,
        errors: 2
      },
      {
        name: 'Alert System',
        status: 'running',
        uptime: 2847600,
        cpu: 8.3,
        memory: 15.2,
        requests: 3450,
        errors: 0
      },
      {
        name: 'Database Cluster',
        status: 'running',
        uptime: 2847600,
        cpu: 34.6,
        memory: 56.7,
        requests: 89230,
        errors: 5
      }
    ];
    setServices(serviceConfigs);
  };

  const generateMetrics = () => {
    const metricsData: DeploymentMetrics[] = [];
    const now = Date.now();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000); // Hourly data
      const baseCpu = 40 + Math.sin(i * 0.3) * 15 + Math.random() * 10;
      const baseMemory = 60 + Math.sin(i * 0.2) * 20 + Math.random() * 10;
      const baseRequests = 1000 + Math.sin(i * 0.1) * 500 + Math.random() * 200;
      
      metricsData.push({
        timestamp,
        cpu: Math.max(0, Math.min(100, baseCpu)),
        memory: Math.max(0, Math.min(100, baseMemory)),
        requests: Math.max(0, baseRequests),
        latency: 50 + Math.random() * 50,
        errors: Math.floor(Math.random() * 3)
      });
    }
    
    setMetrics(metricsData);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    // Simulate deployment process
    const steps = [
      'Preparing deployment package...',
      'Uploading to cloud provider...',
      'Configuring instances...',
      'Starting services...',
      'Running health checks...',
      'Deployment complete!'
    ];
    
    for (const step of steps) {
      console.log(step);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsDeploying(false);
  };

  const handleServiceAction = (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    setServices(prev => prev.map(service => {
      if (service.name === serviceName) {
        switch (action) {
          case 'start':
            return { ...service, status: 'running' as const };
          case 'stop':
            return { ...service, status: 'stopped' as const };
          case 'restart':
            return { ...service, status: 'deploying' as const };
          default:
            return service;
        }
      }
      return service;
    }));
    
    // Simulate restart completion
    if (action === 'restart') {
      setTimeout(() => {
        setServices(prev => prev.map(service => 
          service.name === serviceName 
            ? { ...service, status: 'running' as const, uptime: 0 }
            : service
        ));
      }, 3000);
    }
  };

  useEffect(() => {
    initializeServices();
    generateMetrics();
    
    // Update metrics every minute
    const interval = setInterval(() => {
      generateMetrics();
      
      // Update service metrics
      setServices(prev => prev.map(service => ({
        ...service,
        uptime: service.status === 'running' ? service.uptime + 60 : service.uptime,
        cpu: Math.max(0, Math.min(100, service.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, service.memory + (Math.random() - 0.5) * 5)),
        requests: service.requests + Math.floor(Math.random() * 100)
      })));
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'error': return 'bg-red-500';
      case 'deploying': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'stopped': return 'destructive';
      case 'error': return 'destructive';
      case 'deploying': return 'secondary';
      default: return 'outline';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getTotalRequests = () => {
    return services.reduce((sum, service) => sum + service.requests, 0);
  };

  const getTotalErrors = () => {
    return services.reduce((sum, service) => sum + service.errors, 0);
  };

  const getAverageCpu = () => {
    return services.length > 0 ? services.reduce((sum, service) => sum + service.cpu, 0) / services.length : 0;
  };

  const getAverageMemory = () => {
    return services.length > 0 ? services.reduce((sum, service) => sum + service.memory, 0) / services.length : 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Cloud Deployment & 24/7 Operation
        </CardTitle>
        <CardDescription>
          Manage and monitor your trading bot deployment across cloud providers
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* System Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-500">
                  {services.filter(s => s.status === 'running').length}
                </div>
                <p className="text-sm text-muted-foreground">Services Running</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">
                  {getTotalRequests().toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{getAverageCpu().toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Avg CPU Usage</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{getTotalErrors()}</div>
                <p className="text-sm text-muted-foreground">Total Errors</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
              <Button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {isDeploying ? 'Deploying...' : 'Deploy Updates'}
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configure Auto-scaling
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                View Logs
              </Button>
            </div>

            {/* Service Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div key={service.name} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{service.name}</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`} />
                      <Badge variant={getStatusBadgeVariant(service.status)} className="text-xs">
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>CPU</span>
                      <span>{service.cpu.toFixed(1)}%</span>
                    </div>
                    <Progress value={service.cpu} className="h-1" />
                    
                    <div className="flex justify-between text-xs">
                      <span>Memory</span>
                      <span>{service.memory.toFixed(1)}%</span>
                    </div>
                    <Progress value={service.memory} className="h-1" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <div>{formatUptime(service.uptime)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Requests:</span>
                      <div>{service.requests.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uptime: {formatUptime(service.uptime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleServiceAction(service.name, 'start')}
                        disabled={service.status === 'running'}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleServiceAction(service.name, 'stop')}
                        disabled={service.status === 'stopped'}
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleServiceAction(service.name, 'restart')}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>CPU</span>
                        <span>{service.cpu.toFixed(1)}%</span>
                      </div>
                      <Progress value={service.cpu} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Memory</span>
                        <span>{service.memory.toFixed(1)}%</span>
                      </div>
                      <Progress value={service.memory} className="h-2" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{service.requests.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Requests</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${service.errors > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {service.errors}
                      </div>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Deployment Configuration</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="provider">Cloud Provider</Label>
                    <Select value={config.provider} onValueChange={(value: any) => setConfig(prev => ({ ...prev, provider: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">Amazon Web Services</SelectItem>
                        <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                        <SelectItem value="azure">Microsoft Azure</SelectItem>
                        <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={config.region} onValueChange={(value) => setConfig(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="instance">Instance Type</Label>
                    <Select value={config.instanceType} onValueChange={(value) => setConfig(prev => ({ ...prev, instanceType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="t3.medium">t3.medium (2 vCPU, 4GB RAM)</SelectItem>
                        <SelectItem value="t3.large">t3.large (2 vCPU, 8GB RAM)</SelectItem>
                        <SelectItem value="c5.xlarge">c5.xlarge (4 vCPU, 8GB RAM)</SelectItem>
                        <SelectItem value="c5.2xlarge">c5.2xlarge (8 vCPU, 16GB RAM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Advanced Options</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Auto-scaling</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically scale based on demand
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.autoscaling}
                      onChange={(e) => setConfig(prev => ({ ...prev, autoscaling: e.target.checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Enhanced Monitoring</Label>
                      <p className="text-xs text-muted-foreground">
                        Detailed metrics and alerting
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.monitoring}
                      onChange={(e) => setConfig(prev => ({ ...prev, monitoring: e.target.checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Automated Backups</Label>
                      <p className="text-xs text-muted-foreground">
                        Daily snapshots and data backup
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.backup}
                      onChange={(e) => setConfig(prev => ({ ...prev, backup: e.target.checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button onClick={handleDeploy} disabled={isDeploying}>
                {isDeploying ? 'Deploying...' : 'Apply Configuration'}
              </Button>
              <Button variant="outline">
                Save as Template
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.cpu.toFixed(1) : '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">Current CPU</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.memory.toFixed(1) : '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">Current Memory</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.requests.toFixed(0) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">Requests/Hour</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-lg font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.latency.toFixed(0) : '0'}ms
                </div>
                <p className="text-xs text-muted-foreground">Avg Latency</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">System Performance (24h)</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg">
                  <h5 className="text-sm font-medium mb-3">Resource Usage</h5>
                  <div className="space-y-3">
                    {metrics.slice(-12).map((metric, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-xs w-16">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>CPU</span>
                            <span>{metric.cpu.toFixed(1)}%</span>
                          </div>
                          <Progress value={metric.cpu} className="h-1" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Memory</span>
                            <span>{metric.memory.toFixed(1)}%</span>
                          </div>
                          <Progress value={metric.memory} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h5 className="text-sm font-medium mb-3">Request & Error Rates</h5>
                  <div className="space-y-3">
                    {metrics.slice(-12).map((metric, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex gap-4 text-xs">
                          <span>Requests: {metric.requests.toFixed(0)}</span>
                          <span className={metric.errors > 0 ? 'text-red-500' : 'text-green-500'}>
                            Errors: {metric.errors}
                          </span>
                          <span>Latency: {metric.latency.toFixed(0)}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};