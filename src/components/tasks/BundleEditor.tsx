/**
 * Bundle Editor Component
 * Create, Edit, and Clone task bundles with automation settings
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  X, 
  Save, 
  Trash2, 
  GripVertical, 
  Clock,
  User,
  AlertTriangle,
  Settings,
  Zap,
  List,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GST_STAGES, EMPLOYEE_ROLES } from '../../../config/appConfig';
import { validateDueOffset } from '@/utils/date';
import { toast } from '@/hooks/use-toast';

interface BundleTask {
  id: string;
  title: string;
  description: string;
  assignedRole: string;
  dueOffset: string; // e.g., "+2d", "+1w"
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedHours: number;
  order: number;
}

interface TaskBundle {
  id?: string;
  name: string;
  stage: string;
  description: string;
  executionMode: 'Sequential' | 'Parallel';
  autoTrigger: boolean;
  conditions: {
    triggers: ('stage_enter' | 'stage_exit' | 'hearing_scheduled' | 'hearing_concluded' | 'before_deadline')[];
    specificStages?: string[];
  };
  tasks: BundleTask[];
  isActive: boolean;
}

interface BundleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  bundle?: TaskBundle | null;
  mode: 'create' | 'edit' | 'clone';
  onSave: (bundle: TaskBundle) => Promise<void>;
}

const defaultTask: Omit<BundleTask, 'id' | 'order'> = {
  title: '',
  description: '',
  assignedRole: 'Associate',
  dueOffset: '+1d',
  priority: 'Medium',
  estimatedHours: 8
};

export const BundleEditor: React.FC<BundleEditorProps> = ({
  isOpen,
  onClose,
  bundle,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState<TaskBundle>({
    name: '',
    stage: 'Any Stage',
    description: '',
    executionMode: 'Sequential',
    autoTrigger: false,
    conditions: {
      triggers: [],
      specificStages: []
    },
    tasks: [],
    isActive: true
  });

  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (bundle && (mode === 'edit' || mode === 'clone')) {
        setFormData({
          ...bundle,
          ...(mode === 'clone' && {
            id: undefined,
            name: `${bundle.name} — Copy`
          })
        });
      } else {
        // Reset to default for create mode
        setFormData({
          name: '',
          stage: 'Any Stage',
          description: '',
          executionMode: 'Sequential',
          autoTrigger: false,
          conditions: {
            triggers: [],
            specificStages: []
          },
          tasks: [],
          isActive: true
        });
      }
      setErrors({});
    }
  }, [isOpen, bundle, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Bundle name is required';
    }

    if (formData.tasks.length === 0) {
      newErrors.tasks = 'At least one task is required';
    }

    // Validate due offsets
    formData.tasks.forEach((task, index) => {
      if (!validateDueOffset(task.dueOffset)) {
        newErrors[`task_${index}_offset`] = 'Invalid due offset format (e.g., +2d, -1w)';
      }
      if (!task.title.trim()) {
        newErrors[`task_${index}_title`] = 'Task title is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
      toast({
        title: 'Success',
        description: `Bundle ${mode === 'create' ? 'created' : mode === 'clone' ? 'cloned' : 'updated'} successfully`
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save bundle',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addTask = () => {
    const newTask: BundleTask = {
      ...defaultTask,
      id: `task-${Date.now()}`,
      order: formData.tasks.length
    };
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const updateTask = (index: number, updates: Partial<BundleTask>) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, ...updates } : task
      )
    }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const moveTask = (fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newTasks = [...prev.tasks];
      const [movedTask] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, movedTask);
      
      // Update order
      return {
        ...prev,
        tasks: newTasks.map((task, index) => ({ ...task, order: index }))
      };
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create Task Bundle';
      case 'edit': return 'Edit Task Bundle';
      case 'clone': return 'Clone Task Bundle';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {getTitle()}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create' && 'Create a new task bundle for stage-based automation'}
            {mode === 'edit' && 'Modify the existing task bundle configuration'}
            {mode === 'clone' && 'Create a copy of the existing task bundle'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Bundle Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bundle Configuration</CardTitle>
              <CardDescription>Basic bundle settings and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bundle Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., ASMT-10 Response Bundle"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stage">Target Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose and workflow of this bundle..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="execution">Execution Mode</Label>
                  <Select value={formData.executionMode} onValueChange={(value: 'Sequential' | 'Parallel') => setFormData(prev => ({ ...prev, executionMode: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sequential">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          Sequential
                        </div>
                      </SelectItem>
                      <SelectItem value="Parallel">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Parallel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="autoTrigger"
                    checked={formData.autoTrigger}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoTrigger: checked }))}
                  />
                  <Label htmlFor="autoTrigger" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Auto-trigger on stage change
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Included Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Included Tasks</CardTitle>
                  <CardDescription>Define the tasks that will be created when this bundle is triggered</CardDescription>
                </div>
                <Button onClick={addTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {errors.tasks && <p className="text-sm text-red-500 mb-4">{errors.tasks}</p>}
              
              {formData.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks added yet</p>
                  <p className="text-sm">Click "Add Task" to start building your bundle</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <span className="text-sm font-medium text-muted-foreground">Task {index + 1}</span>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Task Title *</Label>
                          <Input
                            value={task.title}
                            onChange={(e) => updateTask(index, { title: e.target.value })}
                            placeholder="e.g., Draft response document"
                            className={errors[`task_${index}_title`] ? 'border-red-500' : ''}
                          />
                          {errors[`task_${index}_title`] && (
                            <p className="text-sm text-red-500">{errors[`task_${index}_title`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Assigned Role</Label>
                          <Select value={task.assignedRole} onValueChange={(value) => updateTask(index, { assignedRole: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EMPLOYEE_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={task.description}
                          onChange={(e) => updateTask(index, { description: e.target.value })}
                          placeholder="Detailed task description..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Due Offset</Label>
                          <Input
                            value={task.dueOffset}
                            onChange={(e) => updateTask(index, { dueOffset: e.target.value })}
                            placeholder="+2d"
                            className={errors[`task_${index}_offset`] ? 'border-red-500' : ''}
                          />
                          {errors[`task_${index}_offset`] && (
                            <p className="text-sm text-red-500">{errors[`task_${index}_offset`]}</p>
                          )}
                          <p className="text-xs text-muted-foreground">e.g., +2d, +1w, -3d</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={task.priority} onValueChange={(value: any) => updateTask(index, { priority: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Critical">Critical</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Estimated Hours</Label>
                          <Input
                            type="number"
                            value={task.estimatedHours}
                            onChange={(e) => updateTask(index, { estimatedHours: parseInt(e.target.value) || 0 })}
                            min="1"
                            max="100"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Save className="h-4 w-4" />
                </motion.div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create' : mode === 'clone' ? 'Clone' : 'Save'} Bundle
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};