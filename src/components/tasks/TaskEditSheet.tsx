import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { TaskForm, TaskFormData } from './TaskForm';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { tasksService } from '@/services/tasksService';
import { toast } from 'sonner';
import { formatDateForDisplay, parseDateInput } from '@/utils/dateFormatters';

interface TaskEditSheetProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TaskEditSheet: React.FC<TaskEditSheetProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Context for case/client relationship
  const [context, setContext] = useState({
    clientId: task.clientId || '',
    caseId: task.caseId || ''
  });

  // Initialize form data from task
  const [formData, setFormData] = useState<TaskFormData>({
    title: task.title || '',
    description: task.description || '',
    caseId: task.caseId || '',
    stage: task.stage || '',
    priority: task.priority || 'Medium',
    status: task.status || 'Not Started',
    assignedToId: task.assignedToId || '',
    assignedToName: task.assignedToName || '',
    estimatedHours: task.estimatedHours || 8,
    dueDate: task.dueDate ? formatDateForDisplay(task.dueDate) : ''
  });

  // Update form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      caseId: task.caseId || '',
      stage: task.stage || '',
      priority: task.priority || 'Medium',
      status: task.status || 'Not Started',
      assignedToId: task.assignedToId || '',
      assignedToName: task.assignedToName || '',
      estimatedHours: task.estimatedHours || 8,
      dueDate: task.dueDate ? formatDateForDisplay(task.dueDate) : ''
    });
    setContext({
      clientId: task.clientId || '',
      caseId: task.caseId || ''
    });
  }, [task]);

  const updateContext = (ctx: any) => {
    setContext(prev => ({ ...prev, ...ctx }));
  };

  const getAvailableCases = () => {
    return state.cases;
  };

  const getContextDetails = () => {
    const selectedCase = state.cases.find(c => c.id === context.caseId);
    const selectedClient = state.clients.find(c => c.id === context.clientId);
    
    return {
      clientName: selectedClient?.name || '',
      clientTier: (selectedClient as any)?.tier || '',
      clientLocation: (selectedClient as any)?.city && (selectedClient as any)?.state 
        ? `${(selectedClient as any).city}, ${(selectedClient as any).state}` 
        : '',
      caseNumber: selectedCase?.caseNumber || '',
      caseTitle: selectedCase?.title || '',
      caseStage: (selectedCase as any)?.stageCode || (selectedCase as any)?.stage || ''
    };
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!formData.caseId) {
      toast.error('Case is required');
      return;
    }
    if (!formData.assignedToId) {
      toast.error('Assignee is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse due date to ISO format
      const parsedDueDate = parseDateInput(formData.dueDate);

      await tasksService.update(task.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        caseId: formData.caseId,
        clientId: context.clientId,
        stage: formData.stage,
        priority: formData.priority,
        status: formData.status,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        estimatedHours: formData.estimatedHours,
        dueDate: typeof parsedDueDate === 'string' ? parsedDueDate : (parsedDueDate ? parsedDueDate.toISOString().split('T')[0] : '')
      }, dispatch);

      toast.success('Task updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col p-0"
      >
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Edit Task</SheetTitle>
              <SheetDescription>
                Modify task properties and save changes
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <TaskForm
            formData={formData}
            setFormData={setFormData}
            mode="edit"
            taskData={task}
            context={context}
            updateContext={updateContext}
            getAvailableCases={getAvailableCases}
            getContextDetails={getContextDetails}
          />
        </div>

        {/* Footer - Always at bottom */}
        <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
