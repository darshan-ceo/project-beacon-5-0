import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  Target,
  Zap,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Task } from '@/contexts/AppStateContext';

interface TaskInsightsProps {
  tasks: Task[];
}

interface Insight {
  id: string;
  type: 'recommendation' | 'alert' | 'pattern' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'performance' | 'workload' | 'timeline' | 'resource';
  actionable: boolean;
  metrics?: {
    current: number;
    potential: number;
    unit: string;
  };
}

interface WorkloadPrediction {
  period: string;
  expectedTasks: number;
  capacity: number;
  utilization: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const TaskInsights: React.FC<TaskInsightsProps> = ({ tasks }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const insights = useMemo((): Insight[] => {
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const totalTasks = tasks.length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
    
    return [
      {
        id: '1',
        type: 'alert',
        title: 'High Overdue Rate Detected',
        description: `${overdueTasks} tasks are currently overdue (${((overdueTasks/totalTasks)*100).toFixed(1)}%). Consider reassigning or extending deadlines.`,
        impact: 'high',
        category: 'performance',
        actionable: true,
        metrics: {
          current: overdueTasks,
          potential: Math.max(0, overdueTasks - 3),
          unit: 'tasks'
        }
      },
      {
        id: '2',
        type: 'recommendation',
        title: 'Optimize Task Prioritization',
        description: 'Tasks marked as "High" priority are taking 23% longer to complete. Review priority assignments.',
        impact: 'medium',
        category: 'workload',
        actionable: true,
        metrics: {
          current: 5.2,
          potential: 4.0,
          unit: 'days'
        }
      },
      {
        id: '3',
        type: 'pattern',
        title: 'Peak Workload Pattern Identified',
        description: 'Tasks consistently pile up on Mondays and Fridays. Consider workload distribution.',
        impact: 'medium',
        category: 'timeline',
        actionable: true
      },
      {
        id: '4',
        type: 'opportunity',
        title: 'Automation Opportunity',
        description: 'Document review tasks could benefit from template automation, saving ~2 hours per task.',
        impact: 'high',
        category: 'resource',
        actionable: true,
        metrics: {
          current: 6.5,
          potential: 4.5,
          unit: 'hours'
        }
      },
      {
        id: '5',
        type: 'recommendation',
        title: 'Team Capacity Optimization',
        description: 'Sarah Johnson has 40% less workload than team average. Consider task redistribution.',
        impact: 'medium',
        category: 'workload',
        actionable: true
      },
      {
        id: '6',
        type: 'pattern',
        title: 'Seasonal Trend Detected',
        description: 'Tax-related tasks show 30% increase in Q4. Plan capacity accordingly.',
        impact: 'low',
        category: 'timeline',
        actionable: false
      }
    ];
  }, [tasks]);

  const workloadPredictions: WorkloadPrediction[] = [
    {
      period: 'Next Week',
      expectedTasks: 45,
      capacity: 50,
      utilization: 90,
      riskLevel: 'medium'
    },
    {
      period: 'Next Month',
      expectedTasks: 180,
      capacity: 200,
      utilization: 90,
      riskLevel: 'medium'
    },
    {
      period: 'Next Quarter',
      expectedTasks: 620,
      capacity: 600,
      utilization: 103,
      riskLevel: 'high'
    }
  ];

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return AlertCircle;
      case 'recommendation':
        return Lightbulb;
      case 'pattern':
        return TrendingUp;
      case 'opportunity':
        return Zap;
      default:
        return Brain;
    }
  };

  const getInsightColor = (type: Insight['type'], impact: Insight['impact']) => {
    if (type === 'alert') return 'border-destructive bg-destructive/5';
    if (impact === 'high') return 'border-warning bg-warning/5';
    if (impact === 'medium') return 'border-primary bg-primary/5';
    return 'border-muted bg-muted/20';
  };

  const getImpactBadge = (impact: Insight['impact']) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const;
    
    return <Badge variant={variants[impact]}>{impact.toUpperCase()}</Badge>;
  };

  const getRiskColor = (risk: WorkloadPrediction['riskLevel']) => {
    switch (risk) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-warning';
      default:
        return 'text-success';
    }
  };

  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Brain className="mr-2 h-6 w-6" />
            Task Insights
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered recommendations and workload predictions
          </p>
        </div>
      </motion.div>

      {/* Filter Categories */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex space-x-2"
      >
        {['all', 'performance', 'workload', 'timeline', 'resource'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Key Insights */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Insights List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
          {filteredInsights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className={`border-l-4 ${getInsightColor(insight.type, insight.impact)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">{insight.title}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getImpactBadge(insight.impact)}
                        <Badge variant="outline">{insight.type}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.description}
                    </p>
                    
                    {insight.metrics && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded">
                        <span>Current: {insight.metrics.current} {insight.metrics.unit}</span>
                        <span>Potential: {insight.metrics.potential} {insight.metrics.unit}</span>
                      </div>
                    )}
                    
                    {insight.actionable && (
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Workload Predictions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Workload Predictions</h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Capacity Forecast
              </CardTitle>
              <CardDescription>
                Predicted workload vs available capacity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadPredictions.map((prediction, index) => (
                  <motion.div
                    key={prediction.period}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-foreground">{prediction.period}</span>
                      <Badge variant="outline" className={getRiskColor(prediction.riskLevel)}>
                        {prediction.riskLevel.toUpperCase()} Risk
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Expected</p>
                        <p className="font-medium">{prediction.expectedTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Capacity</p>
                        <p className="font-medium">{prediction.capacity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilization</p>
                        <p className={`font-medium ${getRiskColor(prediction.riskLevel)}`}>
                          {prediction.utilization}%
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Redistribute Workload
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  Extend Deadlines
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Award className="mr-2 h-4 w-4" />
                  Apply Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Summary Alert */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Based on current patterns, implementing the top 3 recommendations could reduce 
            average task completion time by <strong>18%</strong> and improve team efficiency by <strong>12%</strong>.
          </AlertDescription>
        </Alert>
      </motion.div>
    </div>
  );
};