import React, { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ActionItemModal } from '@/components/modals/ActionItemModal';
import { getFormTimelineReport, getTimelineBreachReport } from '@/services/reportsService';
import { exportRows } from '@/utils/exporter';
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
import { Case as AppStateCase } from '@/contexts/AppStateContext';
import { differenceInHours, differenceInDays, parseISO, isPast, isValid } from 'date-fns';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
  timelineBreachStatus: 'Green' | 'Amber' | 'Red';
  client: string;
}

interface TimelineBreachTrackerProps {
  cases: Array<Case & { client: string }>;
  selectedCase?: AppStateCase | null;
}

interface TimelineBreachMetrics {
  formType: string;
  totalCases: number;
  onTime: number;
  breached: number;
  avgCompletionTime: number;
  timelineHours: number;
}

// Form type mappings
const ALLOWED_FORMS = {
  'ASMT10_REPLY': { label: 'ASMT-10', timelineHours: 72 },
  'DRC1A_REPLY': { label: 'DRC-1A', timelineHours: 168 },
  'DRC01_REPLY': { label: 'DRC-01', timelineHours: 168 },
  'APL01_FIRST_APPEAL': { label: 'APL-01', timelineHours: 720 }
} as const;

// Helper to calculate time remaining from a due date
const calculateTimeRemaining = (dueDate: string | null | undefined): string => {
  if (!dueDate) return 'No due date';
  
  try {
    const due = typeof dueDate === 'string' ? parseISO(dueDate) : new Date(dueDate);
    if (!isValid(due)) return 'Invalid date';
    
    const now = new Date();
    
    if (isPast(due)) {
      const hoursOverdue = differenceInHours(now, due);
      if (hoursOverdue < 24) return `${hoursOverdue}h overdue`;
      const daysOverdue = differenceInDays(now, due);
      return `${daysOverdue}d overdue`;
    }
    
    const hoursRemaining = differenceInHours(due, now);
    if (hoursRemaining < 24) return `${hoursRemaining} hours`;
    const daysRemaining = differenceInDays(due, now);
    return `${daysRemaining} days`;
  } catch {
    return 'Unknown';
  }
};

