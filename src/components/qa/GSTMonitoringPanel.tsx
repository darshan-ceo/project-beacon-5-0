import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Users,
  FileText
} from 'lucide-react';
import { envConfig } from '@/utils/envConfig';

interface GSTMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  activeConnections: number;
  lastUpdateTime: string;
}

interface GSTServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  responseTime?: number;
  errorCount: number;
}

export const GSTMonitoringPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<GSTMetrics>({
    totalRequests: 247,
    successRate: 98.2,
    averageResponseTime: 342,
    cacheHitRate: 76.8,
    activeConnections: 12,
    lastUpdateTime: new Date().toISOString()
  });

  const [services, setServices] = useState<GSTServiceStatus[]>([
    {
      name: 'GST Public API',
      status: 'online',
      lastCheck: new Date().toISOString(),
      responseTime: 285,
      errorCount: 0
    },
    {
      name: 'GSP Consent Service',
      status: 'online',
      lastCheck: new Date().toISOString(),
      responseTime: 156,
      errorCount: 1
    },
    {
      name: 'GST Cache Service',
      status: 'online',
      lastCheck: new Date().toISOString(),
      responseTime: 23,
      errorCount: 0
    },
    {
      name: 'Mock Data Service',
      status: envConfig.MOCK_ON ? 'online' : 'offline',
      lastCheck: new Date().toISOString(),
      responseTime: envConfig.MOCK_ON ? 45 : undefined,
      errorCount: 0
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMetrics(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
      successRate: 95 + Math.random() * 5,
      averageResponseTime: 200 + Math.random() * 300,
      cacheHitRate: 70 + Math.random() * 20,
      activeConnections: Math.floor(Math.random() * 20),
      lastUpdateTime: new Date().toISOString()
    }));

    setServices(prev => prev.map(service => ({
      ...service,
      lastCheck: new Date().toISOString(),
      responseTime: service.status === 'online' ? 50 + Math.random() * 400 : undefined
    })));
    
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'default',
      offline: 'destructive',
      degraded: 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">GST Monitoring</h2>
          <p className="text-muted-foreground">Real-time GST service health and performance</p>
        </div>
        <Button 
          onClick={refreshMetrics} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Environment Status Alert */}
      {envConfig.MOCK_ON && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Mock mode is enabled. GST services are using test data.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Last hour
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
                  <Progress value={metrics.successRate} className="mt-2" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics.averageResponseTime)}ms</div>
                  <p className="text-xs text-muted-foreground">
                    Average response time
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
                  <Progress value={metrics.cacheHitRate} className="mt-2" />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest GST service operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { time: '2 min ago', action: 'GST Profile fetched for GSTIN 24ABCDE1234F1Z5', status: 'success' },
                  { time: '5 min ago', action: 'GSP Consent OTP verified successfully', status: 'success' },
                  { time: '8 min ago', action: 'Signatory data imported for client ABC Industries', status: 'success' },
                  { time: '12 min ago', action: 'Cache invalidated for expired GST profiles', status: 'info' },
                  { time: '15 min ago', action: 'GST Public API rate limit reached', status: 'warning' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center space-x-3">
                      {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {activity.status === 'info' && <Activity className="h-4 w-4 text-blue-500" />}
                      <span className="text-sm">{activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                    {getStatusIcon(service.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(service.status)}
                      {service.responseTime && (
                        <span className="text-sm text-muted-foreground">
                          {service.responseTime}ms
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Errors: {service.errorCount}</span>
                      <span>
                        Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>GST service performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Response Time Trend</span>
                    <span className="text-sm text-muted-foreground">Last 24 hours</span>
                  </div>
                  <div className="h-32 bg-muted rounded flex items-end justify-center">
                    <span className="text-muted-foreground text-sm">Performance chart would go here</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm text-green-600">↓ 0.3% from yesterday</span>
                  </div>
                  <Progress value={1.8} className="h-2" />
                  <span className="text-xs text-muted-foreground">1.8% error rate</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Cache Efficiency</span>
                    <span className="text-sm text-green-600">↑ 2.1% from yesterday</span>
                  </div>
                  <Progress value={metrics.cacheHitRate} className="h-2" />
                  <span className="text-xs text-muted-foreground">{metrics.cacheHitRate.toFixed(1)}% cache hit rate</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};