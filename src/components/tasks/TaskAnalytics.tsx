import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  Target,
  ArrowRight,
  BarChart3,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Task } from '@/contexts/AppStateContext';

interface TaskAnalyticsProps {
  tasks: Task[];
}

interface PerformanceMetric {
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface TeamPerformance {
  employeeId: string;
  employeeName: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  overdueTasks: number;
  efficiency: number;
}

export const TaskAnalytics: React.FC<TaskAnalyticsProps> = ({ tasks }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
    
    // Priority distribution
    const priorityStats = {
      Critical: tasks.filter(t => t.priority === 'Critical').length,
      High: tasks.filter(t => t.priority === 'High').length,
      Medium: tasks.filter(t => t.priority === 'Medium').length,
      Low: tasks.filter(t => t.priority === 'Low').length,
    };

    // Stage distribution
    const stageStats = tasks.reduce((acc, task) => {
      acc[task.stage] = (acc[task.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Lock statistics
    const lockedTasks = tasks.filter(t => t.isLocked).length;
    const unlockedTasks = tasks.filter(t => !t.isLocked).length;
    const lockedPercentage = totalTasks > 0 ? (lockedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      inProgressTasks,
      completionRate,
      overdueRate,
      priorityStats,
      stageStats,
      lockedTasks,
      unlockedTasks,
      lockedPercentage
    };
  }, [tasks]);

  const performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Task Completion Rate',
      value: analytics.completionRate,
      previousValue: 82.3,
      unit: '%',
      trend: analytics.completionRate > 82.3 ? 'up' : 'down'
    },
    {
      label: 'Average Resolution Time',
      value: 4.2,
      previousValue: 4.8,
      unit: 'days',
      trend: 'up'
    },
    {
      label: 'Overdue Rate',
      value: analytics.overdueRate,
      previousValue: 12.1,
      unit: '%',
      trend: analytics.overdueRate < 12.1 ? 'up' : 'down'
    },
    {
      label: 'Tasks per Employee',
      value: 8.5,
      previousValue: 7.9,
      unit: 'tasks',
      trend: 'up'
    }
  ];

  const teamPerformance: TeamPerformance[] = [
    {
      employeeId: '1',
      employeeName: 'Sarah Johnson',
      tasksCompleted: 24,
      avgCompletionTime: 3.2,
      overdueTasks: 1,
      efficiency: 95.8
    },
    {
      employeeId: '2',
      employeeName: 'Mike Wilson',
      tasksCompleted: 18,
      avgCompletionTime: 4.1,
      overdueTasks: 2,
      efficiency: 88.9
    },
    {
      employeeId: '3',
      employeeName: 'John Smith',
      tasksCompleted: 21,
      avgCompletionTime: 3.8,
      overdueTasks: 0,
      efficiency: 100.0
    },
    {
      employeeId: '4',
      employeeName: 'Emily Davis',
      tasksCompleted: 15,
      avgCompletionTime: 5.2,
      overdueTasks: 3,
      efficiency: 80.0
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-success';
    if (efficiency >= 85) return 'text-warning';
    return 'text-destructive';
  };

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
          <h2 className="text-2xl font-bold text-foreground">Task Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Performance insights and productivity metrics
          </p>
        </div>
        <div className="flex space-x-2">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {performanceMetrics.map((metric, index) => (
          <Card key={metric.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-2xl font-bold text-foreground">
                      {metric.value.toFixed(1)}{metric.unit}
                    </p>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs {metric.previousValue.toFixed(1)}{metric.unit} last {selectedPeriod}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {index === 0 && <CheckCircle className="h-6 w-6 text-primary" />}
                  {index === 1 && <Clock className="h-6 w-6 text-primary" />}
                  {index === 2 && <AlertTriangle className="h-6 w-6 text-primary" />}
                  {index === 3 && <Users className="h-6 w-6 text-primary" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="priority">Priority Analysis</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>
                  Current task status breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Completed</span>
                    <Badge variant="default">{analytics.completedTasks}</Badge>
                  </div>
                  <Progress value={(analytics.completedTasks / analytics.totalTasks) * 100} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">In Progress</span>
                    <Badge variant="secondary">{analytics.inProgressTasks}</Badge>
                  </div>
                  <Progress value={(analytics.inProgressTasks / analytics.totalTasks) * 100} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overdue</span>
                    <Badge variant="destructive">{analytics.overdueTasks}</Badge>
                  </div>
                  <Progress value={(analytics.overdueTasks / analytics.totalTasks) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stage Distribution</CardTitle>
                <CardDescription>
                  Tasks across different case stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.stageStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([stage, count]) => (
                    <div key={stage} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{stage}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{count}</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${(count / analytics.totalTasks) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Task Lock Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Locked Tasks</p>
                      <p className="text-2xl font-bold text-amber-700">{analytics.lockedTasks}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Unlocked Tasks</p>
                      <p className="text-2xl font-bold">{analytics.unlockedTasks}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Lock Rate</span>
                      <span className="font-medium">{Math.round(analytics.lockedPercentage)}%</span>
                    </div>
                    <Progress value={analytics.lockedPercentage} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tasks are locked after the first follow-up to maintain audit integrity
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="priority" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Priority Analysis</CardTitle>
                <CardDescription>
                  Task distribution and completion rates by priority level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(analytics.priorityStats).map(([priority, count]) => (
                    <div key={priority} className="text-center p-4 rounded-lg border border-border">
                      <div className={`text-2xl font-bold ${
                        priority === 'Critical' ? 'text-destructive' :
                        priority === 'High' ? 'text-warning' :
                        priority === 'Medium' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {count}
                      </div>
                      <div className="text-sm font-medium text-foreground mt-1">{priority}</div>
                      <div className="text-xs text-muted-foreground">
                        {((count / analytics.totalTasks) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Individual performance metrics and efficiency scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance.map((member, index) => (
                    <motion.div
                      key={member.employeeId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-foreground">{member.employeeName}</h4>
                            <Badge 
                              variant="outline" 
                              className={getEfficiencyColor(member.efficiency)}
                            >
                              {member.efficiency.toFixed(1)}% Efficiency
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Completed Tasks</p>
                              <p className="font-medium text-foreground">{member.tasksCompleted}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg Completion Time</p>
                              <p className="font-medium text-foreground">{member.avgCompletionTime} days</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Overdue Tasks</p>
                              <p className={`font-medium ${member.overdueTasks > 0 ? 'text-destructive' : 'text-success'}`}>
                                {member.overdueTasks}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-16 text-center">
                          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Performance Trends
                </CardTitle>
                <CardDescription>
                  Key metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/20">
                    <span className="text-sm font-medium">Task Completion Rate</span>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">+5.2%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/20">
                    <span className="text-sm font-medium">Resolution Time</span>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">-12.5%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <span className="text-sm font-medium">Overdue Rate</span>
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="text-destructive font-medium">+2.1%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Goals & Targets
                </CardTitle>
                <CardDescription>
                  Progress towards performance goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Completion Rate Target</span>
                      <span className="text-sm text-muted-foreground">85.2% / 90%</span>
                    </div>
                    <Progress value={94.7} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overdue Reduction</span>
                      <span className="text-sm text-muted-foreground">8.3% / 5%</span>
                    </div>
                    <Progress value={60.4} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Team Efficiency</span>
                      <span className="text-sm text-muted-foreground">91.2% / 95%</span>
                    </div>
                    <Progress value={96.0} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};