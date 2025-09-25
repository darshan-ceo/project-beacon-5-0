import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  User,
  Plus,
  Filter,
  Search,
  Calendar,
  Bell,
  ArrowRight,
  FileText,
  Users,
  Target,
  TrendingUp,
  LayoutGrid,
  List
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';
import { StartTourButton } from '@/components/help/StartTourButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskBoard } from './TaskBoard';
import { TaskList } from './TaskList';
import { TaskAutomation } from './TaskAutomation';
import { EscalationMatrix } from './EscalationMatrix';
import { TaskTemplates } from './TaskTemplates';
import { TaskAnalytics } from './TaskAnalytics';
import { TaskInsights } from './TaskInsights';
import { AITaskAssistant } from './AITaskAssistant';
import { TaskCollaboration } from './TaskCollaboration';
import { TaskModal } from '@/components/modals/TaskModal';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskBundle {
  id: string;
  name: string;
  stage: string;
  tasks: string[];
  autoTrigger: boolean;
  sequenceRequired: boolean;
}


const taskBundles: TaskBundle[] = [
  {
    id: 'demand-response-bundle',
    name: 'Demand Notice Response',
    stage: 'Demand',
    tasks: ['draft-response', 'prepare-annexures', 'legal-review', 'client-approval'],
    autoTrigger: true,
    sequenceRequired: true
  },
  {
    id: 'adjudication-bundle',
    name: 'Adjudication Preparation',
    stage: 'Adjudication',
    tasks: ['file-response', 'evidence-compilation', 'hearing-prep'],
    autoTrigger: true,
    sequenceRequired: false
  },
  {
    id: 'appeal-bundle',
    name: 'Appeal Process',
    stage: 'Appeals',
    tasks: ['draft-appeal', 'grounds-preparation', 'precedent-research'],
    autoTrigger: true,
    sequenceRequired: true
  }
];

