import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { navigationContextService } from '@/services/navigationContextService';
import { uiStateService } from '@/services/uiStateService';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  User,
  Plus,
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
import { UnifiedTaskSearch } from './UnifiedTaskSearch';
import { Task, Client, useAppState } from '@/contexts/AppStateContext';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { storageManager } from '@/data/StorageManager';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpButton } from '@/components/ui/help-button';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';
import { MigrationBanner } from './MigrationBanner';
import { Lock } from 'lucide-react';

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

// Helper function to enrich tasks with client and assignee names
const enrichTasksWithClientNames = (tasks: Task[], clients: Client[]): Array<Task & { assignedTo: string; clientName?: string }> => {
  return tasks.map(task => {
    const client = clients.find(c => c.id === task.clientId);
    return {
      ...task,
      assignedTo: task.assignedToName,
      clientName: client?.name || undefined
    };
  });
};

export const TaskManagement: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('board');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  
  // Load view mode from storage
  useEffect(() => {
    uiStateService.getViewMode('task-management', 'board').then(mode => {
      setViewMode(mode as 'board' | 'list');
    });
  }, []);
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
    const statusParam = searchParams.get('status');
    const filterParam = searchParams.get('filter');
    
    // Read status from URL for drill-down filtering
    if (statusParam && ['Pending', 'In Progress', 'Overdue', 'Completed', 'Review', 'Not Started'].includes(statusParam)) {
      setActiveFilters(prev => ({ ...prev, status: statusParam }));
    }
    
    // Handle filter parameter for special filters like followups_due
    if (filterParam === 'followups_due') {
      setActiveFilters(prev => ({ ...prev, status: 'followups_due' }));
    } else if (filterParam === 'updated_today') {
      setActiveFilters(prev => ({ ...prev, status: 'updated_today' }));
    }
    
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
    
    // Don't inject caseId into search box - it's handled separately via matchesCase filter

    // Store return context if present
    if (returnTo && returnCaseId) {
      const returnContext = {
        returnTo,
        returnCaseId,
        returnStage: searchParams.get('returnStage'),
        fromUrl: window.location.pathname + window.location.search,
        timestamp: Date.now()
      };
      navigationContextService.saveContext(returnContext);
    }
  }, [searchParams]);

  const filteredTasks = state.tasks.filter((task) => {
    // Build lookups for enriched search
    const client = state.clients.find(c => c.id === task.clientId);
    const clientName = client?.name || '';
    const relatedCase = state.cases.find(c => c.id === task.caseId);
    const caseNumber = task.caseNumber || relatedCase?.caseNumber || '';
    
    // Expanded search: title, description, case number, client name, assignees
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q === '' || 
      task.title.toLowerCase().includes(q) ||
      (task.description || '').toLowerCase().includes(q) ||
      caseNumber.toLowerCase().includes(q) ||
      clientName.toLowerCase().includes(q) ||
      (task.assignedToName || '').toLowerCase().includes(q) ||
      (task.assignedByName || '').toLowerCase().includes(q);
    
    // Client filter
    const matchesClient = !activeFilters.clientId || task.clientId === activeFilters.clientId;
    
    // Case filter (from activeFilters or URL params)
    const caseIdFromParams = searchParams.get('caseId');
    const filterCaseId = activeFilters.caseId || caseIdFromParams;
    const matchesCase = !filterCaseId || task.caseId === filterCaseId;
    
    // Status filter with special cases
    let matchesStatus = true;
    if (activeFilters.status === 'followups_due') {
      matchesStatus = task.followUpDate && 
        new Date(task.followUpDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (activeFilters.status === 'updated_today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskNotes = state.taskNotes?.filter(note => note.taskId === task.id) || [];
      matchesStatus = taskNotes.some(note => {
        const noteDate = new Date(note.createdAt);
        noteDate.setHours(0, 0, 0, 0);
        return noteDate.getTime() === today.getTime();
      });
    } else {
      matchesStatus = !activeFilters.status || task.status === activeFilters.status;
    }
    
    // Priority filter
    const matchesPriority = !activeFilters.priority || task.priority === activeFilters.priority;
    
    // Assignee filter
    const matchesAssignee = !activeFilters.assignedToId || task.assignedToId === activeFilters.assignedToId;
    
    // Task type tags filter (Auto-generated, Manual, Escalated)
    let matchesTaskTypes = true;
    if (activeFilters.taskTypes && activeFilters.taskTypes.length > 0) {
      matchesTaskTypes = activeFilters.taskTypes.some((type: string) => {
        if (type === 'Auto-generated') return task.isAutoGenerated;
        if (type === 'Manual') return !task.isAutoGenerated;
        if (type === 'Escalated') return task.status === 'Overdue'; // Use overdue as escalated indicator
        return false;
      });
    }
    
    // Due date filter
    let matchesDueDate = true;
    if (activeFilters.dueDate?.from || activeFilters.dueDate?.to) {
      const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (taskDueDate) {
        if (activeFilters.dueDate.from && taskDueDate < new Date(activeFilters.dueDate.from)) {
          matchesDueDate = false;
        }
        if (activeFilters.dueDate.to && taskDueDate > new Date(activeFilters.dueDate.to)) {
          matchesDueDate = false;
        }
      } else {
        matchesDueDate = false;
      }
    }
    
    return matchesSearch && matchesClient && matchesCase && matchesStatus && 
           matchesPriority && matchesAssignee && matchesTaskTypes && matchesDueDate;
  });

  // Defensive logging for filter counts (dev mode)
  if (import.meta.env.DEV) {
    console.log('[TaskManagement] Filter counts:', {
      total: state.tasks.length,
      afterFilters: filteredTasks.length,
      searchTerm,
      activeFilters,
      caseIdFilter: searchParams.get('caseId')
    });
  }

  // Prepare data for filter dropdowns
  const uniqueClients = React.useMemo(() => {
    const clientMap = new Map<string, Client>();
    state.tasks.forEach(task => {
      const client = state.clients.find(c => c.id === task.clientId);
      if (client) {
        clientMap.set(client.id, client);
      }
    });
    return Array.from(clientMap.values());
  }, [state.tasks, state.clients]);

  const uniqueCases = React.useMemo(() => {
    const caseMap = new Map();
    state.tasks.forEach(task => {
      const taskCase = state.cases.find(c => c.id === task.caseId);
      if (taskCase) {
        caseMap.set(taskCase.id, taskCase);
      }
    });
    return Array.from(caseMap.values());
  }, [state.tasks, state.cases]);

  const uniqueAssignees = React.useMemo(() => {
    const assigneeMap = new Map<string, { id: string; name: string }>();
    state.tasks.forEach(task => {
      if (task.assignedToId && task.assignedToName) {
        assigneeMap.set(task.assignedToId, {
          id: task.assignedToId,
          name: task.assignedToName
        });
      }
    });
    return Array.from(assigneeMap.values());
  }, [state.tasks]);

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
  const handleReturnToStageManagement = async () => {
    const returnContext = await navigationContextService.getContext();
    if (returnContext?.returnTo === 'stage-management' && returnContext.returnCaseId) {
      // Navigate back to case and open stage management
      navigate(`/cases?caseId=${returnContext.returnCaseId}`);
      
      // Clear return context
      await navigationContextService.clearContext();
      
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
  const [hasReturnCtx, setHasReturnCtx] = useState(false);
  const [currentCaseInfo, setCurrentCaseInfo] = useState<{ id: string; number: string } | null>(null);
  
  useEffect(() => {
    const loadContext = async () => {
      const ctx = await navigationContextService.getContext();
      setHasReturnCtx(ctx?.returnTo === 'stage-management' && !!ctx.returnCaseId);
      
      const caseId = searchParams.get('caseId') || ctx?.returnCaseId;
      if (caseId) {
        const currentCase = state.cases.find(c => c.id === caseId);
        setCurrentCaseInfo(currentCase ? { id: caseId, number: currentCase.caseNumber } : null);
      }
    };
    loadContext();
  }, [searchParams, state.cases]);

  // Handle task updates from drag-and-drop or other interactions
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) {
        toast({
          title: "Error",
          description: "Task not found",
          variant: "destructive",
        });
        return;
      }

      const updatedTask = {
        ...task,
        ...updates,
        updated_at: new Date(),
      };

      // Update in app state
      dispatch({
        type: 'UPDATE_TASK',
        payload: updatedTask,
      });

      // Persist to storage
      const storage = storageManager.getStorage();
      await storage.update('tasks', taskId, {
        ...updatedTask,
        updated_at: new Date(),
      });

      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    try {
      // Remove from app state
      dispatch({
        type: 'DELETE_TASK',
        payload: taskId,
      });

      // Remove from storage
      const storage = storageManager.getStorage();
      await storage.delete('tasks', taskId);

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const lockedTasksCount = state.tasks.filter(t => t.isLocked).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Migration Banner */}
      <MigrationBanner 
        migratedCount={lockedTasksCount}
        onDismiss={() => console.log('Migration banner dismissed')}
      />

      {/* Return Navigation Breadcrumb */}
      {hasReturnCtx && (
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
                  {currentCaseInfo?.number || 'Case'}
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
          <HelpButton
            helpId="button-task-escalations"
            variant="outline"
            onClick={() => {
              setActiveTab('escalation');
            }}
            data-tour="escalations-button"
          >
            <Bell className="mr-2 h-4 w-4" />
            Escalations
          </HelpButton>
          <HelpButton 
            helpId="button-create-task"
            className="bg-primary hover:bg-primary-hover"
            onClick={() => setTaskModal({ isOpen: true, mode: 'create', task: null })}
            data-tour="create-task-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </HelpButton>
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
            <ThreeLayerHelp helpId="card-total-tasks" showExplanation={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-primary" />
              </div>
            </ThreeLayerHelp>
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
            <ThreeLayerHelp helpId="card-overdue-tasks" showExplanation={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
                  <p className="text-xs text-destructive mt-1">Needs escalation</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </ThreeLayerHelp>
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
            <ThreeLayerHelp helpId="card-auto-generated" showExplanation={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auto-Generated</p>
                  <p className="text-2xl font-bold text-secondary">{stats.autoGenerated}</p>
                  <p className="text-xs text-secondary mt-1">{Math.round((stats.autoGenerated / stats.total) * 100)}% automated</p>
                </div>
                <TrendingUp className="h-8 w-8 text-secondary" />
              </div>
            </ThreeLayerHelp>
          </CardContent>
        </Card>
      </motion.div>

      {/* Unified Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <UnifiedTaskSearch
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          clients={uniqueClients}
          cases={uniqueCases}
          assignees={uniqueAssignees}
        />
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border bg-background">
          <div className="overflow-x-auto scrollbar-thin">
            <TabsList className="inline-flex w-max min-w-full h-auto p-1" data-tour="task-automation-tabs">
              <TabsTrigger value="board" data-tour="board-tab" className="min-w-[90px] whitespace-nowrap">Board</TabsTrigger>
              <TabsTrigger value="automation" data-tour="automation-tab" className="min-w-[100px] whitespace-nowrap">Automation</TabsTrigger>
              <TabsTrigger value="escalation" data-tour="escalation-tab" className="min-w-[100px] whitespace-nowrap">Escalation</TabsTrigger>
              <TabsTrigger value="templates" data-tour="templates-tab" className="min-w-[100px] whitespace-nowrap">Templates</TabsTrigger>
              <TabsTrigger value="analytics" data-tour="analytics-tab" className="min-w-[90px] whitespace-nowrap">Analytics</TabsTrigger>
              <TabsTrigger value="insights" data-tour="insights-tab" className="min-w-[90px] whitespace-nowrap">Insights</TabsTrigger>
              <TabsTrigger value="ai-assistant" data-tour="ai-assistant-tab" className="min-w-[110px] whitespace-nowrap">AI Assistant</TabsTrigger>
              <TabsTrigger value="collaboration" data-tour="collaboration-tab" className="min-w-[120px] whitespace-nowrap">Collaboration</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="board" className="mt-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('board');
                  uiStateService.saveViewMode('task-management', 'board');
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
                  uiStateService.saveViewMode('task-management', 'list');
                }}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                List View
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {filteredTasks.length} tasks • {filteredTasks.filter(t => t.isAutoGenerated).length} auto-generated
              </div>
              {filteredTasks.length === 0 && (searchTerm !== '' || Object.keys(activeFilters).length > 0 || searchParams.get('caseId')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveFilters({});
                    navigate('/tasks');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === 'board' ? (
            <TaskBoard 
              tasks={enrichTasksWithClientNames(filteredTasks, state.clients)} 
              highlightedTaskId={highlightedTaskId}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          ) : (
            <TaskList 
              tasks={enrichTasksWithClientNames(filteredTasks, state.clients)} 
              highlightedTaskId={highlightedTaskId}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <TaskAutomation />
        </TabsContent>

        <TabsContent value="escalation" className="mt-6">
          <EscalationMatrix tasks={enrichTasksWithClientNames(state.tasks, state.clients)} />
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