import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, FileText, CalendarCheck } from 'lucide-react';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { formatDateForDisplay, parseDateInput } from '@/utils/dateFormatters';
import { CaseSelector } from '@/components/ui/relationship-selector';
import { Badge } from '@/components/ui/badge';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { StandardDateInput } from '@/components/ui/standard-date-input';

export interface TaskFormData {
  title: string;
  description: string;
  caseId: string;
  stage: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Review' | 'Completed' | 'Overdue';
  assignedToId: string;
  assignedToName: string;
  estimatedHours: number;
  dueDate: string;
}

export interface TaskFormProps {
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  mode: 'create' | 'edit' | 'view';
  taskData?: Task | null;
  context: any;
  updateContext: (ctx: any) => void;
  getAvailableCases: () => any[];
  getContextDetails: () => any;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  formData,
  setFormData,
  mode,
  taskData,
  context,
  updateContext,
  getAvailableCases,
  getContextDetails,
}) => {
  const { state } = useAppState();

  return (
    <div className="space-y-6">
      {/* Section 1: Task Information */}
      <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
        <CardHeader className="border-b border-border p-6 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Task Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="title">Task Title <span className="text-destructive">*</span></Label>
              <FieldTooltip formId="create-task" fieldId="title" />
            </div>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={mode === 'view'}
              required
              autoComplete="off"
              placeholder="Enter task title"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Brief description of what needs to be accomplished
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="description">Description</Label>
              <FieldTooltip formId="create-task" fieldId="description" />
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={mode === 'view'}
              rows={3}
              autoComplete="off"
              placeholder="Additional details about this task"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Provide any additional context or requirements
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Case & Stage Context */}
      <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
        <CardHeader className="border-b border-border p-6 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Case & Stage Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Show context info for edit/view mode */}
          {mode !== 'create' && context.clientId && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              {/* Client Info */}
              <div className="bg-background rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getContextDetails().clientName}</span>
                  {getContextDetails().clientTier && (
                    <Badge variant="outline">{getContextDetails().clientTier}</Badge>
                  )}
                </div>
                {getContextDetails().clientLocation && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getContextDetails().clientLocation}
                  </p>
                )}
              </div>
              
              {/* Case Info */}
              {context.caseId && (
                <div className="bg-background rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{getContextDetails().caseNumber}</span>
                    {getContextDetails().caseStage && (
                      <Badge variant="outline">{getContextDetails().caseStage}</Badge>
                    )}
                  </div>
                  {getContextDetails().caseTitle && (
                    <p className="text-xs text-muted-foreground">{getContextDetails().caseTitle}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Case Selector */}
          <div>
            <div className="flex items-center gap-1">
              <Label>Case <span className="text-destructive">*</span></Label>
              <FieldTooltip formId="create-task" fieldId="case" />
            </div>
            <CaseSelector
              cases={state.cases}
              value={formData.caseId}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, caseId: value }));
                const selectedCase = state.cases.find(c => c.id === value);
                if (selectedCase) {
                  updateContext({ caseId: value, clientId: selectedCase.clientId });
                }
              }}
              disabled={mode === 'view' || (mode === 'edit' && !!taskData?.caseId)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tasks must be linked to a case for tracking
            </p>
          </div>

          {/* Stage */}
          <div>
            <div className="flex items-center gap-1">
              <Label>Stage <span className="text-destructive">*</span></Label>
              <FieldTooltip formId="create-task" fieldId="stage" />
            </div>
            <Select
              value={formData.stage}
              onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
              disabled={mode === 'view'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Notice Received">Notice Received</SelectItem>
                <SelectItem value="Reply Preparation">Reply Preparation</SelectItem>
                <SelectItem value="Personal Hearing">Personal Hearing</SelectItem>
                <SelectItem value="Order Received">Order Received</SelectItem>
                <SelectItem value="Appeal Filed">Appeal Filed</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Current case stage this task relates to
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Priority & Assignment */}
      <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
        <CardHeader className="border-b border-border p-6 pb-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Priority & Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Priority and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1">
                <Label>Priority <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-task" fieldId="priority" />
              </div>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Urgency level of this task
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label>Status</Label>
                <FieldTooltip formId="create-task" fieldId="status" />
              </div>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Current progress of this task
              </p>
            </div>
          </div>

          {/* Assignee and Hours Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="assignee">Assigned To <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-task" fieldId="assignee" />
              </div>
              <EmployeeSelector
                value={formData.assignedToId}
                onValueChange={(value) => {
                  const employee = state.employees.find(e => e.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    assignedToId: value,
                    assignedToName: employee?.full_name || ''
                  }));
                }}
                disabled={mode === 'view'}
                required
                showWorkload
              />
              <p className="text-xs text-muted-foreground mt-1">
                Assign responsible employee for this task
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="estimatedHours">Estimated Hours <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-task" fieldId="estimated-hours" />
              </div>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
                disabled={mode === 'view'}
                min="1"
                required
                placeholder="8"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Expected time to complete (hours)
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <div className="flex items-center gap-1">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <FieldTooltip formId="create-task" fieldId="due-date" />
            </div>
            <StandardDateInput
              id="dueDate"
              value={parseDateInput(formData.dueDate) || undefined}
              onChange={(isoDate) => setFormData(prev => ({ ...prev, dueDate: formatDateForDisplay(isoDate) }))}
              disabled={mode === 'view'}
              min={mode === 'create' ? new Date().toISOString().split('T')[0] : undefined}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target completion date for this task
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
