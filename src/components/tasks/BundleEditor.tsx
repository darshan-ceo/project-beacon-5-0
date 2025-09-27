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
  ArrowRight,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TaskFormFields, TaskFormData } from '@/components/ui/TaskFormFields';
import { GST_STAGES, EMPLOYEE_ROLES } from '../../../config/appConfig';
import { validateDueOffset } from '@/utils/date';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BundleTask {
  id: string;
  title: string;
  description: string;
  assignedRole: string;
  category: string;              // NEW - task categorization
  dueOffset: string;             // e.g., "+2d", "+1w"
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedHours: number;
  dependencies?: string[];       // NEW - task dependencies
  order: number;
  templateId?: string;           // NEW - reference to source template
  automationFlags?: {            // NEW - automation settings
    autoAssign: boolean;
    notifyAssignee: boolean;
    requireCompletionProof: boolean;
  };
}

interface TaskBundle {
  id?: string;
  name: string;
  stages: string[];              // UPDATED - multi-stage support
  description: string;
  executionMode: 'Sequential' | 'Parallel';
  autoTrigger: boolean;
  conditions: {
    triggers: ('stage_enter' | 'stage_exit' | 'hearing_scheduled' | 'hearing_concluded' | 'before_deadline')[];
    specificStages?: string[];
  };
  tasks: BundleTask[];
  isActive: boolean;
  version?: number;              // NEW - versioning
  usageCount?: number;           // NEW - usage tracking
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
  category: 'General',           // NEW - default category
  dueOffset: '+1d',
  priority: 'Medium',
  estimatedHours: 8,
  dependencies: [],             // NEW - default empty dependencies
  automationFlags: {            // NEW - default automation settings
    autoAssign: true,
    notifyAssignee: true,
    requireCompletionProof: false
  }
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
    stages: ['Any Stage'],        // UPDATED - array for multi-stage support
    description: '',
    executionMode: 'Sequential',
    autoTrigger: false,
    conditions: {
      triggers: [],
      specificStages: []
    },
    tasks: [],
    isActive: true,
    version: 1,                   // NEW - default version
    usageCount: 0                 // NEW - default usage count
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
          stages: ['Any Stage'],    // UPDATED - array for multi-stage support
          description: '',
          executionMode: 'Sequential',
          autoTrigger: false,
          conditions: {
            triggers: [],
            specificStages: []
          },
          tasks: [],
          isActive: true,
          version: 1,               // NEW - default version
          usageCount: 0             // NEW - default usage count
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

