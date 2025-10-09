import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { reportsService } from '@/services/reportsService';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Scale,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { formatDateForDisplay } from '@/utils/dateFormatters';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart as RechartsPieChart, Cell, LineChart, Line } from 'recharts';
import { InlineHelp } from '@/components/help/InlineHelp';
import { PageHelp } from '@/components/help/PageHelp';
import { QuickActionsPanel } from '@/components/qa/QuickActionsPanel';
import { GlossaryText, GlossaryDescription } from '@/components/ui/glossary-enhanced';
import { HearingMiniCalendar } from './HearingMiniCalendar';

interface DashboardFilters {
  clientId?: string;
  stage?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  timePeriod: '7d' | '30d' | '90d' | '1y';
}

export const EnhancedDashboard: React.FC = () => {
  const { state } = useAppState();
  const { currentUser } = useRBAC();
  const [filters, setFilters] = useState<DashboardFilters>({
    timePeriod: '30d'
  });
  const [isExporting, setIsExporting] = useState(false);

  // Calculate filtered data based on current filters
  const filteredData = useMemo(() => {
    let cases = state.cases;
    let tasks = state.tasks;
    let hearings = state.hearings || [];

    if (filters.clientId) {
      cases = cases.filter(c => c.clientId === filters.clientId);
      tasks = tasks.filter(t => t.clientId === filters.clientId);
    }

    if (filters.stage) {
      cases = cases.filter(c => c.currentStage === filters.stage);
    }

    // Date filtering would be implemented here for real data
    
    return { cases, tasks, hearings };
  }, [state, filters]);

  // Calculate Timeline Breach metrics
  const timelineMetrics = useMemo(() => {
    const timelineCount = {
      Green: filteredData.cases.filter(c => (c.timelineBreachStatus || c.slaStatus) === 'Green').length,
      Amber: filteredData.cases.filter(c => (c.timelineBreachStatus || c.slaStatus) === 'Amber').length,
      Red: filteredData.cases.filter(c => (c.timelineBreachStatus || c.slaStatus) === 'Red').length
    };
    return timelineCount;
  }, [filteredData.cases]);

  // Timeline breaches in next 10 days
  const upcomingBreaches = useMemo(() => {
    return filteredData.cases.filter(c => 
      (c.timelineBreachStatus || c.slaStatus) === 'Amber' || 
      (c.timelineBreachStatus || c.slaStatus) === 'Red'
    ).length;
  }, [filteredData.cases]);

  // Upcoming hearings (next 7 days)
  const upcomingHearings = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return filteredData.hearings.filter(h => {
      const hearingDate = new Date(h.date);
      return hearingDate >= today && hearingDate <= nextWeek;
    });
  }, [filteredData.hearings]);

  // Chart data
  const caseStageData = useMemo(() => {
    const stageCount: Record<string, number> = {};
    filteredData.cases.forEach(c => {
      stageCount[c.currentStage] = (stageCount[c.currentStage] || 0) + 1;
    });
    
    return Object.entries(stageCount).map(([stage, count]) => ({
      stage,
      count,
      fill: `hsl(var(--chart-${Object.keys(stageCount).indexOf(stage) + 1}))`
    }));
  }, [filteredData.cases]);

  const timelineData = [
    { status: 'Green', count: timelineMetrics.Green, fill: 'hsl(var(--success))' },
    { status: 'Amber', count: timelineMetrics.Amber, fill: 'hsl(var(--warning))' },
    { status: 'Red', count: timelineMetrics.Red, fill: 'hsl(var(--destructive))' }
  ];

  // Client-wise case summary
  const clientSummary = useMemo(() => {
    const clientMap: Record<string, { name: string; cases: number; activeCases: number }> = {};
    
    filteredData.cases.forEach(c => {
      const client = state.clients.find(cl => cl.id === c.clientId);
      if (client) {
        if (!clientMap[client.id]) {
          clientMap[client.id] = { name: client.name, cases: 0, activeCases: 0 };
        }
        clientMap[client.id].cases++;
        // All cases are considered active for this demo
        clientMap[client.id].activeCases++;
      }
    });

    return Object.values(clientMap).slice(0, 5); // Top 5 clients
  }, [filteredData.cases, state.clients]);

  const handleExport = async (type: 'dashboard' | 'cases' | 'hearings') => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'dashboard':
          await reportsService.exportDashboardData({
            stats: [
              { title: 'Active Clients', value: state.clients.filter(c => c.status === 'Active').length, description: 'Total active clients' },
              { title: 'Open Cases', value: filteredData.cases.length, description: 'Cases in progress' },
              { title: 'Timeline Green', value: timelineMetrics.Green, description: 'Cases on track' },
              { title: 'Upcoming Hearings', value: upcomingHearings.length, description: 'Next 7 days' }
            ],
            charts: [
              { title: 'Cases by Stage', data: caseStageData },
              { title: 'Timeline Status', data: timelineData }
            ],
            period: filters.timePeriod
          }, 'excel');
          break;
        case 'cases':
          await reportsService.exportCaseList(filteredData.cases, 'excel', {
            clientId: filters.clientId,
            stage: filters.stage
          });
          break;
        case 'hearings':
          await reportsService.exportHearingCauseList(upcomingHearings, 'excel');
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Practice Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Comprehensive insights and metrics for {currentUser.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageHelp pageId="dashboard" variant="floating" />
            <InlineHelp module="dashboard" />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Select
            value={filters.clientId || 'all'}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              clientId: value === 'all' ? undefined : value 
            }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {state.clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.stage || 'all'}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              stage: value === 'all' ? undefined : value 
            }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="Scrutiny">Scrutiny</SelectItem>
              <SelectItem value="Demand">Demand</SelectItem>
              <SelectItem value="Adjudication">Adjudication</SelectItem>
              <SelectItem value="Appeals">Appeals</SelectItem>
              <SelectItem value="GSTAT">GSTAT</SelectItem>
              <SelectItem value="HC">HC</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.timePeriod}
            onValueChange={(value: '7d' | '30d' | '90d' | '1y') => setFilters(prev => ({ 
              ...prev, 
              timePeriod: value 
            }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => handleExport('dashboard')}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {state.clients.filter(c => c.status === 'Active').length}
            </div>
            <p className="text-xs text-muted-foreground">Total active clients</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Cases
            </CardTitle>
            <Scale className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {filteredData.cases.length}
            </div>
            <p className="text-xs text-muted-foreground">Cases in progress</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timeline Status
            </CardTitle>
            <Activity className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-success text-success-foreground">
                {timelineMetrics.Green}
              </Badge>
              <Badge variant="secondary" className="bg-warning text-warning-foreground">
                {timelineMetrics.Amber}
              </Badge>
              <Badge variant="destructive">
                {timelineMetrics.Red}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Green / Amber / Red</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Hearings
            </CardTitle>
            <Calendar className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {upcomingHearings.length}
            </div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timeline Breaches
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {upcomingBreaches}
            </div>
            <p className="text-xs text-muted-foreground">At-risk cases (Amber/Red)</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Stage Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  Cases by Stage
                </CardTitle>
                <CardDescription>Distribution across workflow stages</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleExport('cases')}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px]">
                <BarChart data={caseStageData}>
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline Performance (Desktop) / Hearing Mini-Calendar (Mobile/Tablet) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Desktop: Show Timeline Performance */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-primary" />
                  Timeline Performance
                </CardTitle>
                <CardDescription>Current timeline compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <RechartsPieChart data={timelineData} cx="50%" cy="50%" outerRadius={80}>
                    {timelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Mobile/Tablet: Show Hearing Mini-Calendar */}
          <div className="block lg:hidden">
            <HearingMiniCalendar />
          </div>
        </motion.div>
      </div>

      {/* Client Summary & Upcoming Hearings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client-wise Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Top Clients Summary
              </CardTitle>
              <CardDescription>Client-wise case distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientSummary.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.activeCases} active / {client.cases} total
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {client.cases} cases
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Hearings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  Upcoming Hearings
                </CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleExport('hearings')}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingHearings.slice(0, 5).map((hearing, index) => (
                  <div key={index} className="flex items-start space-x-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Hearing {hearing.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateForDisplay(hearing.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hearing.courtId || 'Court TBD'}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingHearings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming hearings
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <QuickActionsPanel />
      </motion.div>
    </div>
  );
};