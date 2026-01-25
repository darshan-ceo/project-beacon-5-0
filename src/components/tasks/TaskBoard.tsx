import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Circle,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ArrowRight,
  Edit,
  Eye,
  MoreVertical,
  Plus,
  Building2,
  Lock,
  MessageSquare
} from 'lucide-react';
// TaskDrawer and LogFollowUpModal removed - using route-based navigation
import { Task, TaskFollowUp, useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { v4 as uuid } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskDisplay extends Task {
  assignedTo: string; // Display name for the assigned user
  clientName?: string; // Client name for display
}

interface TaskBoardProps {
  tasks: TaskDisplay[];
  highlightedTaskId?: string | null;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskClick?: (task: TaskDisplay) => void;
}

const statusColumns = [
  { id: 'Not Started', title: 'Not Started', icon: Circle, color: 'bg-muted' },
  { id: 'In Progress', title: 'In Progress', icon: Clock, color: 'bg-primary' },
  { id: 'Review', title: 'Review', icon: AlertTriangle, color: 'bg-warning' },
  { id: 'Completed', title: 'Completed', icon: CheckCircle, color: 'bg-success' },
  { id: 'Overdue', title: 'Overdue', icon: AlertTriangle, color: 'bg-destructive' }
];

export const TaskBoard: React.FC<TaskBoardProps> = ({ 
  tasks, 
  highlightedTaskId, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskClick 
}) => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  const navigate = useNavigate();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // RBAC permission flags
  const canEditTasks = hasPermission('tasks', 'write');
  const canDeleteTasks = hasPermission('tasks', 'delete');

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
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
      case 'Critical': return 'border-l-destructive bg-destructive/5';
      case 'High': return 'border-l-warning bg-warning/5';
      case 'Medium': return 'border-l-primary bg-primary/5';
      case 'Low': return 'border-l-success bg-success/5';
      default: return 'border-l-muted bg-muted/5';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleTaskClick = (task: TaskDisplay) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      // Navigate to conversation view
      navigate(`/tasks/${task.id}`);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    if (!canEditTasks) {
      toast({
        title: 'Permission Denied',
        description: "You don't have permission to update tasks.",
        variant: 'destructive',
      });
      return;
    }
    if (onTaskUpdate) {
      onTaskUpdate(taskId, { status: newStatus as Task['status'] });
    }
  };

  // handleFollowUpSubmit removed - follow-ups now handled in TaskConversation view

  const TaskCard: React.FC<{ task: TaskDisplay }> = ({ task }) => {
    const daysUntilDue = getDaysUntilDue(task.dueDate);
    const isOverdue = daysUntilDue < 0;
    const isUrgent = daysUntilDue <= 1 && daysUntilDue >= 0;
    const isHighlighted = highlightedTaskId === task.id;
    const isDragging = draggedTask === task.id;

    return (
      <div
        id={`task-${task.id}`}
        className={`p-4 bg-background rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${getPriorityColor(task.priority)} ${
          isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-primary/10' : ''
        } ${isDragging ? 'opacity-50 scale-95' : ''}`}
        draggable
        onDragStart={(e: React.DragEvent) => {
          setDraggedTask(task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDraggedTask(null);
          setDragOverColumn(null);
        }}
        onClick={() => handleTaskClick(task)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-foreground text-sm leading-tight">
                {task.title}
              </h4>
              <div className="space-y-0.5 mt-1">
                {task.clientName && (
                  <p className="text-xs text-foreground font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {task.clientName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {task.caseNumber}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tasks/${task.id}`);
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {canEditTasks && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tasks/${task.id}?mode=followup`);
                  }}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Add Follow-Up
                  </DropdownMenuItem>
                )}
                {canEditTasks && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tasks/${task.id}?mode=edit`);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Task
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement stage movement
                }}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Move Stage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {task.priority}
            </Badge>
            {task.isLocked && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
            {task.isAutoGenerated && (
              <Badge variant="secondary" className="text-xs bg-secondary/20">
                Auto
              </Badge>
            )}
            {task.escalationLevel > 0 && (
              <Badge variant="destructive" className="text-xs">
                L{task.escalationLevel}
              </Badge>
            )}
          </div>

          {/* Progress */}
          {task.actualHours && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{task.actualHours}h / {task.estimatedHours}h</span>
              </div>
              <Progress 
                value={(task.actualHours / task.estimatedHours) * 100} 
                className="h-1"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {(task.assignedTo || task.assignedToName || 'U').split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assignedTo || task.assignedToName || 'Unassigned'}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span className={`${
                isOverdue ? 'text-destructive font-medium' :
                isUrgent ? 'text-warning font-medium' :
                'text-muted-foreground'
              }`}>
                {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` :
                 daysUntilDue === 0 ? 'Due today' :
                 daysUntilDue === 1 ? 'Due tomorrow' :
                 `${daysUntilDue}d left`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Task Board</h2>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span>{tasks.length} total tasks</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{tasks.filter(t => t.isAutoGenerated).length} auto-generated</span>
        </div>
      </div>

      {/* Kanban Board - Horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-5 lg:grid-cols-5 gap-4 md:gap-6 min-w-[1200px] lg:min-w-0">
        {statusColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          const ColumnIcon = column.icon;
          
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Column Header */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ColumnIcon className={`h-4 w-4 ${
                        column.id === 'Completed' ? 'text-success' :
                        column.id === 'In Progress' ? 'text-primary' :
                        column.id === 'Review' ? 'text-warning' :
                        column.id === 'Overdue' ? 'text-destructive' :
                        'text-muted-foreground'
                      }`} />
                      <h3 className="font-medium text-foreground">{column.title}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Task Cards */}
              <div 
                className={`space-y-3 min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                  dragOverColumn === column.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={(e) => {
                  // Only clear if we're leaving the drop zone completely
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverColumn(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  if (draggedTask && draggedTask !== column.id) {
                    handleStatusChange(draggedTask, column.id);
                  }
                }}
              >
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <ColumnIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tasks</p>
                      {dragOverColumn === column.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-2"
                        >
                          <Plus className="h-6 w-6 mx-auto text-primary" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-lg font-bold text-foreground">
                  {Math.round((getTasksByStatus('Completed').length / tasks.length) * 100)}%
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                <p className="text-lg font-bold text-destructive">
                  {getTasksByStatus('Overdue').length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold text-primary">
                  {getTasksByStatus('In Progress').length}
                </p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto Tasks</p>
                <p className="text-lg font-bold text-secondary">
                  {tasks.filter(t => t.isAutoGenerated).length}
                </p>
              </div>
              <FileText className="h-6 w-6 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Drawer and Modal removed - now using route-based navigation */}
    </div>
  );
};