  // Stage Multi-Select Component
  const StageMultiSelect: React.FC<{
    selectedStages: string[];
    onChange: (stages: string[]) => void;
  }> = ({ selectedStages, onChange }) => {
    const [open, setOpen] = React.useState(false);

    const toggleStage = (stage: string) => {
      if (stage === 'Any Stage') {
        onChange(['Any Stage']);
      } else {
        const newStages = selectedStages.includes('Any Stage') 
          ? [stage]
          : selectedStages.includes(stage)
            ? selectedStages.filter(s => s !== stage)
            : [...selectedStages.filter(s => s !== 'Any Stage'), stage];
        onChange(newStages.length === 0 ? ['Any Stage'] : newStages);
      }
    };

    const displayText = selectedStages.includes('Any Stage') 
      ? 'Any Stage' 
      : selectedStages.length === 0 
        ? 'Select stages...'
        : `${selectedStages.length} stage${selectedStages.length === 1 ? '' : 's'} selected`;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {displayText}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search stages..." />
            <CommandEmpty>No stages found.</CommandEmpty>
            <CommandGroup>
              <CommandList>
                {GST_STAGES.map((stage) => (
                  <CommandItem
                    key={stage}
                    onSelect={() => toggleStage(stage)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedStages.includes(stage) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {stage}
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
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
                  <FieldTooltipWrapper 
                    formId="task-bundle" 
                    fieldId="name" 
                    label="Bundle Name" 
                    required={true}
                  >
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., ASMT-10 Response Bundle"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                  </FieldTooltipWrapper>
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                
                 <div className="space-y-2">
                   <FieldTooltipWrapper 
                     formId="task-bundle" 
                     fieldId="stages" 
                     label="Target Stages"
                   >
                     <StageMultiSelect 
                       selectedStages={formData.stages}
                       onChange={(stages) => setFormData(prev => ({ ...prev, stages }))}
                     />
                   </FieldTooltipWrapper>
                 </div>
              </div>

              <div className="space-y-2">
                <FieldTooltipWrapper 
                  formId="task-bundle" 
                  fieldId="description" 
                  label="Description"
                >
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the purpose and workflow of this bundle..."
                    rows={3}
                  />
                </FieldTooltipWrapper>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldTooltipWrapper 
                    formId="task-bundle" 
                    fieldId="execution" 
                    label="Execution Mode"
                  >
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
                  </FieldTooltipWrapper>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="autoTrigger"
                    checked={formData.autoTrigger}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoTrigger: checked }))}
                  />
                  <FieldTooltipWrapper 
                    formId="task-bundle" 
                    fieldId="autoTrigger" 
                    label="Auto-trigger on stage change"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                  </FieldTooltipWrapper>
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
                          <FieldTooltipWrapper 
                            formId="task-bundle" 
                            fieldId="task-title" 
                            label="Task Title" 
                            required={true}
                          >
                             <Input
                               value={task.title}
                               onChange={(e) => updateTask(index, { title: e.target.value })}
                               placeholder="e.g., Draft response document"
                               className={errors[`task_${index}_title`] ? 'border-red-500' : ''}
                             />
                          </FieldTooltipWrapper>
                          {errors[`task_${index}_title`] && (
                            <p className="text-sm text-red-500">{errors[`task_${index}_title`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <FieldTooltipWrapper 
                            formId="task-bundle" 
                            fieldId="assigned-role" 
                            label="Assigned Role"
                          >
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
                          </FieldTooltipWrapper>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <FieldTooltipWrapper 
                          formId="task-bundle" 
                          fieldId="task-description" 
                          label="Description"
                        >
                          <Textarea
                            value={task.description}
                            onChange={(e) => updateTask(index, { description: e.target.value })}
                            placeholder="Detailed task description..."
                            rows={2}
                          />
                        </FieldTooltipWrapper>
                      </div>

                       <div className="grid grid-cols-4 gap-4">
                         <div className="space-y-2">
                           <FieldTooltipWrapper 
                             formId="task-bundle" 
                             fieldId="category" 
                             label="Category"
                           >
                             <Select value={task.category} onValueChange={(value) => updateTask(index, { category: value })}>
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="General">General</SelectItem>
                                 <SelectItem value="Legal Drafting">Legal Drafting</SelectItem>
                                 <SelectItem value="Documentation">Documentation</SelectItem>
                                 <SelectItem value="Review">Review</SelectItem>
                                 <SelectItem value="Filing">Filing</SelectItem>
                               </SelectContent>
                             </Select>
                           </FieldTooltipWrapper>
                         </div>

                         <div className="space-y-2">
                           <FieldTooltipWrapper 
                             formId="task-bundle" 
                             fieldId="due-offset" 
                             label="Due Offset"
                           >
                             <Input
                               value={task.dueOffset}
                               onChange={(e) => updateTask(index, { dueOffset: e.target.value })}
                               placeholder="+2d"
                               className={errors[`task_${index}_offset`] ? 'border-red-500' : ''}
                             />
                           </FieldTooltipWrapper>
                           {errors[`task_${index}_offset`] && (
                             <p className="text-sm text-red-500">{errors[`task_${index}_offset`]}</p>
                           )}
                         </div>

                         <div className="space-y-2">
                           <FieldTooltipWrapper 
                             formId="task-bundle" 
                             fieldId="priority" 
                             label="Priority"
                           >
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
                           </FieldTooltipWrapper>
                         </div>

                         <div className="space-y-2">
                           <FieldTooltipWrapper 
                             formId="task-bundle" 
                             fieldId="estimated-hours" 
                             label="Hours"
                           >
                             <Input
                               type="number"
                               value={task.estimatedHours}
                               onChange={(e) => updateTask(index, { estimatedHours: parseInt(e.target.value) || 0 })}
                               min="1"
                               max="100"
                             />
                           </FieldTooltipWrapper>
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