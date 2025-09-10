import React, { useState, useEffect } from 'react';
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
  MoreVertical
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
import { Task } from '@/contexts/AppStateContext';
import { formatDistanceToNow } from 'date-fns';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

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