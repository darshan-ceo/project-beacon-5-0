import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  Circle,
  Edit,
  Save,
  X,
  Tag,
  MessageSquare,
  Paperclip,
  MoreVertical,
  Building2,
  Bell
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Task, TaskNote, useAppState } from '@/contexts/AppStateContext';
import { formatDistanceToNow } from 'date-fns';
import { TaskTimeline } from './TaskTimeline';
import { QuickActionButtons } from './QuickActionButtons';
import { toast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';
import { getFollowUpBadgeVariant, getFollowUpStatus } from '@/utils/taskHelpers';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
}

const statusIcons = {
  'Not Started': Circle,
  'In Progress': Clock,
  'Review': AlertTriangle,
  'Completed': CheckCircle,
  'Overdue': AlertTriangle
};

const priorityColors = {
  'Critical': 'border-destructive bg-destructive/5 text-destructive',
  'High': 'border-warning bg-warning/5 text-warning',
  'Medium': 'border-primary bg-primary/5 text-primary',
  'Low': 'border-success bg-success/5 text-success'
};

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask
}) => {
  const { state, dispatch } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  // Get task notes for this task
  const taskNotes = useMemo(() => {
    if (!task) return [];
    return state.taskNotes
      .filter(note => note.taskId === task.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.taskNotes, task]);

  // Get client name
  const getClientName = () => {
    if (!task) return null;
    
    // First, check if task has clientName property (from enrichment)
    if ((task as any).clientName) {
      return (task as any).clientName;
    }
    
    // Otherwise, look up from clientId
    const client = state.clients.find(c => c.id === task.clientId);
    return client?.name || null;
  };
  
  const clientName = getClientName();

  useEffect(() => {
    if (task) {
      setEditedTask(task);
    }
  }, [task]);

  const handleSave = () => {
    if (task && onUpdateTask) {
      onUpdateTask(task.id, editedTask);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (task) {
      setEditedTask(task);
    }
    setIsEditing(false);
  };

  const updateField = (field: keyof Task, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };

  // Quick action handlers
  const handleAddNote = (note: string) => {
    if (!task) return;
    
    const newNote: TaskNote = {
      id: uuid(),
      taskId: task.id,
      type: 'comment',
      note,
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_TASK_NOTE', payload: newNote });
    toast({
      title: 'Note Added',
      description: 'Your note has been added to the timeline.'
    });
  };

  const handleLogTime = (hours: number, note: string) => {
    if (!task || !onUpdateTask) return;

    // Update task actualHours
    const newActualHours = (task.actualHours || 0) + hours;
    onUpdateTask(task.id, { actualHours: newActualHours });

    // Create time log note
    const newNote: TaskNote = {
      id: uuid(),
      taskId: task.id,
      type: 'time_log',
      note: note || `Logged ${hours} hours`,
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name,
      createdAt: new Date().toISOString(),
      metadata: { hours }
    };

    dispatch({ type: 'ADD_TASK_NOTE', payload: newNote });
    toast({
      title: 'Time Logged',
      description: `${hours} hours logged successfully.`
    });
  };

  const handleReschedule = (newDate: string) => {
    if (!task || !onUpdateTask) return;

    onUpdateTask(task.id, { dueDate: newDate });

    const newNote: TaskNote = {
      id: uuid(),
      taskId: task.id,
      type: 'comment',
      note: `Due date rescheduled to ${newDate}`,
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_TASK_NOTE', payload: newNote });
    toast({
      title: 'Task Rescheduled',
      description: `Due date updated to ${newDate}`
    });
  };

  const handleSetFollowUp = (followUpDate: string, note: string) => {
    if (!task || !onUpdateTask) return;

    onUpdateTask(task.id, { followUpDate });

    const newNote: TaskNote = {
      id: uuid(),
      taskId: task.id,
      type: 'follow_up',
      note: note || `Follow-up scheduled for ${followUpDate}`,
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name,
      createdAt: new Date().toISOString(),
      metadata: { followUpDate }
    };

    dispatch({ type: 'ADD_TASK_NOTE', payload: newNote });
    toast({
      title: 'Follow-up Set',
      description: `Reminder set for ${followUpDate}`
    });
  };

  const handleChangeStatus = (newStatus: string, note: string) => {
    if (!task || !onUpdateTask) return;

    const oldStatus = task.status;
    onUpdateTask(task.id, { status: newStatus as Task['status'] });

    const newNote: TaskNote = {
      id: uuid(),
      taskId: task.id,
      type: 'status_change',
      note,
      createdBy: state.userProfile.id,
      createdByName: state.userProfile.name,
      createdAt: new Date().toISOString(),
      metadata: { oldStatus, newStatus }
    };

    dispatch({ type: 'ADD_TASK_NOTE', payload: newNote });
    toast({
      title: 'Status Updated',
      description: `Status changed from ${oldStatus} to ${newStatus}`
    });
  };

  const handleBatchUpdate = (updates: {
    status?: string;
    hours?: number;
    dueDate?: string;
    followUpDate?: string;
    comment: string;
  }) => {
    if (!task || !onUpdateTask) return;

    const timestamp = new Date().toISOString();
    const taskUpdates: Partial<Task> = {};
    const notes: TaskNote[] = [];

    // Apply all task updates at once
    if (updates.status && updates.status !== task.status) {
      taskUpdates.status = updates.status as Task['status'];
      notes.push({
        id: uuid(),
        taskId: task.id,
        type: 'status_change',
        note: updates.comment,
        createdBy: state.userProfile.id,
        createdByName: state.userProfile.name,
        createdAt: timestamp,
        metadata: { oldStatus: task.status, newStatus: updates.status }
      });
    }

    if (updates.hours) {
      taskUpdates.actualHours = (task.actualHours || 0) + updates.hours;
      notes.push({
        id: uuid(),
        taskId: task.id,
        type: 'time_log',
        note: updates.comment,
        createdBy: state.userProfile.id,
        createdByName: state.userProfile.name,
        createdAt: timestamp,
        metadata: { hours: updates.hours }
      });
    }

    if (updates.dueDate && updates.dueDate !== task.dueDate) {
      taskUpdates.dueDate = updates.dueDate;
      notes.push({
        id: uuid(),
        taskId: task.id,
        type: 'comment',
        note: `${updates.comment} (Due date changed to ${new Date(updates.dueDate).toLocaleDateString()})`,
        createdBy: state.userProfile.id,
        createdByName: state.userProfile.name,
        createdAt: timestamp
      });
    }

    if (updates.followUpDate) {
      taskUpdates.followUpDate = updates.followUpDate;
      notes.push({
        id: uuid(),
        taskId: task.id,
        type: 'follow_up',
        note: updates.comment,
        createdBy: state.userProfile.id,
        createdByName: state.userProfile.name,
        createdAt: timestamp,
        metadata: { followUpDate: updates.followUpDate }
      });
    }

    // Update task
    onUpdateTask(task.id, taskUpdates);

    // Dispatch all notes at once
    notes.forEach(note => {
      dispatch({ type: 'ADD_TASK_NOTE', payload: note });
    });

    // Show consolidated toast
    const changes = [];
    if (updates.status) changes.push('status');
    if (updates.hours) changes.push(`${updates.hours}h logged`);
    if (updates.dueDate) changes.push('due date');
    if (updates.followUpDate) changes.push('follow-up');

    toast({
      title: 'Task Updated',
      description: `Updated: ${changes.join(', ')}`
    });
  };

  if (!task) return null;

  const StatusIcon = statusIcons[task.status];
  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date();
  const completionRate = task.actualHours ? (task.actualHours / task.estimatedHours) * 100 : 0;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DrawerTitle className="text-left">
                {isEditing ? (
                  <Input
                    value={editedTask.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  task.title
                )}
              </DrawerTitle>
              
              {/* Client Name Section */}
              {clientName && (
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{clientName}</span>
                </div>
              )}
              
              <DrawerDescription className="text-left">
                {task.caseNumber} • {task.stage}
              </DrawerDescription>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status and Priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Status & Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedTask.status || task.status}
                          onValueChange={(value) => updateField('status', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Review">Review</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center mt-1">
                          <StatusIcon className="h-4 w-4 mr-2" />
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      {isEditing ? (
                        <Select
                          value={editedTask.priority || task.priority}
                          onValueChange={(value) => updateField('priority', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          className={`mt-1 ${priorityColors[task.priority]}`}
                          variant="outline"
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description || ''}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={4}
                      placeholder="Task description..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {task.description || 'No description provided.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Progress Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedTask.estimatedHours || task.estimatedHours}
                            onChange={(e) => updateField('estimatedHours', parseFloat(e.target.value))}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-sm mt-1">{task.estimatedHours}h</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Actual Hours</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedTask.actualHours || task.actualHours || 0}
                            onChange={(e) => updateField('actualHours', parseFloat(e.target.value))}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-sm mt-1">{task.actualHours || 0}h</p>
                        )}
                      </div>
                    </div>
                    {task.actualHours && (
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Completion Rate</span>
                          <span>{Math.round(completionRate)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions & Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Quick Actions & Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <QuickActionButtons
                    currentStatus={task.status}
                    currentDueDate={task.dueDate}
                    currentFollowUpDate={task.followUpDate}
                    onBatchUpdate={handleBatchUpdate}
                  />
                  
                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-3">Timeline</h4>
                    <TaskTimeline notes={taskNotes} />
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {(task as any).tags && (task as any).tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(task as any).tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Assigned To</Label>
                      <div className="flex items-center mt-1">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {task.assignedToName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assignedToName}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Assigned By</Label>
                      <div className="flex items-center mt-1">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                            {task.assignedByName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assignedByName}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p className="text-sm mt-1">{task.createdDate}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Due Date</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editedTask.dueDate || task.dueDate}
                          onChange={(e) => updateField('dueDate', e.target.value)}
                          className="mt-1"
                        />
                      ) : (
                        <div className="flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                            {task.dueDate}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-up */}
              {task.followUpDate && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-600" />
                      <CardTitle className="text-sm font-medium text-amber-900">Follow-up Reminder</CardTitle>
                      <Badge variant={getFollowUpBadgeVariant(task.followUpDate)} className="ml-auto">
                        {getFollowUpStatus(task.followUpDate)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-900 font-medium">
                          {new Date(task.followUpDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 ml-6">
                        {formatDistanceToNow(new Date(task.followUpDate), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Escalation */}
              {task.escalationLevel > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Escalation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="destructive">
                      Level {task.escalationLevel}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Auto-generated */}
              {task.isAutoGenerated && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Automation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="bg-secondary/20">
                      Auto-generated Task
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <DrawerFooter className="border-t">
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};