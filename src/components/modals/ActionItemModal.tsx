import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, FileText, User, Plus, Loader2 } from 'lucide-react';
import { StandardDateInput } from '@/components/ui/standard-date-input';
import { tasksService } from '@/services/tasksService';

interface ActionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string | null;
  urgencyLevel: 'High' | 'Medium' | 'Low';
  suggestedAction?: string;
}

export const ActionItemModal: React.FC<ActionItemModalProps> = ({
  isOpen,
  onClose,
  caseId,
  urgencyLevel,
  suggestedAction = ''
}) => {
  const { state, dispatch } = useAppState();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Build employee options with valid UUIDs
  const availableAssignees = state.employees
    .filter(e => e.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id))
    .map(e => ({ id: e.id, name: e.full_name }));
  
  const [formData, setFormData] = useState({
    title: suggestedAction,
    description: '',
    priority: urgencyLevel,
    assignee: user?.id || (availableAssignees.length > 0 ? availableAssignees[0].id : ''),
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTask = async () => {
    if (!caseId || !formData.title || !formData.assignee) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const caseData = state.cases.find(c => c.id === caseId);
    if (!caseData) {
      toast({
        title: "Case Not Found",
        description: "The selected case could not be found. It may have been deleted or the ID is invalid.",
        variant: "destructive"
      });
      return;
    }

    const currentUserId = user?.id;
    if (!currentUserId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create tasks",
        variant: "destructive"
      });
      return;
    }
    
    const assignedEmployee = state.employees.find(e => e.id === formData.assignee);
    const assignedToName = assignedEmployee?.full_name || 'Unknown';
    
    setIsCreating(true);
    
    try {
      await tasksService.create({
        title: formData.title,
        description: formData.description,
        priority: formData.priority as 'High' | 'Medium' | 'Low',
        status: 'Not Started',
        dueDate: formData.dueDate,
        assignedToId: formData.assignee,
        assignedToName: assignedToName,
        caseId: caseId,
        clientId: caseData.clientId,
        caseNumber: caseData.caseNumber,
        stage: 'Planning',
        assignedById: currentUserId,
        assignedByName: state.employees.find(e => e.id === currentUserId)?.full_name || 'System',
        estimatedHours: 2,
      }, dispatch);

      // tasksService.create already shows success toast
      onClose();
    } catch (error) {
      // tasksService.create already shows error toast
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Create Action Item
            </DialogTitle>
            <Badge variant={urgencyLevel === 'High' ? 'destructive' : urgencyLevel === 'Medium' ? 'default' : 'secondary'}>
              {urgencyLevel}
            </Badge>
          </div>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[60vh]">
          <form className="space-y-6">
            {/* Section 1: Task Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Task Information</h3>
              </div>
              <div>
                <Label htmlFor="title">Task Title <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
            </div>

            {/* Section 2: Assignment & Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Assignment & Schedule</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignee">Assign To <span className="text-destructive">*</span></Label>
                  <Select value={formData.assignee} onValueChange={(value) => setFormData({ ...formData, assignee: value })}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
                  <StandardDateInput
                    id="dueDate"
                    value={formData.dueDate}
                    onChange={(value) => setFormData({ ...formData, dueDate: value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateTask} disabled={!formData.title || !formData.assignee || isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isCreating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};