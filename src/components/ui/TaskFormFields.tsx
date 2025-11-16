/**
 * Reusable Task Form Fields Component
 * Provides consistent form fields for both Task Templates and Task Bundles
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GST_STAGES } from '../../../config/appConfig';
import { useAppState } from '@/contexts/AppStateContext';
import { getAvailableEmployeeRoles } from '@/utils/masterDataUtils';

// Form interfaces
export interface AutomationFlags {
  auto_assign: boolean;
  notify_assignee: boolean;
  require_completion_proof: boolean;
  suggest_on_trigger: boolean;
  auto_create_on_trigger: boolean;
}

const TASK_CATEGORIES = [
  'Legal Drafting',
  'Documentation', 
  'Review',
  'Client Management',
  'Filing',
  'Hearing Prep',
  'Research',
  'General'
];

const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'Medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'Low', label: 'Low', color: 'bg-green-100 text-green-800' }
];

export interface TaskFormData {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignedRole: string;
  category: string;
  dependencies?: string[];
  dueOffset?: string;
  automationFlags?: AutomationFlags;
}

interface TaskFormFieldsProps {
  data: TaskFormData;
  onChange: (updates: Partial<TaskFormData>) => void;
  errors?: Record<string, string>;
  showDueOffset?: boolean;
  showDependencies?: boolean;
  showAutomationFlags?: boolean;
  availableTasks?: Array<{ id: string; title: string }>;
  fieldPrefix?: string;
}

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  data,
  onChange,
  errors = {},
  showDueOffset = false,
  showDependencies = false,
  showAutomationFlags = false,
  availableTasks = [],
  fieldPrefix = ''
}) => {
  const getFieldError = (field: string) => errors[fieldPrefix ? `${fieldPrefix}_${field}` : field];
  const { state } = useAppState();
  const employeeRoles = getAvailableEmployeeRoles(state.employees);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <FieldTooltipWrapper 
          formId="task-form" 
          fieldId="title" 
          label="Task Title" 
          required={true}
        >
          <Input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g., Draft Response to Notice"
            className={getFieldError('title') ? 'border-red-500' : ''}
          />
        </FieldTooltipWrapper>
        {getFieldError('title') && (
          <p className="text-sm text-red-500">{getFieldError('title')}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <FieldTooltipWrapper 
          formId="task-form" 
          fieldId="description" 
          label="Description"
        >
          <Textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Detailed task description..."
            rows={3}
            className={getFieldError('description') ? 'border-red-500' : ''}
          />
        </FieldTooltipWrapper>
        {getFieldError('description') && (
          <p className="text-sm text-red-500">{getFieldError('description')}</p>
        )}
      </div>

      {/* Role and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="assigned-role" 
            label="Assigned Role"
            required={true}
          >
            <Select value={data.assignedRole} onValueChange={(value) => onChange({ assignedRole: value })}>
              <SelectTrigger className={getFieldError('assignedRole') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {employeeRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldTooltipWrapper>
          {getFieldError('assignedRole') && (
            <p className="text-sm text-red-500">{getFieldError('assignedRole')}</p>
          )}
        </div>

        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="category" 
            label="Category"
            required={true}
          >
            <Select value={data.category} onValueChange={(value) => onChange({ category: value })}>
              <SelectTrigger className={getFieldError('category') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldTooltipWrapper>
          {getFieldError('category') && (
            <p className="text-sm text-red-500">{getFieldError('category')}</p>
          )}
        </div>
      </div>

      {/* Priority and Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="priority" 
            label="Priority"
            required={true}
          >
            <Select value={data.priority} onValueChange={(value: any) => onChange({ priority: value })}>
              <SelectTrigger className={getFieldError('priority') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={option.color}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldTooltipWrapper>
          {getFieldError('priority') && (
            <p className="text-sm text-red-500">{getFieldError('priority')}</p>
          )}
        </div>

        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="estimated-hours" 
            label="Estimated Hours"
            required={true}
          >
            <Input
              type="number"
              value={data.estimatedHours}
              onChange={(e) => onChange({ estimatedHours: parseInt(e.target.value) || 0 })}
              placeholder="8"
              min="1"
              max="160"
              className={getFieldError('estimatedHours') ? 'border-red-500' : ''}
            />
          </FieldTooltipWrapper>
          {getFieldError('estimatedHours') && (
            <p className="text-sm text-red-500">{getFieldError('estimatedHours')}</p>
          )}
        </div>
      </div>

      {/* Due Offset (for Bundle items) */}
      {showDueOffset && (
        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="due-offset" 
            label="Due Offset"
          >
            <Input
              value={data.dueOffset || '+1d'}
              onChange={(e) => onChange({ dueOffset: e.target.value })}
              placeholder="+2d, +1w, -3d"
              className={getFieldError('dueOffset') ? 'border-red-500' : ''}
            />
          </FieldTooltipWrapper>
          {getFieldError('dueOffset') && (
            <p className="text-sm text-red-500">{getFieldError('dueOffset')}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Format: +/- number + d(days)/w(weeks)/m(months). E.g., +2d, -1w, +3m
          </p>
        </div>
      )}

      {/* Dependencies (for Templates) */}
      {showDependencies && availableTasks.length > 0 && (
        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="dependencies" 
            label="Dependencies"
          >
            <DependencySelector 
              selectedDependencies={data.dependencies || []}
              availableTasks={availableTasks}
              onChange={(dependencies) => onChange({ dependencies })}
            />
          </FieldTooltipWrapper>
          {getFieldError('dependencies') && (
            <p className="text-sm text-red-500">{getFieldError('dependencies')}</p>
          )}
        </div>
      )}

      {/* Automation Flags */}
      {showAutomationFlags && (
        <div className="space-y-2">
          <FieldTooltipWrapper 
            formId="task-form" 
            fieldId="automation-flags" 
            label="Automation Settings"
          >
            <div className="space-y-3 p-3 border rounded">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="auto-assign"
                  checked={data.automationFlags?.auto_assign ?? true}
                  onChange={(e) => onChange({ 
                    automationFlags: { 
                      ...data.automationFlags, 
                      auto_assign: e.target.checked 
                    } 
                  })}
                />
                <label htmlFor="auto-assign" className="text-sm">Auto assign on creation</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="notify-assignee"
                  checked={data.automationFlags?.notify_assignee ?? true}
                  onChange={(e) => onChange({ 
                    automationFlags: { 
                      ...data.automationFlags, 
                      notify_assignee: e.target.checked 
                    } 
                  })}
                />
                <label htmlFor="notify-assignee" className="text-sm">Notify assignee</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="suggest-trigger"
                  checked={data.automationFlags?.suggest_on_trigger ?? false}
                  onChange={(e) => onChange({ 
                    automationFlags: { 
                      ...data.automationFlags, 
                      suggest_on_trigger: e.target.checked 
                    } 
                  })}
                />
                <label htmlFor="suggest-trigger" className="text-sm">Suggest on trigger</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="auto-create-trigger"
                  checked={data.automationFlags?.auto_create_on_trigger ?? false}
                  onChange={(e) => onChange({ 
                    automationFlags: { 
                      ...data.automationFlags, 
                      auto_create_on_trigger: e.target.checked 
                    } 
                  })}
                />
                <label htmlFor="auto-create-trigger" className="text-sm">Auto create on trigger</label>
              </div>
            </div>
          </FieldTooltipWrapper>
        </div>
      )}
    </div>
  );
};

