import { supabase } from '@/integrations/supabase/client';
import { TaskMessage, CreateMessageData, TaskAttachment } from '@/types/taskMessages';
import { toast } from 'sonner';

class TaskMessagesService {
  async getMessagesByTaskId(taskId: string): Promise<TaskMessage[]> {
    const { data, error } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching task messages:', error);
      throw error;
    }

    return (data || []).map(this.mapToTaskMessage);
  }

  async createMessage(
    taskId: string, 
    tenantId: string,
    userId: string,
    userName: string,
    messageData: CreateMessageData
  ): Promise<TaskMessage> {
    const { data, error } = await supabase
      .from('task_messages')
      .insert([{
        task_id: taskId,
        tenant_id: tenantId,
        message: messageData.message,
        attachments: JSON.parse(JSON.stringify(messageData.attachments || [])),
        status_update: messageData.statusUpdate || null,
        is_system_message: messageData.isSystemMessage || false,
        created_by: userId,
        created_by_name: userName,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating task message:', error);
      toast.error('Failed to send message');
      throw error;
    }

    // If there's a status update, also update the task status
    if (messageData.statusUpdate) {
      await this.updateTaskStatus(taskId, messageData.statusUpdate);
    }

    toast.success('Message sent');
    return this.mapToTaskMessage(data);
  }

  async updateMessage(messageId: string, message: string): Promise<TaskMessage> {
    const { data, error } = await supabase
      .from('task_messages')
      .update({ message })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task message:', error);
      toast.error('Failed to update message');
      throw error;
    }

    toast.success('Message updated');
    return this.mapToTaskMessage(data);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('task_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting task message:', error);
      toast.error('Failed to delete message');
      throw error;
    }

    toast.success('Message deleted');
  }

  async createInitialMessage(
    taskId: string,
    tenantId: string,
    userId: string,
    userName: string,
    description: string,
    attachments?: TaskAttachment[]
  ): Promise<TaskMessage> {
    return this.createMessage(taskId, tenantId, userId, userName, {
      message: description || 'Task created',
      attachments: attachments || [],
      isSystemMessage: true,
    });
  }

  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
    }
  }

  private mapToTaskMessage(data: any): TaskMessage {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      taskId: data.task_id,
      message: data.message,
      attachments: data.attachments || [],
      statusUpdate: data.status_update,
      isSystemMessage: data.is_system_message,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const taskMessagesService = new TaskMessagesService();
