import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Flag, 
  MoreVertical,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/AppStateContext';
import { taskMessagesService } from '@/services/taskMessagesService';
import { TaskMessage, TaskAttachment, TaskStatusUpdate, TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { CollapsibleDescription } from './CollapsibleDescription';
import { MessageBubble } from './MessageBubble';
import { ComposeMessage } from './ComposeMessage';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const TaskConversation: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { state } = useAppState();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const task = state.tasks.find((t) => t.id === taskId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const profile = state.employees.find((e) => e.id === user.id);
        setCurrentUserName(profile?.full_name || user.email || 'User');
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

    const profile = state.employees.find((e) => e.id === currentUserId);
    const tenantId = profile?.tenantId || '';
    
    await taskMessagesService.createMessage(
      taskId,
      tenantId,
      currentUserId,
      currentUserName,
      { message, attachments, statusUpdate }
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    const option = TASK_STATUS_OPTIONS.find(
      (opt) => opt.value.toLowerCase() === status?.toLowerCase()
    );
    return option?.color || 'bg-muted text-muted-foreground';
  };

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Task not found</p>
          <Button variant="link" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tasks')}
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{task.title}</h1>
            <Badge variant="secondary" className={getStatusColor(task.status || '')}>
              {task.status || 'Not Started'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            {task.assignedToName && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{task.assignedToName}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {task.priority && (
              <Badge variant="secondary" className={cn('text-xs', getPriorityColor(task.priority))}>
                <Flag className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/tasks/edit/${taskId}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapsible Description */}
      <CollapsibleDescription description={task.description || ''} />

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation below.</p>
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

      {/* Compose */}
      <ComposeMessage
        onSend={handleSendMessage}
        currentStatus={task.status}
      />
    </div>
  );
};
