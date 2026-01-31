import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MoreVertical,
  Trash2,
  Loader2,
  MessageSquare,
  Plus,
  ArrowLeft,
  Edit,
  CheckSquare
} from 'lucide-react';
import { TaskViewContent } from './TaskViewContent';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  const mode = searchParams.get('mode') || (searchParams.get('edit') === 'true' ? 'followup' : 'view');
  const isViewMode = mode === 'view';
  const isFollowUpMode = mode === 'followup';
  const isEditMode = mode === 'edit';
  
  // RBAC permission checks - granular actions
  const canDeleteTasks = hasPermission('tasks', 'delete');
  const canEditTasks = hasPermission('tasks', 'update');  // Use granular 'update' instead of 'write'
  
  // Use task from state if available, otherwise use fetched task
  const stateTask = state.tasks.find((t) => t.id === taskId);
  const task = stateTask || fetchedTask;

  // Get linked client and case info
  const linkedClient = task?.clientId ? state.clients.find(c => c.id === task.clientId) : null;
  const linkedCase = task?.caseId ? state.cases.find(c => c.id === task.caseId) : null;

  // Fetch task from Supabase if not found in local state
  useEffect(() => {
    if (!taskId) {
      setIsTaskLoading(false);
      return;
    }
    
    if (stateTask) {
      setIsTaskLoading(false);
      setFetchedTask(null);
      return;
    }
    
    const fetchTask = async () => {
      setIsTaskLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .maybeSingle();
          
        if (!error && data) {
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

    if (!tenantId) {
      toast.error('Unable to send message. Please refresh and try again.');
      return;
    }

    if (assigneeChange && assigneeChange.id) {
      try {
        await tasksService.update(taskId, { 
          assignedToId: assigneeChange.id,
          assignedToName: assigneeChange.name 
        }, dispatch);
        
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
    
    if (!tenantId) {
      toast.error('Unable to update status. Please refresh and try again.');
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      await tasksService.update(taskId, { status: newStatus as any }, dispatch);
      
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
    
    if (!canDeleteTasks) {
      toast.error("You don't have permission to delete tasks");
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksService.delete(taskId, dispatch);
        navigate('/tasks');
      } catch (error: any) {
        console.error('Error deleting task:', error);
      }
    }
  };

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
    <div className="h-full flex flex-col bg-muted/20">
      {/* Clean Single-Row Header */}
      <div className="sticky top-0 z-20 border-b bg-card shadow-sm">
        <div className="px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tasks')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <CheckSquare className="h-5 w-5 text-primary shrink-0" />

          <h1 className="flex-1 text-base md:text-lg font-semibold truncate">{task.title}</h1>

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
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 space-y-4 md:space-y-6">
          {/* Task Overview & Linked Context Cards */}
          <TaskViewContent 
            task={task}
            clientName={linkedClient?.name}
            caseNumber={linkedCase?.caseNumber}
            onNavigateToClient={linkedClient ? () => navigate(`/clients/${linkedClient.id}`) : undefined}
            onNavigateToCase={linkedCase ? () => navigate(`/cases/${linkedCase.id}`) : undefined}
          />

          {/* Card 3: Conversation */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  Conversation {messages.length > 0 && `(${messages.length})`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 px-3 md:px-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Loading conversation...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                      <p className="font-medium text-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground">
                        {isFollowUpMode 
                          ? 'Start the conversation by adding an update below'
                          : 'No updates have been added to this task yet'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className="py-1">
                        <MessageBubble
                          message={msg}
                          isOwnMessage={msg.createdBy === currentUserId}
                        />
                      </div>
                    ))}
                    <div ref={messagesEndRef} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {isFollowUpMode ? (
        <ComposeMessage
          onSend={handleSendMessage}
          currentStatus={task.status}
          currentAssigneeId={task.assignedToId}
          taskId={taskId}
        />
      ) : (
        <div className="border-t bg-card p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/tasks/${taskId}?mode=followup`)}
            className="flex-1 gap-2 order-2 sm:order-1"
          >
            <Plus className="h-4 w-4" />
            Add Follow-up
          </Button>
          {canEditTasks && (
            <Button
              onClick={() => navigate(`/tasks/${taskId}?mode=edit`)}
              className="flex-1 gap-2 order-1 sm:order-2"
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
          )}
        </div>
      )}

      {/* Task Edit Sheet */}
      <TaskEditSheet
        task={task}
        isOpen={isEditMode}
        onClose={() => navigate(`/tasks/${taskId}`)}
        onSuccess={() => {}}
      />
    </div>
  );
};