interface DependencySelectorProps {
  selectedDependencies: string[];
  availableTasks: Array<{ id: string; title: string }>;
  onChange: (dependencies: string[]) => void;
}

const DependencySelector: React.FC<DependencySelectorProps> = ({
  selectedDependencies,
  availableTasks,
  onChange
}) => {
  const [open, setOpen] = React.useState(false);

  const toggleDependency = (taskId: string) => {
    const newDependencies = selectedDependencies.includes(taskId)
      ? selectedDependencies.filter(id => id !== taskId)
      : [...selectedDependencies, taskId];
    onChange(newDependencies);
  };

  const removeDependency = (taskId: string) => {
    onChange(selectedDependencies.filter(id => id !== taskId));
  };

  const selectedTasks = availableTasks.filter(task => selectedDependencies.includes(task.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedDependencies.length === 0 
              ? "Select dependencies..." 
              : `${selectedDependencies.length} task${selectedDependencies.length === 1 ? '' : 's'} selected`
            }
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search tasks..." />
            <CommandEmpty>No tasks found.</CommandEmpty>
            <CommandGroup>
              <CommandList>
                {availableTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    onSelect={() => toggleDependency(task.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDependencies.includes(task.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {task.title}
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTasks.map((task) => (
            <Badge key={task.id} variant="secondary" className="flex items-center gap-1">
              {task.title.substring(0, 30)}...
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => removeDependency(task.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};