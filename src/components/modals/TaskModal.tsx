import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Building2, MapPin, IndianRupee, FileText, CalendarCheck, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { CaseSelector } from '@/components/ui/relationship-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { Badge } from '@/components/ui/badge';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  mode: 'create' | 'edit' | 'view';
  contextCaseId?: string;
  contextClientId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  task: taskData, 
  mode,
  contextCaseId, 
  contextClientId 
}) => {
  const { state, dispatch } = useAppState();
  const { validateTaskCase, getCaseWithClient } = useRelationships();
  const { context, updateContext, getAvailableCases, getContextDetails } = useContextualForms({
    caseId: contextCaseId,
    clientId: contextClientId
  });
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    caseId: string;
    stage: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Not Started' | 'In Progress' | 'Review' | 'Completed' | 'Overdue';
    assignedToId: string;
    assignedToName: string;
    estimatedHours: number;
    dueDate: Date;
  }>({
    title: '',
    description: '',
    caseId: contextCaseId || '',
    stage: '',
    priority: 'Medium',
    status: 'Not Started',
    assignedToId: '',
    assignedToName: '',
    estimatedHours: 8,
    dueDate: new Date()
  });

  useEffect(() => {
    // Only update form data when task changes or mode changes, not on every render
    if (taskData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        title: taskData.title,
        description: taskData.description,
        caseId: taskData.caseId,
        stage: taskData.stage,
        priority: taskData.priority,
        status: taskData.status,
        assignedToId: taskData.assignedToId,
        assignedToName: taskData.assignedToName,
        estimatedHours: taskData.estimatedHours,
        dueDate: new Date(taskData.dueDate)
      });
      updateContext({ caseId: taskData.caseId, clientId: taskData.clientId });
    } else if (mode === 'create' && !taskData) {
      // Only reset form for create mode when there's no task data
      setFormData({
        title: '',
        description: '',
        caseId: contextCaseId || '',
        stage: '',
        priority: 'Medium',
        status: 'Not Started',
        assignedToId: '',
        assignedToName: '',
        estimatedHours: 8,
        dueDate: new Date()
      });
    }
  }, [taskData?.id, mode, contextCaseId]); // Add specific dependencies to prevent infinite loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate case relationship
    const caseValidation = validateTaskCase(formData.caseId);
    if (!caseValidation.isValid) {
      toast({
        title: "Validation Error",
        description: caseValidation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    // Get case and client info for auto-derivation
    const caseWithClient = getCaseWithClient(formData.caseId);
    if (!caseWithClient?.case || !caseWithClient?.client) {
      toast({
        title: "Error",
        description: "Could not find case or client information.",
        variant: "destructive"
      });
      return;
    }
    
    if (mode === 'create') {
      const newTask: Task = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        caseId: formData.caseId,
        clientId: caseWithClient.client.id, // Auto-derived from case
        caseNumber: caseWithClient.case.caseNumber, // Auto-derived from case
        stage: formData.stage,
        priority: formData.priority,
        status: formData.status,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        assignedById: '3', // Current User ID - in real app, get from auth context
        assignedByName: 'Mike Wilson', // Current User Name - in real app, get from auth context
        createdDate: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate.toISOString().split('T')[0],
        estimatedHours: formData.estimatedHours,
        isAutoGenerated: false,
        escalationLevel: 0
      };

      dispatch({ type: 'ADD_TASK', payload: newTask });
      toast({
        title: "Task Created",
        description: `Task "${formData.title}" has been created successfully.`,
      });
    } else if (mode === 'edit' && taskData) {
      const updatedTask: Task = {
        ...taskData,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        estimatedHours: formData.estimatedHours,
        dueDate: formData.dueDate.toISOString().split('T')[0]
        // Note: caseId, clientId, caseNumber are not updatable in edit mode
      };

      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      toast({
        title: "Task Updated",
        description: `Task "${formData.title}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (taskData) {
      dispatch({ type: 'DELETE_TASK', payload: taskData.id });
      toast({
        title: "Task Deleted",
        description: `Task "${taskData.title}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh] overflow-hidden border bg-background shadow-beacon-lg rounded-beacon-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            {mode === 'create' && 'Create New Task'}
            {mode === 'edit' && 'Edit Task'}
            {mode === 'view' && 'Task Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="px-6 py-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                          <p className="text-xs text-muted-foreground">
                            {getContextDetails().caseTitle}
                          </p>
                        )}
                        {getContextDetails().amountInDispute && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            Amount: ₹{getContextDetails().amountInDispute.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Case and Stage Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="case">Case <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-task" fieldId="case" />
                    </div>
                    {contextCaseId ? (
                      <div className="space-y-2">
                        <ContextBadge
                          label="Case"
                          value={getContextDetails().case?.caseNumber || 'Unknown Case'}
                          variant="outline"
                        />
                      </div>
                    ) : (
                      <CaseSelector
                        cases={getAvailableCases()}
                        value={formData.caseId}
                        onValueChange={(value) => {
                          const selectedCase = state.cases.find(c => c.id === value);
                          if (selectedCase) {
                            setFormData(prev => ({ 
                              ...prev, 
                              caseId: value,
                              stage: selectedCase.currentStage
                            }));
                            updateContext({ caseId: value });
                          }
                        }}
                        disabled={mode === 'view'}
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Associate task with a specific case
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="stage">Stage <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-task" fieldId="stage" />
                    </div>
                    <Select 
                      value={formData.stage} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assessment">Assessment</SelectItem>
                        <SelectItem value="Adjudication">Adjudication</SelectItem>
                        <SelectItem value="First Appeal">First Appeal</SelectItem>
                        <SelectItem value="Tribunal">Tribunal</SelectItem>
                        <SelectItem value="High Court">High Court</SelectItem>
                        <SelectItem value="Supreme Court">Supreme Court</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current lifecycle stage of the case
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Assignment & Timeline */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  Assignment & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Priority and Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="priority">Priority <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-task" fieldId="priority" />
                    </div>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                      disabled={mode === 'view'}
                    >
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Task urgency level
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-task" fieldId="status" />
                    </div>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Current completion status
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.dueDate && "text-muted-foreground"
                        )}
                        disabled={mode === 'view'}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, dueDate: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target completion date for this task
                  </p>
                </div>
              </CardContent>
            </Card>
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'edit' && (
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete Task
            </Button>
          )}
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit}>
              {mode === 'create' ? 'Create Task' : 'Update Task'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};