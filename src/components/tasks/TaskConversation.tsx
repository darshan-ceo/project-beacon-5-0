import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/AppStateContext';
import { taskMessagesService } from '@/services/taskMessagesService';
import { TaskMessage, TaskAttachment, TaskStatusUpdate } from '@/types/taskMessages';
import { TaskHeader } from './TaskHeader';
import { CollapsibleDescription } from './CollapsibleDescription';
import { MessageBubble } from './MessageBubble';
import { ComposeMessage } from './ComposeMessage';
import { QuickStatusButton } from './QuickStatusButton';
import { supabase } from '@/integrations/supabase/client';
import { tasksService } from '@/services/tasksService';
import { toast } from 'sonner';

export const TaskConversation: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const task = state.tasks.find((t) => t.id === taskId);

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
    statusUpdate?: TaskStatusUpdate
  ) => {
    if (!taskId || !task) return;

    // Validate tenantId before sending
    if (!tenantId) {
      toast.error('Unable to send message. Please refresh and try again.');
      return;
    }
    
    await taskMessagesService.createMessage(
      taskId,
      tenantId,
      currentUserId,
      currentUserName,
      { message, attachments, statusUpdate }
    );
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
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksService.delete(taskId, dispatch);
        navigate('/tasks');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

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
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="border-b bg-card">
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
            <QuickStatusButton
              currentStatus={task.status || 'Not Started'}
              onStatusChange={handleQuickStatusChange}
              disabled={isUpdatingStatus}
              size="sm"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/tasks/${taskId}?edit=true`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={handleDeleteTask}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Task Meta Info */}
        <div className="px-4 pb-3 border-t pt-3">
          <TaskHeader task={task} compact />
        </div>
      </div>

      {/* Collapsible Description */}
      <CollapsibleDescription description={task.description || ''} />

      {/* Messages - Chat Style */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
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
                    Start the conversation by adding an update below
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.createdBy === currentUserId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Compose Bar */}
      <ComposeMessage
        onSend={handleSendMessage}
        currentStatus={task.status}
      />
    </div>
  );
};