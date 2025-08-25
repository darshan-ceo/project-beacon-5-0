import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  TrendingUp,
  FileText,
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
  slaStatus: 'Green' | 'Amber' | 'Red';
  client: string;
}

interface SLATrackerProps {
  cases: Case[];
}

interface SLAMetrics {
  formType: string;
  totalCases: number;
  onTime: number;
  breached: number;
  avgCompletionTime: number;
  slaHours: number;
}

const slaMetrics: SLAMetrics[] = [
  {
    formType: 'ASMT-10',
    totalCases: 45,
    onTime: 38,
    breached: 7,
    avgCompletionTime: 65,
    slaHours: 72
  },
  {
    formType: 'ASMT-11',
    totalCases: 32,
    onTime: 29,
    breached: 3,
    avgCompletionTime: 58,
    slaHours: 72
  },
  {
    formType: 'ASMT-12',
    totalCases: 28,
    onTime: 22,
    breached: 6,
    avgCompletionTime: 680,
    slaHours: 720
  },
  {
    formType: 'DRC-01',
    totalCases: 56,
    onTime: 48,
    breached: 8,
    avgCompletionTime: 145,
    slaHours: 168
  },
  {
    formType: 'DRC-07',
    totalCases: 23,
    onTime: 20,
    breached: 3,
    avgCompletionTime: 155,
    slaHours: 168
  }
];

const criticalCases = [
  {
    id: '1',
    caseNumber: 'CASE-2024-001',
    title: 'Tax Assessment Appeal - Acme Corp',
    form: 'ASMT-12',
    timeRemaining: '6 hours',
    status: 'Red',
    urgency: 'Critical'
  },
  {
    id: '2',
    caseNumber: 'CASE-2024-005',
    title: 'GST Demand Notice - TechStart',
    form: 'DRC-01',
    timeRemaining: '18 hours',
    status: 'Amber',
    urgency: 'High'
  },
  {
    id: '3',
    caseNumber: 'CASE-2024-008',
    title: 'Income Tax Assessment',
    form: 'ASMT-10',
    timeRemaining: '2 days',
    status: 'Amber',
    urgency: 'Medium'
  }
];

export const SLATracker: React.FC<SLATrackerProps> = ({ cases }) => {
  const getSLAColor = (status: string) => {
    switch (status) {
      case 'Green': return 'bg-success text-success-foreground';
      case 'Amber': return 'bg-warning text-warning-foreground';
      case 'Red': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateSLACompliance = (metric: SLAMetrics) => {
    return Math.round((metric.onTime / metric.totalCases) * 100);
  };

  return (
    <div className="space-y-6">
      {/* SLA Overview */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall SLA</p>
                <p className="text-2xl font-bold text-foreground">87.5%</p>
                <p className="text-xs text-success mt-1">+2.3% from last month</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Cases</p>
                <p className="text-2xl font-bold text-destructive">8</p>
                <p className="text-xs text-destructive mt-1">Require immediate attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold text-foreground">142h</p>
                <p className="text-xs text-success mt-1">12h faster than target</p>
              </div>
              <Clock className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time Delivery</p>
                <p className="text-2xl font-bold text-foreground">92%</p>
                <p className="text-xs text-success mt-1">Above target of 90%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Cases Alert */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Critical SLA Alerts
              </CardTitle>
              <CardDescription>
                Cases requiring immediate attention to avoid SLA breach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {criticalCases.map((case_, index) => (
                <motion.div
                  key={case_.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 bg-background rounded-lg border border-border/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{case_.title}</h4>
                      <p className="text-sm text-muted-foreground">{case_.caseNumber}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline">{case_.form}</Badge>
                        <Badge variant="secondary" className={getUrgencyColor(case_.urgency)}>
                          {case_.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-destructive">{case_.timeRemaining}</p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                      <Button size="sm" className="mt-2">
                        Take Action
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Form-wise SLA Performance */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Form-wise SLA Performance
              </CardTitle>
              <CardDescription>
                Compliance metrics for each form type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {slaMetrics.map((metric, index) => (
                <motion.div
                  key={metric.formType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{metric.formType}</h4>
                      <p className="text-sm text-muted-foreground">
                        {metric.totalCases} cases • Avg: {metric.avgCompletionTime}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {calculateSLACompliance(metric)}%
                      </p>
                      <p className="text-xs text-muted-foreground">compliance</p>
                    </div>
                  </div>
                  
                  <Progress 
                    value={calculateSLACompliance(metric)} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>On-time: {metric.onTime}</span>
                    <span>Breached: {metric.breached}</span>
                    <span>SLA: {metric.slaHours}h</span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* RAG Status Matrix */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              RAG Status Matrix
            </CardTitle>
            <CardDescription>
              Real-time SLA status across all active cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-success/10 rounded-lg border border-success/20">
                <div className="w-16 h-16 bg-success text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-success">89</h3>
                <p className="text-sm text-muted-foreground">Green Status</p>
                <p className="text-xs text-muted-foreground mt-1">Within SLA limits</p>
              </div>
              
              <div className="text-center p-6 bg-warning/10 rounded-lg border border-warning/20">
                <div className="w-16 h-16 bg-warning text-warning-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-warning">23</h3>
                <p className="text-sm text-muted-foreground">Amber Status</p>
                <p className="text-xs text-muted-foreground mt-1">Approaching deadline</p>
              </div>
              
              <div className="text-center p-6 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="w-16 h-16 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-destructive">8</h3>
                <p className="text-sm text-muted-foreground">Red Status</p>
                <p className="text-xs text-muted-foreground mt-1">SLA breached</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Last updated: Just now • Auto-refresh every 5 minutes
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Report
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};