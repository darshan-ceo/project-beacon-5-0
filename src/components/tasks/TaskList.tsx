import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Clock,
  Target,
  Settings,
  Building2,
  Filter,
  Lock,
  Plus
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Task, useAppState, TaskFollowUp } from '@/contexts/AppStateContext';
import { TaskDrawer } from './TaskDrawer';
import { LogFollowUpModal } from './LogFollowUpModal';
import { TasksBulkActions } from './TasksBulkActions';
import { formatDateForDisplay } from '@/utils/dateFormatters';
import { v4 as uuid } from 'uuid';
import { toast } from '@/hooks/use-toast';

interface TaskDisplay extends Task {
  assignedTo: string;
  clientName?: string;
}

interface TaskListProps {
  tasks: TaskDisplay[];
  highlightedTaskId?: string | null;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskClick?: (task: TaskDisplay) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'assignedTo' | 'caseNumber';
type SortDirection = 'asc' | 'desc';

const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
const statusOrder = { 
  'Overdue': 5, 
  'In Progress': 4, 
  'Review': 3, 
  'Not Started': 2, 
  'Completed': 1 
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  highlightedTaskId,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick
}) => {
  const { state, dispatch } = useAppState();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTask, setSelectedTask] = useState<TaskDisplay | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [lockFilter, setLockFilter] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpTask, setFollowUpTask] = useState<TaskDisplay | null>(null);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // First filter by client and lock status
    let filtered = tasks;
    if (clientFilter !== 'all') {
      filtered = filtered.filter(task => task.clientId === clientFilter);
    }
    if (lockFilter !== 'all') {
      filtered = filtered.filter(task => 
        lockFilter === 'locked' ? task.isLocked === true : task.isLocked !== true
      );
    }
    
    // Then sort
    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Special handling for priority and status
      if (sortField === 'priority') {
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      } else if (sortField === 'status') {
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
      } else if (sortField === 'dueDate') {
        aValue = new Date(a.dueDate).getTime();
        bValue = new Date(b.dueDate).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [tasks, sortField, sortDirection, clientFilter, lockFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleTaskClick = (task: TaskDisplay) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      setSelectedTask(task);
      setIsDrawerOpen(true);
    }
  };

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

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleFollowUpSubmit = (followUp: Omit<TaskFollowUp, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    if (!followUpTask) return;
    
    const newFollowUp: TaskFollowUp = {
      ...followUp,
      id: uuid(),
      createdAt: new Date().toISOString(),
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name
    };

    // Task updates
    const taskUpdates: Partial<Task> = {
      status: followUp.status,
      isLocked: true,
      lockedAt: followUpTask.isLocked ? followUpTask.lockedAt : new Date().toISOString(),
      lockedBy: followUpTask.lockedBy || state.userProfile.id,
      currentFollowUpDate: followUp.nextFollowUpDate
    };

    // Update actual hours if logged
    if (followUp.hoursLogged) {
      taskUpdates.actualHours = (followUpTask.actualHours || 0) + followUp.hoursLogged;
    }

    // Set completed date if status is Completed
    if (followUp.status === 'Completed') {
      taskUpdates.completedDate = new Date().toISOString().split('T')[0];
    }

    // Dispatch follow-up to state
    dispatch({ type: 'ADD_TASK_FOLLOWUP', payload: newFollowUp });

    // Update task
    onTaskUpdate?.(followUpTask.id, taskUpdates);

    setFollowUpModalOpen(false);
    setFollowUpTask(null);

    toast({
      title: "Follow-up Added",
      description: "Task progress has been logged successfully."
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const formatDueDate = (dueDate: string) => {
    const daysUntil = getDaysUntilDue(dueDate);
    const dateStr = formatDateForDisplay(dueDate);
    
    if (daysUntil < 0) {
      return {
        text: `${dateStr} (${Math.abs(daysUntil)}d overdue)`,
        className: 'text-destructive font-medium'
      };
    } else if (daysUntil === 0) {
      return {
        text: `${dateStr} (Due today)`,
        className: 'text-warning font-medium'
      };
    } else if (daysUntil === 1) {
      return {
        text: `${dateStr} (Due tomorrow)`,
        className: 'text-warning'
      };
    } else {
      return {
        text: `${dateStr} (${daysUntil}d left)`,
        className: 'text-muted-foreground'
      };
    }
  };

  const rowHeight = density === 'compact' ? 'h-12' : 'h-16';

  return (
    <div className="space-y-4">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Task List</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredAndSortedTasks.length} of {tasks.length} tasks • {selectedTasks.size} selected
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client Filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Clients" />
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

          {/* Lock Status Filter */}
          <Select value={lockFilter} onValueChange={(value: any) => setLockFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Lock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="locked">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Locked Only
                </div>
              </SelectItem>
              <SelectItem value="unlocked">Unlocked Only</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedTasks.size > 0 && (
            <TasksBulkActions
              selectedTaskIds={Array.from(selectedTasks)}
              tasks={filteredAndSortedTasks.filter(t => selectedTasks.has(t.id))}
              onComplete={() => setSelectedTasks(new Set())}
              userRole={state.userProfile?.role}
            />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              >
                {density === 'compact' ? 'Comfortable' : 'Compact'} view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border rounded-lg bg-background overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>

              <TableHead className="w-16">Lock</TableHead>
              
              <TableHead className="cursor-pointer min-w-[200px]" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-2">
                  Task
                  {getSortIcon('title')}
                </div>
              </TableHead>
              
              <TableHead className="cursor-pointer min-w-[120px]" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              
              <TableHead className="cursor-pointer min-w-[100px]" onClick={() => handleSort('priority')}>
                <div className="flex items-center gap-2">
                  Priority
                  {getSortIcon('priority')}
                </div>
              </TableHead>
              
              <TableHead className="cursor-pointer min-w-[140px] hidden sm:table-cell" onClick={() => handleSort('assignedTo')}>
                <div className="flex items-center gap-2">
                  Assignee
                  {getSortIcon('assignedTo')}
                </div>
              </TableHead>
              
              <TableHead className="cursor-pointer min-w-[180px]" onClick={() => handleSort('dueDate')}>
                <div className="flex items-center gap-2">
                  Due Date
                  {getSortIcon('dueDate')}
                </div>
              </TableHead>
              
              <TableHead className="hidden lg:table-cell min-w-[120px]">Progress</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {filteredAndSortedTasks.map((task) => {
              const isHighlighted = highlightedTaskId === task.id;
              const dueInfo = formatDueDate(task.dueDate);
              
              return (
                <TableRow 
                  key={task.id}
                  id={`task-${task.id}`}
                  className={`${rowHeight} cursor-pointer ${
                    isHighlighted ? 'bg-primary/5 border-primary' : ''
                  } hover:bg-muted/50`}
                  onClick={() => handleTaskClick(task)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {task.isLocked && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Lock className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{task.title}</span>
                        {task.isLocked && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-3 w-3 text-amber-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Task locked after follow-up</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {task.clientName && (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium text-foreground">{task.clientName}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{task.caseNumber}</span>
                        {task.isAutoGenerated && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Auto
                          </Badge>
                        )}
                        {task.escalationLevel > 0 && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            L{task.escalationLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                       <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {(task.assignedTo || task.assignedToName || 'U').split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignedTo || task.assignedToName || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={`text-sm ${dueInfo.className}`}>
                        {dueInfo.text}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden lg:table-cell">
                    {task.actualHours && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{task.actualHours}h</span>
                          <span>{task.estimatedHours}h</span>
                        </div>
                        <Progress 
                          value={(task.actualHours / task.estimatedHours) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTaskClick(task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setFollowUpTask(task);
                          setFollowUpModalOpen(true);
                        }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Follow-Up
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedTask(task);
                          setIsDrawerOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => onTaskDelete?.(task.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
        
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks found</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onUpdateTask={onTaskUpdate}
        onDeleteTask={onTaskDelete}
      />

      {/* Log Follow-Up Modal */}
      {followUpTask && (
        <LogFollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setFollowUpTask(null);
          }}
          task={followUpTask}
          onSubmit={handleFollowUpSubmit}
        />
      )}
    </div>
  );
};