export const TaskManagement: React.FC = () => {
  const { state } = useAppState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | Task['priority']>('all');
  const [activeTab, setActiveTab] = useState('board');
  const [viewMode, setViewMode] = useState<'board' | 'list'>(() => {
    return (localStorage.getItem('task-view-mode') as 'board' | 'list') || 'board';
  });
  const [taskModal, setTaskModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; task?: Task | null }>({
    isOpen: false,
    mode: 'create',
    task: null
  });

  // Handle URL parameters for highlighting tasks and return context
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const caseId = searchParams.get('caseId');
    const returnTo = searchParams.get('returnTo');
    const returnCaseId = searchParams.get('returnCaseId');
    
    if (highlight) {
      setHighlightedTaskId(highlight);
      // Auto-scroll to highlighted task after a short delay
      setTimeout(() => {
        const element = document.getElementById(`task-${highlight}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
    
    if (caseId) {
      // Filter by case if provided
      setSearchTerm(caseId);
    }

    // Store return context if present
    if (returnTo && returnCaseId) {
      const returnContext = {
        returnTo,
        returnCaseId,
        returnStage: searchParams.get('returnStage'),
        fromUrl: window.location.pathname + window.location.search,
        timestamp: Date.now()
      };
      localStorage.setItem('navigation-context', JSON.stringify(returnContext));
    }
  }, [searchParams]);

  const filteredTasks = state.tasks.filter((task) => {
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    // Apply case filter if specified in URL parameters or navigation context
    const caseIdFromParams = searchParams.get('caseId');
    const navigationContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
    const contextCaseId = caseIdFromParams || navigationContext.returnCaseId;
    const matchesCase = !contextCaseId || task.caseId === contextCaseId;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCase;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success text-success-foreground';
      case 'In Progress': return 'bg-primary text-primary-foreground';
      case 'Review': return 'bg-warning text-warning-foreground';
      case 'Overdue': return 'bg-destructive text-destructive-foreground';
      case 'Not Started': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTaskStats = () => {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.status === 'Completed').length;
    const overdue = state.tasks.filter(t => t.status === 'Overdue').length;
    const inProgress = state.tasks.filter(t => t.status === 'In Progress').length;
    const autoGenerated = state.tasks.filter(t => t.isAutoGenerated).length;
    
    return { total, completed, overdue, inProgress, autoGenerated };
  };

  const stats = getTaskStats();

  // Return navigation handler
  const handleReturnToStageManagement = () => {
    const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
    if (returnContext.returnTo === 'stage-management' && returnContext.returnCaseId) {
      // Navigate back to case and open stage management
      navigate(`/cases?caseId=${returnContext.returnCaseId}`);
      
      // Clear return context
      localStorage.removeItem('navigation-context');
      
      // Signal to reopen stage dialog after navigation
      setTimeout(() => {
        const event = new CustomEvent('reopen-stage-dialog', { 
          detail: { 
            caseId: returnContext.returnCaseId,
            stageId: returnContext.returnStage 
          } 
        });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  // Check if we have return context
  const hasReturnContext = () => {
    try {
      const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
      return returnContext.returnTo === 'stage-management' && returnContext.returnCaseId;
    } catch {
      return false;
    }
  };

  // Get current case info for breadcrumb
  const getCurrentCaseInfo = () => {
    try {
      const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
      const caseId = searchParams.get('caseId') || returnContext.returnCaseId;
      const currentCase = state.cases.find(c => c.id === caseId);
      return currentCase ? { id: caseId, number: currentCase.caseNumber } : null;
    } catch {
      return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Return Navigation Breadcrumb */}
      {hasReturnContext() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-secondary/10 border border-secondary/20 rounded-lg p-3"
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Cases
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  {getCurrentCaseInfo()?.number || 'Case'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Stage Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tasks</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              Viewing tasks from Case Stage Management
              {highlightedTaskId && <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded">Highlighting: {highlightedTaskId}</span>}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToStageManagement}
              className="h-8"
            >
              <ArrowRight className="mr-2 h-3 w-3" />
              Back to Case Stage
            </Button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Task Automation & Management</h1>
          <p className="text-muted-foreground mt-2">
            Stage-based auto-task creation with escalation workflows and deadline management
          </p>
        </div>
        <div className="flex gap-2">
          <ContextualPageHelp pageId="task-automation" activeTab={activeTab} variant="resizable" />
          <StartTourButton tourId="task-automation-setup" text="Take Tour" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => {
                  setActiveTab('escalation');
                }}
                data-tour="escalations-button"
              >
                <Bell className="mr-2 h-4 w-4" />
                Escalations
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Manage task escalation rules and SLA monitoring for GST compliance deadlines</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-hover"
                onClick={() => setTaskModal({ isOpen: true, mode: 'create', task: null })}
                data-tour="create-task-button"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new task for GST case management with automatic workflow assignment</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
                <p className="text-xs text-success mt-1">{Math.round((stats.completed / stats.total) * 100)}% completion</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
                <p className="text-xs text-destructive mt-1">Needs escalation</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-Generated</p>
                <p className="text-2xl font-bold text-secondary">{stats.autoGenerated}</p>
                <p className="text-xs text-secondary mt-1">{Math.round((stats.autoGenerated / stats.total) * 100)}% automated</p>
              </div>
              <TrendingUp className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title or case number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            value={filterStatus}
            options={[
              { label: 'Completed', value: 'Completed' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Review', value: 'Review' },
              { label: 'Overdue', value: 'Overdue' },
              { label: 'Not Started', value: 'Not Started' }
            ]}
            onChange={(value) => setFilterStatus(value as 'all' | Task['status'])}
          />
          <FilterDropdown
            label="Priority"
            value={filterPriority}
            options={[
              { label: 'Critical', value: 'Critical' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' }
            ]}
            onChange={(value) => setFilterPriority(value as 'all' | Task['priority'])}
            icon={<User className="mr-2 h-4 w-4" />}
          />
          <Button 
            variant="outline"
            onClick={() => {
              toast({
                title: "Due Date Filter",
                description: "Date range picker coming soon",
              });
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Due Date
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8" data-tour="task-automation-tabs">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="board" data-tour="board-tab">Board</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Kanban-style task board organized by GST case stages and status</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="automation" data-tour="automation-tab">Automation</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Configure automatic task creation rules for GST workflow stages</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="escalation" data-tour="escalation-tab">Escalation</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Set up escalation rules and SLA monitoring for critical GST deadlines</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="templates" data-tour="templates-tab">Templates</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Manage GST task templates and bundles for consistent workflows</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="analytics" data-tour="analytics-tab">Analytics</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View task completion metrics and team performance analytics</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="insights" data-tour="insights-tab">Insights</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI-powered insights for task optimization and workflow improvements</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="ai-assistant" data-tour="ai-assistant-tab">AI Assistant</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI assistant for GST task suggestions and intelligent automation</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="collaboration" data-tour="collaboration-tab">Collaboration</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Real-time team collaboration with activity feeds and task comments</p>
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('board');
                  localStorage.setItem('task-view-mode', 'board');
                }}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Board View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('task-view-mode', 'list');
                }}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                List View
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTasks.length} tasks • {filteredTasks.filter(t => t.isAutoGenerated).length} auto-generated
            </div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === 'board' ? (
            <TaskBoard 
              tasks={filteredTasks.map(t => ({ ...t, assignedTo: t.assignedToName }))} 
              highlightedTaskId={highlightedTaskId}
            />
          ) : (
            <TaskList 
              tasks={filteredTasks.map(t => ({ ...t, assignedTo: t.assignedToName }))} 
              highlightedTaskId={highlightedTaskId}
            />
          )}
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <TaskAutomation />
        </TabsContent>

        <TabsContent value="escalation" className="mt-6">
          <EscalationMatrix tasks={state.tasks.map(t => ({ ...t, assignedToName: t.assignedToName }))} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TaskTemplates bundles={taskBundles} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <TaskAnalytics tasks={state.tasks} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <TaskInsights tasks={state.tasks} />
        </TabsContent>

        <TabsContent value="ai-assistant" className="mt-6">
          <AITaskAssistant />
        </TabsContent>

        <TabsContent value="collaboration" className="mt-6">
          <TaskCollaboration tasks={state.tasks} />
        </TabsContent>

        <TabsContent value="legacy-analytics" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Task Performance Metrics</CardTitle>
                <CardDescription>
                  Overall task completion and efficiency metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-sm text-muted-foreground">{Math.round((stats.completed / stats.total) * 100)}%</span>
                    </div>
                    <Progress value={(stats.completed / stats.total) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">On-Time Delivery</span>
                      <span className="text-sm text-muted-foreground">87%</span>
                    </div>
                    <Progress value={87} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Automation Rate</span>
                      <span className="text-sm text-muted-foreground">{Math.round((stats.autoGenerated / stats.total) * 100)}%</span>
                    </div>
                    <Progress value={(stats.autoGenerated / stats.total) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Escalation Trends</CardTitle>
                <CardDescription>
                  Task escalation patterns and resolution times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-success">24</p>
                      <p className="text-xs text-muted-foreground">Resolved at Level 1</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning">8</p>
                      <p className="text-xs text-muted-foreground">Escalated to Partner</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">2</p>
                      <p className="text-xs text-muted-foreground">Senior Partner Level</p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-sm font-medium mb-2">Average Resolution Time</p>
                    <p className="text-lg font-bold text-primary">2.4 hours</p>
                    <p className="text-xs text-success">15% faster than last month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <TaskModal
        isOpen={taskModal.isOpen}
        onClose={() => setTaskModal({ isOpen: false, mode: 'create', task: null })}
        task={taskModal.task}
        mode={taskModal.mode}
      />

      <ContextualPageHelp 
        pageId="task-automation"
        activeTab={activeTab}
        variant="resizable"
        className="fixed bottom-4 right-4 z-50"
      />
      </div>
    </TooltipProvider>
  );
};