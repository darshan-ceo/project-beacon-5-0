import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { escalationService, type EscalationEvent } from '@/services/escalationService';
import { 
  AlertTriangle, 
  ArrowUp, 
  Clock, 
  Users,
  Bell,
  Mail,
  Phone,
  MessageSquare,
  Settings,
  Target,
  TrendingUp,
  CheckCircle,
  User,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

interface TaskDisplay {
  id: string;
  title: string;
  caseNumber: string;
  assignedToName: string;
  dueDate: string;
  status: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  escalationLevel: number;
}

interface EscalationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'task_overdue' | 'critical_sla' | 'client_deadline' | 'manual';
  conditions: {
    hoursOverdue?: number;
    priority?: TaskDisplay['priority'][];
    taskTypes?: string[];
  };
  actions: {
    notifyUsers: string[];
    escalateToRole?: string;
    createReminder?: boolean;
    emailTemplate?: string;
  };
  isActive: boolean;
}

interface EscalationMatrixProps {
  tasks: TaskDisplay[];
}

export const EscalationMatrix: React.FC<EscalationMatrixProps> = ({ tasks }) => {
  const [selectedRule, setSelectedRule] = useState<EscalationRule | null>(null);
  const [escalationRules, setEscalationRules] = useState<any[]>([]);
  const [activeEscalations, setActiveEscalations] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isConfigureRulesOpen, setIsConfigureRulesOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // RBAC permission checks
  const { hasPermission } = useAdvancedRBAC();
  const canManageEscalation = hasPermission('tasks.escalation', 'admin') || hasPermission('tasks.escalation', 'write');

  const loadEscalationData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rules, events] = await Promise.all([
        escalationService.getRules(),
        escalationService.getEvents()
      ]);
      setEscalationRules(rules);
      setAllEvents(events);
      
      // Transform events to display format - only pending/contacted ones
      const displayEvents = events
        .filter(e => e.status === 'pending' || e.status === 'contacted')
        .map(event => {
          const dueDate = event.task?.dueDate ? new Date(event.task.dueDate) : null;
          const overdueDays = dueDate ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
          
          return {
            id: event.id,
            taskId: event.taskId,
            title: event.task?.title || 'Unknown Task',
            caseNumber: event.task?.caseNumber || 'N/A',
            currentLevel: event.currentLevel || 1,
            escalatedTo: event.escalatedEmployee?.fullName || event.rule?.actions?.escalateToRole || 'Manager',
            escalatedAt: event.triggeredAt,
            triggeredAt: event.triggeredAt,
            resolvedAt: event.resolvedAt,
            overdueDays,
            priority: (event.task?.priority as 'Critical' | 'High' | 'Medium' | 'Low') || 'Medium',
            nextAction: event.status === 'contacted' ? 'Follow-up pending' : 'Awaiting response',
            timeToNextEscalation: event.currentLevel === 1 ? '24 hours' : event.currentLevel === 2 ? '12 hours' : '6 hours'
          };
        });
      
      setActiveEscalations(displayEvents);
    } catch (error) {
      console.error('Failed to load escalation data:', error);
      setActiveEscalations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAndEscalate = useCallback(async () => {
    try {
      setIsChecking(true);
      const count = await escalationService.checkAndEscalateOverdueTasks();
      if (count > 0) {
        toast({
          title: "Escalations Created",
          description: `${count} overdue task${count !== 1 ? 's' : ''} escalated`,
        });
        await loadEscalationData();
      } else {
        toast({
          title: "No New Escalations",
          description: "No overdue tasks match escalation rules",
        });
      }
    } catch (error) {
      console.error('Failed to check overdue tasks:', error);
      toast({
        title: "Check Failed",
        description: "Could not check for overdue tasks",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  }, [loadEscalationData]);

  useEffect(() => {
    loadEscalationData();
  }, [loadEscalationData]);

  const getEscalationStats = () => {
    // Calculate overdue based on due date, not status field
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'Completed' || t.status === 'Cancelled') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < now;
    });
    const escalatedTasks = tasks.filter(t => t.escalationLevel > 0);
    const criticalEscalations = activeEscalations.filter(e => e.priority === 'Critical');
    
    // Calculate real avg resolution time from resolved events
    const resolvedEvents = allEvents.filter(e => e.resolvedAt && e.triggeredAt);
    let avgResolutionTime = 'N/A';
    
    if (resolvedEvents.length > 0) {
      const totalMs = resolvedEvents.reduce((sum, e) => {
        const resolved = new Date(e.resolvedAt).getTime();
        const triggered = new Date(e.triggeredAt).getTime();
        return sum + (resolved - triggered);
      }, 0);
      const avgHours = (totalMs / resolvedEvents.length) / (1000 * 60 * 60);
      if (avgHours < 1) {
        avgResolutionTime = `${Math.round(avgHours * 60)} min`;
      } else {
        avgResolutionTime = `${avgHours.toFixed(1)} hours`;
      }
    }
    
    return {
      totalOverdue: overdueTasks.length,
      totalEscalated: activeEscalations.length,
      criticalEscalations: criticalEscalations.length,
      avgResolutionTime
    };
  };

  const stats = getEscalationStats();

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-warning text-warning-foreground';
      case 2: return 'bg-destructive text-destructive-foreground';
      case 3: return 'bg-purple-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Email')) return Mail;
    if (action.includes('SMS')) return MessageSquare;
    if (action.includes('Call') || action.includes('Phone')) return Phone;
    if (action.includes('meeting')) return Users;
    return Bell;
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
          <h2 className="text-2xl font-bold text-foreground">Escalation Matrix</h2>
          <p className="text-muted-foreground mt-1">
            Automated escalation workflows for overdue tasks and SLA breaches
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={checkAndEscalate}
            disabled={isChecking}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Overdue Tasks'}
          </Button>
          {canManageEscalation && (
            <Button variant="outline" onClick={() => setIsConfigureRulesOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Configure Rules
            </Button>
          )}
        </div>
      </motion.div>

      {/* Escalation Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-destructive">{stats.totalOverdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Escalated Tasks</p>
                <p className="text-2xl font-bold text-warning">{stats.totalEscalated}</p>
              </div>
              <ArrowUp className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Escalations</p>
                <p className="text-2xl font-bold text-destructive">{stats.criticalEscalations}</p>
              </div>
              <Target className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold text-success">{stats.avgResolutionTime}</p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Escalations</TabsTrigger>
          <TabsTrigger value="rules">Escalation Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                  Active Escalations
                </CardTitle>
                <CardDescription>
                  Tasks currently in escalation workflow requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activeEscalations.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Escalations</h3>
                    <p className="text-muted-foreground mb-4">
                      All tasks are on track. Click "Check Overdue Tasks" to scan for tasks needing escalation.
                    </p>
                    <Button variant="outline" onClick={checkAndEscalate} disabled={isChecking}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                      Check Overdue Tasks
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeEscalations.map((escalation, index) => (
                      <motion.div
                        key={escalation.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-foreground">{escalation.title}</h4>
                              <Badge variant="destructive" className={getLevelColor(escalation.currentLevel)}>
                                Level {escalation.currentLevel}
                              </Badge>
                              <Badge variant="outline">{escalation.priority}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {escalation.caseNumber} • Overdue: {escalation.overdueDays} day{escalation.overdueDays !== 1 ? 's' : ''}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Escalated To</p>
                                <p className="font-medium">{escalation.escalatedTo}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Next Action</p>
                                <p className="font-medium">{escalation.nextAction}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Next Escalation</p>
                                <p className="font-medium">{escalation.timeToNextEscalation}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={async () => {
                                try {
                                  await escalationService.markContacted(escalation.id, 'Contact initiated via escalation matrix');
                                  await loadEscalationData();
                                  toast({
                                    title: "Contact Initiated",
                                    description: "Escalation marked as contacted",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Failed to update",
                                    description: "Could not mark as contacted",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <Phone className="mr-2 h-3 w-3" />
                              Contact Now
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await escalationService.resolve(escalation.id, 'Resolved via escalation matrix');
                                  await loadEscalationData();
                                  toast({
                                    title: "Escalation Resolved",
                                    description: "Issue has been marked as resolved",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Failed to resolve",
                                    description: "Could not mark as resolved",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <CheckCircle className="mr-2 h-3 w-3" />
                              Mark Resolved
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {escalationRules.length > 0 ? escalationRules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <CardDescription>
                          Trigger: {rule.trigger} • {rule.description}
                        </CardDescription>
                      </div>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h4 className="font-medium">Escalation Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-muted/30">
                          <h5 className="font-medium text-sm mb-2">Conditions</h5>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            {rule.conditions.hoursOverdue && (
                              <p>• Overdue by {rule.conditions.hoursOverdue} hours</p>
                            )}
                            {rule.conditions.priority && rule.conditions.priority.length > 0 && (
                              <p>• Priority: {rule.conditions.priority.join(', ')}</p>
                            )}
                            {rule.conditions.taskTypes && rule.conditions.taskTypes.length > 0 && (
                              <p>• Task types: {rule.conditions.taskTypes.join(', ')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-lg border border-border bg-muted/30">
                          <h5 className="font-medium text-sm mb-2">Actions</h5>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            {rule.actions.notifyUsers && rule.actions.notifyUsers.length > 0 && (
                              <p>• Notify: {rule.actions.notifyUsers.join(', ')}</p>
                            )}
                            {rule.actions.escalateToRole && (
                              <p>• Escalate to: {rule.actions.escalateToRole}</p>
                            )}
                            {rule.actions.createReminder && (
                              <p>• Create reminder</p>
                            )}
                            {rule.actions.emailTemplate && (
                              <p>• Use template: {rule.actions.emailTemplate}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Escalation Rules Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up escalation rules to automatically handle overdue tasks and SLA breaches
                  </p>
                  <Button onClick={() => setIsConfigureRulesOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Rules
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Escalation Trends</CardTitle>
                <CardDescription>
                  Monthly escalation patterns and resolution metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">87%</p>
                      <p className="text-sm text-muted-foreground">Resolved at Level 1</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">13%</p>
                      <p className="text-sm text-muted-foreground">Required Higher Escalation</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Resolution Efficiency</span>
                      <span className="text-sm text-muted-foreground">87%</span>
                    </div>
                    <Progress value={87} />
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Average Resolution Time by Level</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Level 1</span>
                        <span className="font-medium">2.1 hours</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Level 2</span>
                        <span className="font-medium">6.4 hours</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Level 3</span>
                        <span className="font-medium">18.2 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators for escalation management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Prevention Rate</span>
                      <span className="text-lg font-bold text-success">92%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tasks completed before escalation threshold
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-lg font-bold text-primary">15 min</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average time to first escalation response
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Client Satisfaction</span>
                      <span className="text-lg font-bold text-success">4.8/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Client rating for escalation handling
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <TrendingUp className="h-5 w-5 text-success mb-2" />
                    <p className="text-sm text-success font-medium">
                      23% improvement in resolution time this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Configure Rules Modal */}
      {isConfigureRulesOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Configure Escalation Rules</h3>
            <div className="space-y-4 mb-6">
              {escalationRules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Button
                      size="sm"
                      variant={rule.isActive ? "default" : "outline"}
                      onClick={async () => {
                        try {
                          await escalationService.updateRule(rule.id, { isActive: !rule.isActive });
                          await loadEscalationData();
                          toast({
                            title: "Rule Updated",
                            description: `${rule.name} ${rule.isActive ? 'disabled' : 'enabled'}`,
                          });
                        } catch (error) {
                          toast({
                            title: "Update Failed",
                            description: "Could not update rule",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsConfigureRulesOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};