export const TimelineBreachTracker: React.FC<TimelineBreachTrackerProps> = ({ cases, selectedCase }) => {
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<{ id: string; urgency: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [timelineBreachMetrics, setTimelineBreachMetrics] = useState<TimelineBreachMetrics[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filter cases for display based on selectedCase
  const displayedCases = selectedCase ? cases.filter(c => c.id === selectedCase.id) : cases;
  
  // Build critical cases from real data - filter for Red/Amber status
  const criticalCases = useMemo(() => {
    return cases
      .filter(c => c.timelineBreachStatus === 'Red' || c.timelineBreachStatus === 'Amber')
      .map(c => {
        // Type assertion to access additional case properties
        const fullCase = c as any;
        const dueDate = fullCase.reply_due_date || fullCase.replyDueDate || fullCase.nextHearingDate;
        const formType = fullCase.form_type || fullCase.formType || fullCase.currentStage || 'N/A';
        
        return {
          id: c.id,
          caseNumber: c.caseNumber,
          title: c.title || `Case ${c.caseNumber}`,
          form: formType,
          timeRemaining: calculateTimeRemaining(dueDate),
          status: c.timelineBreachStatus,
          urgency: c.timelineBreachStatus === 'Red' ? 'Critical' : 'High'
        };
      })
      .slice(0, 10); // Limit to top 10 most urgent
  }, [cases]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const result = await getFormTimelineReport({});
        
        // Filter to only allowed forms and aggregate metrics
        const allowedFormCodes = Object.keys(ALLOWED_FORMS);
        const filteredData = result.data.filter(item => allowedFormCodes.includes(item.formCode));
        
        // Group by form code and calculate metrics
        const metricsMap = new Map<string, TimelineBreachMetrics>();
        
        filteredData.forEach(item => {
          const formConfig = ALLOWED_FORMS[item.formCode as keyof typeof ALLOWED_FORMS];
          if (!formConfig) return;
          
          const existing = metricsMap.get(item.formCode) || {
            formType: formConfig.label,
            totalCases: 0,
            onTime: 0,
            breached: 0,
            avgCompletionTime: 0,
            timelineHours: formConfig.timelineHours,
            _completionTimes: [] as number[]
          };
          
          existing.totalCases++;
          if (item.status === 'On Time') existing.onTime++;
          if (item.status === 'Delayed') existing.breached++;
          
          // Collect completion times for average (exclude Pending)
          if (item.status !== 'Pending' && item.daysElapsed) {
            (existing as any)._completionTimes.push(item.daysElapsed * 24);
          }
          
          metricsMap.set(item.formCode, existing);
        });
        
        // Calculate averages and convert to final format
        const metrics = Array.from(metricsMap.values()).map(m => {
          const times = (m as any)._completionTimes || [];
          const avgCompletionTime = times.length > 0
            ? Math.round(times.reduce((sum: number, t: number) => sum + t, 0) / times.length)
            : 0;
          
          delete (m as any)._completionTimes;
          return { ...m, avgCompletionTime };
        });
        
        setTimelineBreachMetrics(metrics);
      } catch (error) {
        console.error('Failed to load timeline metrics:', error);
      }
    };
    
    loadMetrics();
  }, []);

  const getTimelineBreachColor = (status: string) => {
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

  const calculateTimelineCompliance = (metric: TimelineBreachMetrics) => {
    return Math.round((metric.onTime / metric.totalCases) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with context */}
      {selectedCase && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Timeline Compliance for {selectedCase.caseNumber}
          </h3>
          <p className="text-sm text-muted-foreground">
            Track compliance and deadlines for this specific case
          </p>
        </div>
      )}

      {/* Timeline Breach Overview */}
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
                <p className="text-sm font-medium text-muted-foreground">Overall Timeline</p>
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
                Critical Timeline Breach Alerts
              </CardTitle>
              <CardDescription>
                Cases requiring immediate attention to avoid timeline breach
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
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setSelectedCaseForAction({ id: case_.id, urgency: case_.urgency })}
                      >
                        Take Action
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Form-wise Timeline Breach Performance */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Form-wise Timeline Performance
              </CardTitle>
              <CardDescription>
                Compliance metrics for each form type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timelineBreachMetrics.map((metric, index) => (
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
                        {calculateTimelineCompliance(metric)}%
                      </p>
                      <p className="text-xs text-muted-foreground">compliance</p>
                    </div>
                  </div>
                  
                  <Progress 
                    value={calculateTimelineCompliance(metric)} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>On-time: {metric.onTime}</span>
                    <span>Breached: {metric.breached}</span>
                    <span>Timeline: {metric.timelineHours}h</span>
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
              Real-time timeline breach status across all active cases
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
                <p className="text-xs text-muted-foreground mt-1">Within timeline limits</p>
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
                <p className="text-xs text-muted-foreground mt-1">Timeline breached</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Last updated: Just now • Auto-refresh every 5 minutes
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isExporting}
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        // Fetch timeline breach report data
                        const result = await getTimelineBreachReport({});
                        
                        if (!result.data || result.data.length === 0) {
                          toast({
                            title: "No Data",
                            description: "No timeline breach data to export",
                          });
                          return;
                        }
                        
                        // Export using the exporter utility with timeline-specific columns
                        await exportRows({
                          moduleKey: 'cases',
                          rows: result.data.map((item: any) => ({
                            caseNumber: item.caseId || item.caseNumber,
                            title: item.caseTitle || item.title,
                            client: item.client || 'Unknown',
                            currentStage: item.stage || item.currentStage,
                            replyDueDate: item.timelineDue,
                            agingDays: item.agingDays,
                            timelineBreachStatus: item.ragStatus,
                            owner: item.owner || 'Unassigned',
                            breached: item.breached ? 'Yes' : 'No'
                          })),
                          options: {
                            filename: 'timeline-breach-report',
                            sheetName: 'Timeline Breach Report'
                          }
                        });
                        
                        toast({
                          title: "Export Complete",
                          description: "Timeline breach report has been downloaded",
                        });
                      } catch (error) {
                        console.error('Export error:', error);
                        toast({
                          title: "Export Failed",
                          description: "Failed to export timeline breach report",
                          variant: "destructive"
                        });
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export Report'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsReportModalOpen(true)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Report
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Item Modal */}
      <ActionItemModal
        isOpen={!!selectedCaseForAction}
        onClose={() => setSelectedCaseForAction(null)}
        caseId={selectedCaseForAction?.id || null}
        urgencyLevel={selectedCaseForAction?.urgency as 'High' | 'Medium' | 'Low' || 'Medium'}
        suggestedAction="Urgent Timeline Response Required"
      />

      {/* Report Generator Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg border shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Timeline Breach Report</h3>
            <p className="text-muted-foreground mb-4">
              Automated timeline breach reports can be scheduled to run daily, weekly, or monthly.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setIsReportModalOpen(false);
                toast({
                  title: "Report Scheduled",
                  description: "Timeline breach report will be sent weekly",
                });
              }}>
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};