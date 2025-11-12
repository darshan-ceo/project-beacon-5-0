import React, { useState, useMemo, useEffect } from 'react';
import { Plus, PlayCircle, CheckCircle, Clock, AlertCircle, Trash2, Edit, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppState, Task, Case } from '@/contexts/AppStateContext';
import { TaskModal } from '@/components/modals/TaskModal';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { BundleRunModal } from './BundleRunModal';
import { format } from 'date-fns';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { toast } from '@/hooks/use-toast';
import { getFollowUpBadgeVariant } from '@/utils/taskHelpers';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CaseTasksTabProps {
  caseData: Case;
}

export const CaseTasksTab: React.FC<CaseTasksTabProps> = ({ caseData }) => {
  const { state, dispatch, rawDispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    task?: Task | null;
  }>({
    isOpen: false,
    mode: 'create',
    task: null,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [bundleModal, setBundleModal] = useState(false);

  // Filter tasks for this case
  const caseTasks = useMemo(() => {
    return state.tasks.filter(task => task.caseId === caseData.id);
  }, [state.tasks, caseData.id]);

  // Set up real-time subscription for case tasks
  useEffect(() => {
    console.log(`[CaseTasksTab] Setting up real-time subscription for case ${caseData.id}`);

    const channel = supabase
      .channel(`tasks-case-${caseData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `case_id=eq.${caseData.id}`
        },
        (payload) => {
          console.log('[CaseTasksTab] Real-time INSERT received:', payload);
          
          const newTask = payload.new as Task;
          
          // ⚠️ IMPORTANT: Use rawDispatch for real-time events!
          // Real-time events indicate data is ALREADY in the database.
          // Using persistent dispatch would re-persist and trigger infinite loops.
          rawDispatch({
            type: 'ADD_TASK',
            payload: newTask
          });
          
          toast({
            title: "Task Created",
            description: `${newTask.title} has been added to this case`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `case_id=eq.${caseData.id}`
        },
        (payload) => {
          console.log('[CaseTasksTab] Real-time UPDATE received:', payload);
          
          const updatedTask = payload.new as Task;
          
          // ⚠️ IMPORTANT: Use rawDispatch for real-time events!
          rawDispatch({
            type: 'UPDATE_TASK',
            payload: updatedTask
          });
          
          toast({
            title: "Task Updated",
            description: `${updatedTask.title} has been modified`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `case_id=eq.${caseData.id}`
        },
        (payload) => {
          console.log('[CaseTasksTab] Real-time DELETE received:', payload);
          
          const deletedTask = payload.old as Task;
          
          // ⚠️ IMPORTANT: Use rawDispatch for real-time events!
          rawDispatch({
            type: 'DELETE_TASK',
            payload: deletedTask.id
          });
          
          toast({
            title: "Task Deleted",
            description: `${deletedTask.title} has been removed`,
            variant: "destructive"
          });
        }
      )
      .subscribe();

    return () => {
      console.log(`[CaseTasksTab] Cleaning up real-time subscription for case ${caseData.id}`);
      supabase.removeChannel(channel);
    };
  }, [rawDispatch, caseData.id]);

  // Task statistics
  const taskStats = useMemo(() => {
    const total = caseTasks.length;
    const completed = caseTasks.filter(t => t.status === 'Completed').length;
    const pending = caseTasks.filter(t => t.status === 'Not Started').length;
    const inProgress = caseTasks.filter(t => t.status === 'In Progress').length;
    const overdue = caseTasks.filter(t => {
      if (t.status === 'Completed') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, pending, inProgress, overdue };
  }, [caseTasks]);

  const handleAddTask = () => {
    if (!hasPermission('tasks', 'write')) {
      toast({
        title: 'Permission Denied',
        description: "You don't have permission to create tasks.",
        variant: 'destructive',
      });
      return;
    }

    setTaskModal({
      isOpen: true,
      mode: 'create',
      task: null,
    });
  };

  const handleEditTask = (task: Task) => {
    if (!hasPermission('tasks', 'write')) {
      toast({
        title: 'Permission Denied',
        description: "You don't have permission to edit tasks.",
        variant: 'destructive',
      });
      return;
    }

    setSelectedTask(task);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    const existingTask = state.tasks.find(t => t.id === taskId);
    if (existingTask) {
      dispatch({ 
        type: 'UPDATE_TASK', 
        payload: { 
          ...existingTask,
          ...updates
        } 
      });
      toast({
        title: 'Task Updated',
        description: 'The task has been successfully updated.',
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!hasPermission('tasks', 'delete')) {
      toast({
        title: 'Permission Denied',
        description: "You don't have permission to delete tasks.",
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'DELETE_TASK', payload: taskId });
    toast({
      title: 'Task Deleted',
      description: 'The task has been successfully deleted.',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'Not Started':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      High: 'destructive',
      Medium: 'default',
      Low: 'secondary',
    };
    return <Badge variant={variants[priority] as any}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Completed: 'default',
      'In Progress': 'secondary',
      'Not Started': 'outline',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{taskStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Case Tasks</CardTitle>
              <CardDescription>
                Manage tasks for {caseData.caseNumber}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setBundleModal(true)} variant="outline">
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Bundle
              </Button>
              <Button onClick={handleAddTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {caseTasks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create tasks manually or run a task bundle to get started.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleAddTask} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Task
                </Button>
                <Button onClick={() => setBundleModal(true)}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Bundle
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseTasks.map(task => {
                  const assignee = task.assignedToId
                    ? state.employees.find(e => e.id === task.assignedToId)
                    : null;
                  const isOverdue =
                    task.status !== 'Completed' &&
                    task.dueDate &&
                    new Date(task.dueDate) < new Date();

                  return (
                    <TableRow key={task.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="font-medium">{task.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignee ? assignee.full_name : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                            {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {task.followUpDate && (
                          <Badge 
                            variant={getFollowUpBadgeVariant(task.followUpDate)}
                            className="flex items-center gap-1 w-fit"
                          >
                            <Bell className="h-3 w-3" />
                            {format(new Date(task.followUpDate), 'MMM dd')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Task Modal (for creating new tasks) */}
      <TaskModal
        isOpen={taskModal.isOpen}
        onClose={() => setTaskModal({ isOpen: false, mode: 'create', task: null })}
        task={taskModal.task}
        mode={taskModal.mode}
        contextCaseId={caseData.id}
        contextClientId={caseData.clientId}
      />

      {/* Task Drawer (for editing existing tasks) */}
      <TaskDrawer
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Bundle Run Modal */}
      <BundleRunModal
        isOpen={bundleModal}
        onClose={() => setBundleModal(false)}
        caseData={caseData}
      />
    </div>
  );
};
