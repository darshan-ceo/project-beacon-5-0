// Task Messages Types for Conversation-Style Follow-ups

export interface TaskMessage {
  id: string;
  tenantId: string;
  taskId: string;
  message: string;
  attachments: TaskAttachment[];
  statusUpdate?: TaskStatusUpdate | null;
  isSystemMessage: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export type TaskStatusUpdate = 
  | 'Not Started' 
  | 'In Progress' 
  | 'Need Info' 
  | 'On Hold'
  | 'Review'
  | 'Completed' 
  | 'Cancelled';

export interface CreateMessageData {
  message: string;
  attachments?: TaskAttachment[];
  statusUpdate?: TaskStatusUpdate | null;
  isSystemMessage?: boolean;
}

export interface CreateTaskData {
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  dueDate?: string;
  tags?: string[];
  attachments?: TaskAttachment[];
  caseId?: string;
  clientId?: string;
}

export const TASK_STATUS_OPTIONS: { value: TaskStatusUpdate; label: string; color: string }[] = [
  { value: 'Not Started', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'Need Info', label: 'Need Info', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'Review', label: 'Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
];
