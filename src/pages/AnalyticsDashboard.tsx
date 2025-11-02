/**
 * Analytics Dashboard Page - Phase 3A
 * Comprehensive analytics and insights dashboard
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '@/hooks/useAnalytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Scale, Calendar, CheckCircle, Users, FileText, AlertTriangle,
  Download, RefreshCw, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';

const COLORS = ['#00C2A8', '#0B5FFF', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const AnalyticsDashboard: React.FC = () => {
  const [dateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });
  const { 
    caseMetrics, 
    hearingMetrics, 
    taskMetrics, 
    kpiDashboard,
    historicalCaseTrends,
    isLoading,
    refetchAll 
  } = useAnalytics({ dateRange });

  const handleRefresh = () => {
    refetchAll();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export analytics data');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpiData = kpiDashboard.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpiData && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <KPICard
            title="Active Cases"
            value={kpiData.caseMetrics.activeCases}
            trend={5}
            icon={<Scale className="h-5 w-5" />}
            color="blue"
          />
          <KPICard
            title="Completion Rate"
            value={`${kpiData.taskMetrics.completionRate}%`}
            trend={2}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
          />
          <KPICard
            title="Timeline Compliance"
            value={`${kpiData.complianceRate}%`}
            trend={-1}
            icon={<AlertTriangle className="h-5 w-5" />}
            color={kpiData.complianceRate >= 90 ? 'green' : 'amber'}
          />
          <KPICard
            title="Upcoming Hearings"
            value={kpiData.hearingMetrics.upcomingThisWeek}
            trend={3}
            icon={<Calendar className="h-5 w-5" />}
            color="purple"
          />
        </motion.div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Case Volume Trend (30 Days)</CardTitle>
                <CardDescription>Daily case creation and resolution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historicalCaseTrends.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0B5FFF" 
                      strokeWidth={2}
                      name="Cases"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Timeline Compliance */}
            {caseMetrics.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Timeline Compliance Status</CardTitle>
                  <CardDescription>Current case timeline distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'On Time', value: caseMetrics.data.timelineCompliance.green },
                          { name: 'At Risk', value: caseMetrics.data.timelineCompliance.amber },
                          { name: 'Breached', value: caseMetrics.data.timelineCompliance.red },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#00C2A8" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Performance Summary */}
          {kpiData && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Cases</p>
                    <p className="text-2xl font-bold">{kpiData.caseMetrics.totalCases}</p>
                    <p className="text-xs text-muted-foreground">
                      {kpiData.caseMetrics.activeCases} active, {kpiData.caseMetrics.completedCases} completed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Task Performance</p>
                    <p className="text-2xl font-bold">{kpiData.taskMetrics.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">
                      {kpiData.productivity.tasksCompletedThisWeek} completed this week
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                    <p className="text-2xl font-bold">{kpiData.productivity.avgResolutionTime}d</p>
                    <p className="text-xs text-muted-foreground">
                      Average task completion time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          {caseMetrics.data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cases by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(caseMetrics.data.stageDistribution).map(([stage, count]) => ({
                      stage,
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0B5FFF" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Critical Cases"
                  value={caseMetrics.data.criticalCases}
                  subtitle="Requiring immediate attention"
                  color="red"
                />
                <MetricCard
                  title="Average Age"
                  value={`${caseMetrics.data.averageAge}d`}
                  subtitle="Days since case creation"
                  color="blue"
                />
                <MetricCard
                  title="Active Cases"
                  value={caseMetrics.data.activeCases}
                  subtitle="Currently in progress"
                  color="green"
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Hearings Tab */}
        <TabsContent value="hearings" className="space-y-4">
          {hearingMetrics.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Hearing Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Scheduled', value: hearingMetrics.data.scheduled },
                          { name: 'Completed', value: hearingMetrics.data.completed },
                          { name: 'Adjourned', value: hearingMetrics.data.adjourned },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hearing Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Hearings</span>
                    <span className="font-bold">{hearingMetrics.data.totalHearings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <Badge variant="default">{hearingMetrics.data.completionRate}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upcoming This Week</span>
                    <span className="font-bold">{hearingMetrics.data.upcomingThisWeek}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {taskMetrics.data && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Tasks"
                value={taskMetrics.data.totalTasks}
                subtitle="All tasks"
                color="blue"
              />
              <MetricCard
                title="Completed"
                value={taskMetrics.data.completedTasks}
                subtitle={`${taskMetrics.data.completionRate}% completion rate`}
                color="green"
              />
              <MetricCard
                title="Open"
                value={taskMetrics.data.openTasks}
                subtitle="In progress"
                color="amber"
              />
              <MetricCard
                title="Overdue"
                value={taskMetrics.data.overdueTasks}
                subtitle="Past due date"
                color="red"
              />
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Coming soon - employee productivity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Team performance analytics will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    amber: 'border-amber-500',
    red: 'border-red-500',
  };

  return (
    <Card className={`border-l-4 ${colorClasses[color]}`}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
};
