import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  User
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  trigger: string;
  timeThreshold: number;
  escalationPath: {
    level: number;
    role: string;
    action: string;
    timeToEscalate: number;
  }[];
  isActive: boolean;
}

interface EscalationMatrixProps {
  tasks: TaskDisplay[];
}

const escalationRules: EscalationRule[] = [
  {
    id: '1',
    name: 'Standard Task Overdue',
    trigger: 'Task past due date',
    timeThreshold: 24,
    escalationPath: [
      { level: 1, role: 'Team Lead', action: 'Email notification', timeToEscalate: 2 },
      { level: 2, role: 'Partner/CA', action: 'Email + SMS alert', timeToEscalate: 24 },
      { level: 3, role: 'Senior Partner', action: 'Call + meeting request', timeToEscalate: 48 }
    ],
    isActive: true
  },
  {
    id: '2',
    name: 'Critical Task SLA Breach',
    trigger: 'Critical priority task overdue',
    timeThreshold: 2,
    escalationPath: [
      { level: 1, role: 'Partner/CA', action: 'Immediate notification', timeToEscalate: 0.5 },
      { level: 2, role: 'Senior Partner', action: 'Phone call', timeToEscalate: 2 },
      { level: 3, role: 'Managing Partner', action: 'Emergency meeting', timeToEscalate: 4 }
    ],
    isActive: true
  },
  {
    id: '3',
    name: 'Client Deadline Approaching',
    trigger: 'Client deadline within 48 hours',
    timeThreshold: 48,
    escalationPath: [
      { level: 1, role: 'Assigned Lawyer', action: 'Status update request', timeToEscalate: 1 },
      { level: 2, role: 'Partner/CA', action: 'Progress review meeting', timeToEscalate: 6 },
      { level: 3, role: 'Client Relations', action: 'Client communication', timeToEscalate: 12 }
    ],
    isActive: true
  }
];

const activeEscalations = [
  {
    id: '1',
    taskId: '1',
    title: 'Draft Response to DRC-01 Notice',
    caseNumber: 'CASE-2024-001',
    currentLevel: 2,
    escalatedTo: 'Mike Wilson (Partner)',
    escalatedAt: '2024-01-21T09:00:00',
    overdueDays: 1,
    priority: 'Critical',
    nextAction: 'Phone call scheduled',
    timeToNextEscalation: '22 hours'
  },
  {
    id: '2',
    taskId: '4',
    title: 'File Appeal with GSTAT',
    caseNumber: 'CASE-2024-002',
    currentLevel: 1,
    escalatedTo: 'John Smith (Team Lead)',
    escalatedAt: '2024-01-22T14:30:00',
    overdueDays: 0,
    priority: 'Medium',
    nextAction: 'Email notification sent',
    timeToNextEscalation: '18 hours'
  }
];

export const EscalationMatrix: React.FC<EscalationMatrixProps> = ({ tasks }) => {
  const [selectedRule, setSelectedRule] = useState<EscalationRule | null>(null);

  const getEscalationStats = () => {
    const overdueTasks = tasks.filter(t => t.status === 'Overdue');
    const escalatedTasks = tasks.filter(t => t.escalationLevel > 0);
    const criticalEscalations = escalatedTasks.filter(t => t.priority === 'Critical');
    
    return {
      totalOverdue: overdueTasks.length,
      totalEscalated: escalatedTasks.length,
      criticalEscalations: criticalEscalations.length,
      avgResolutionTime: '4.2 hours'
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
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Configure Rules
        </Button>
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
                            {escalation.caseNumber} • Overdue: {escalation.overdueDays} days
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
                          <Button size="sm" variant="destructive">
                            <Phone className="mr-2 h-3 w-3" />
                            Contact Now
                          </Button>
                          <Button size="sm" variant="outline">
                            <CheckCircle className="mr-2 h-3 w-3" />
                            Mark Resolved
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
            {escalationRules.map((rule, index) => (
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
                          Trigger: {rule.trigger} (within {rule.timeThreshold}h)
                        </CardDescription>
                      </div>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h4 className="font-medium">Escalation Path</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rule.escalationPath.map((level, levelIndex) => {
                          const ActionIcon = getActionIcon(level.action);
                          
                          return (
                            <div key={level.level} className="relative">
                              {levelIndex < rule.escalationPath.length - 1 && (
                                <div className="hidden md:block absolute top-8 right-0 w-8 h-0.5 bg-border translate-x-full" />
                              )}
                              
                              <div className="p-4 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge variant="secondary" className={getLevelColor(level.level)}>
                                    Level {level.level}
                                  </Badge>
                                  <ActionIcon className="h-4 w-4" />
                                </div>
                                
                                <h5 className="font-medium text-sm">{level.role}</h5>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {level.action}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Escalates in: {level.timeToEscalate}h
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
    </div>
  );
};