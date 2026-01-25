import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  MoreVertical,
  Trash2,
  Loader2,
  MessageSquare,
  Plus,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { TaskHeader } from './TaskHeader';
import { CollapsibleDescription } from './CollapsibleDescription';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/AppStateContext';
import { taskMessagesService } from '@/services/taskMessagesService';
import { TaskMessage, TaskAttachment, TaskStatusUpdate } from '@/types/taskMessages';
import { MessageBubble } from './MessageBubble';
import { ComposeMessage } from './ComposeMessage';
import { QuickStatusButton } from './QuickStatusButton';
import { TaskStickyContextHeader } from './TaskStickyContextHeader';
import { TaskDetailsPanel } from './TaskDetailsPanel';
import { TaskInlineReferences } from './TaskInlineReferences';
import { TaskActivityTimeline } from './TaskActivityTimeline';
import { TaskEditSheet } from './TaskEditSheet';
import { supabase } from '@/integrations/supabase/client';
import { tasksService } from '@/services/tasksService';
import { toast } from 'sonner';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { useTaskContext } from '@/hooks/useTaskContext';

export const TaskConversation: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  const { context, isLoading: isContextLoading, updateClientVisibility } = useTaskContext(taskId);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [fetchedTask, setFetchedTask] = useState<any>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mode handling: 'view' (read-only), 'followup' (conversation with composer), 'edit' (task property form)
  // Support both legacy ?edit=true and new ?mode=xxx params
  const mode = searchParams.get('mode') || (searchParams.get('edit') === 'true' ? 'followup' : 'view');
  const isViewMode = mode === 'view';
  const isFollowUpMode = mode === 'followup';
  const isEditMode = mode === 'edit';
  
  // RBAC permission checks
  const canDeleteTasks = hasPermission('tasks', 'delete');
  const canEditTasks = hasPermission('tasks', 'write');
  
  // Use task from state if available, otherwise use fetched task
  const stateTask = state.tasks.find((t) => t.id === taskId);
  const task = stateTask || fetchedTask;

  // Fetch task from Supabase if not found in local state
  useEffect(() => {
    if (!taskId) {
      setIsTaskLoading(false);
      return;
    }
    
    // If task exists in state, no need to fetch
    if (stateTask) {
      setIsTaskLoading(false);
      setFetchedTask(null);
      return;
    }
    
    // Fetch directly from Supabase
    const fetchTask = async () => {
      setIsTaskLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .maybeSingle();
          
        if (!error && data) {
          // Map snake_case to camelCase
          setFetchedTask({
            id: data.id,
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            dueDate: data.due_date,
            assignedToId: data.assigned_to,
            assignedById: data.assigned_by,
            caseId: data.case_id,
            clientId: data.client_id,
            tenantId: data.tenant_id,
            tags: data.tags || [],
            attachments: data.attachments || [],
            estimatedHours: data.estimated_hours,
            actualHours: data.actual_hours,
            createdDate: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      } finally {
        setIsTaskLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId, stateTask]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Get tenantId from user metadata (primary) or profile (fallback)
        const userTenantId = user.user_metadata?.tenant_id;
        const profile = state.employees.find((e) => e.id === user.id);
        setCurrentUserName(profile?.full_name || user.email || 'User');
        setTenantId(userTenantId || profile?.tenantId || '');
      }
    };
    getUser();
  }, [state.employees]);

  useEffect(() => {
    if (!taskId) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const data = await taskMessagesService.getMessagesByTaskId(taskId);
        setMessages(data);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`task-messages-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage: TaskMessage = {
              id: payload.new.id,
              tenantId: payload.new.tenant_id,
              taskId: payload.new.task_id,
              message: payload.new.message,
              attachments: payload.new.attachments || [],
              statusUpdate: payload.new.status_update,
              isSystemMessage: payload.new.is_system_message,
              createdBy: payload.new.created_by,
              createdByName: payload.new.created_by_name,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setMessages((prev) => [...prev, newMessage]);
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? { ...m, message: payload.new.message, updatedAt: payload.new.updated_at }
                  : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (
    message: string,
    attachments: TaskAttachment[],
    statusUpdate?: TaskStatusUpdate,
    assigneeChange?: { id: string; name: string }
  ) => {
    if (!taskId || !task) return;

    // Validate tenantId before sending
    if (!tenantId) {
      toast.error('Unable to send message. Please refresh and try again.');
      return;
    }

    // Handle assignee change if provided
    if (assigneeChange && assigneeChange.id) {
      try {
        await tasksService.update(taskId, { 
          assignedToId: assigneeChange.id,
          assignedToName: assigneeChange.name 
        }, dispatch);
        
        // Create system message for reassignment
        await taskMessagesService.createMessage(
          taskId,
          tenantId,
          currentUserId,
          currentUserName,
          { 
            message: `Task reassigned to ${assigneeChange.name}`, 
            attachments: [], 
            isSystemMessage: true 
          }
        );
      } catch (error) {
        console.error('Error reassigning task:', error);
        toast.error('Failed to reassign task');
      }
    }
    
    // Send the regular message
    if (message || attachments.length > 0 || statusUpdate) {
      await taskMessagesService.createMessage(
        taskId,
        tenantId,
        currentUserId,
        currentUserName,
        { message, attachments, statusUpdate }
      );
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!task || !taskId) return;
    
    // Validate tenantId before updating
    if (!tenantId) {
      toast.error('Unable to update status. Please refresh and try again.');
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      await tasksService.update(taskId, { status: newStatus as any }, dispatch);
      
      // Create a system message for the status change
      await taskMessagesService.createMessage(
        taskId,
        tenantId,
        currentUserId,
        currentUserName,
        { 
          message: '', 
          attachments: [], 
          statusUpdate: newStatus as TaskStatusUpdate
        }
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !taskId) return;
    
    // RBAC permission check
    if (!canDeleteTasks) {
      toast.error("You don't have permission to delete tasks");
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksService.delete(taskId, dispatch);
        navigate('/tasks');
      } catch (error: any) {
        // Error already handled by tasksService with toast
        // Just log for debugging
        console.error('Error deleting task:', error);
        // Don't navigate away - task still exists
      }
    }
  };

  // Show loading while task is being fetched
  if (isTaskLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Task not found</p>
          <Button variant="outline" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Compact Header with Gradient */}
      <div className="border-b bg-gradient-to-r from-card via-card to-muted/50 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tasks')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{task.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isFollowUpMode && (
              <QuickStatusButton
                currentStatus={task.status || 'Not Started'}
                onStatusChange={handleQuickStatusChange}
                disabled={isUpdatingStatus}
                size="sm"
              />
            )}

            {(isFollowUpMode || isEditMode) && canDeleteTasks && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleDeleteTask}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Task Meta Info */}
        <div className="px-4 pb-3 border-t border-border/50 pt-3 bg-muted/20">
          <TaskHeader task={task} compact />
        </div>
      </div>

      {/* Collapsible Description */}
      <CollapsibleDescription description={task.description || ''} />

      {/* Messages - Chat Style */}
      <ScrollArea className="flex-1 bg-background">
        <div className="divide-y divide-border/50 px-4 py-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="font-medium text-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">
                    {isEditMode 
                      ? 'Start the conversation by adding an update below'
                      : 'No updates have been added to this task yet'
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="py-1">
                <MessageBubble
                  message={msg}
                  isOwnMessage={msg.createdBy === currentUserId}
                />
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Quick Compose Bar - Only show in follow-up mode */}
      {isFollowUpMode ? (
        <ComposeMessage
          onSend={handleSendMessage}
          currentStatus={task.status}
          currentAssigneeId={task.assignedToId}
          taskId={taskId}
        />
      ) : (
        /* Floating Action Buttons in View Mode */
        <div className="border-t bg-card p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/tasks/${taskId}?mode=followup`)}
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Follow-up
          </Button>
          {canEditTasks && (
            <Button
              onClick={() => navigate(`/tasks/${taskId}?mode=edit`)}
              className="flex-1 gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
          )}
        </div>
      )}

      {/* Task Edit Sheet - Opens when mode=edit */}
      <TaskEditSheet
        task={task}
        isOpen={isEditMode}
        onClose={() => navigate(`/tasks/${taskId}`)}
        onSuccess={() => {
          // Refresh happens via state update
        }}
      />
    </div>
  );
};