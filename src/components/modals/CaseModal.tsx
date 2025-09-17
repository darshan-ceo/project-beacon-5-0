import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector } from '@/components/ui/relationship-selector';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { ClientModal } from '@/components/modals/ClientModal';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  case?: Case | null;
  mode: 'create' | 'edit' | 'view';
  contextClientId?: string;
}

export const CaseModal: React.FC<CaseModalProps> = ({ 
  isOpen, 
  onClose, 
  case: caseData, 
  mode,
  contextClientId 
}) => {
  const { state, dispatch } = useAppState();
  const { validateCaseClient } = useRelationships();
  const { context, updateContext, getAvailableClients, getContextDetails } = useContextualForms({
    clientId: contextClientId
  });
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientCountBeforeAdd, setClientCountBeforeAdd] = useState(0);
  
  const [formData, setFormData] = useState<{
    caseNumber: string;
    title: string;
    clientId: string;
    currentStage: 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC';
    priority: 'High' | 'Medium' | 'Low';
    assignedToId: string;
    assignedToName: string;
    description: string;
  }>({
    caseNumber: '',
    title: '',
    clientId: contextClientId || '',
    currentStage: 'Scrutiny',
    priority: 'Medium',
    assignedToId: '',
    assignedToName: '',
    description: ''
  });

  useEffect(() => {
    if (caseData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        clientId: caseData.clientId,
        currentStage: caseData.currentStage,
        priority: caseData.priority,
        assignedToId: caseData.assignedToId,
        assignedToName: caseData.assignedToName,
        description: ''
      });
      updateContext({ clientId: caseData.clientId });
    } else if (mode === 'create') {
      // Generate case number
      const nextCaseNumber = `CASE-${new Date().getFullYear()}-${String(state.cases.length + 1).padStart(3, '0')}`;
      setFormData({
        caseNumber: nextCaseNumber,
        title: '',
        clientId: contextClientId || '',
        currentStage: 'Scrutiny',
        priority: 'Medium',
        assignedToId: '',
        assignedToName: '',
        description: ''
      });
    }
  }, [caseData, mode, contextClientId, state.cases.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate client relationship
    const clientValidation = validateCaseClient(formData.clientId);
    if (!clientValidation.isValid) {
      toast({
        title: "Validation Error",
        description: clientValidation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    // Validate employee assignment
    const assignedEmployee = state.employees.find(emp => emp.id === formData.assignedToId);
    if (!assignedEmployee) {
      toast({
        title: "Validation Error",
        description: "Please select a valid employee for assignment.",
        variant: "destructive"
      });
      return;
    }

    if (assignedEmployee.status !== 'Active') {
      toast({
        title: "Validation Error",
        description: "Cannot assign case to inactive employee.",
        variant: "destructive"
      });
      return;
    }
    
    if (mode === 'create') {
      const newCase: Case = {
        id: Date.now().toString(),
        caseNumber: formData.caseNumber,
        title: formData.title,
        clientId: formData.clientId,
        currentStage: formData.currentStage,
        priority: formData.priority,
        slaStatus: 'Green',
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        createdDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        documents: 0,
        progress: 0,
        generatedForms: []
      };

      dispatch({ type: 'ADD_CASE', payload: newCase });
      toast({
        title: "Case Created",
        description: `Case "${formData.title}" has been created successfully.`,
      });
    } else if (mode === 'edit' && caseData) {
      const updatedCase: Case = {
        ...caseData,
        title: formData.title,
        currentStage: formData.currentStage,
        priority: formData.priority,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
      toast({
        title: "Case Updated",
        description: `Case "${formData.title}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (caseData) {
      dispatch({ type: 'DELETE_CASE', payload: caseData.id });
      toast({
        title: "Case Deleted",
        description: `Case "${caseData.title}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-tour="case-form">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create New Case'}
            {mode === 'edit' && 'Edit Case'}
            {mode === 'view' && 'Case Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4" data-tour="case-form">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="caseNumber">Case Number</Label>
                  <FieldTooltip formId="create-case" fieldId="case-number" />
                </div>
                <Input
                  id="caseNumber"
                  value={formData.caseNumber}
                  disabled={true}
                  className="bg-muted"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="priority">Priority</Label>
                  <FieldTooltip formId="create-case" fieldId="priority" />
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
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="title">Case Title</Label>
                <FieldTooltip formId="create-case" fieldId="title" />
              </div>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                {contextClientId ? (
                  <div className="space-y-2">
                    <ContextBadge
                      label="Client"
                      value={getContextDetails().client?.name || 'Unknown Client'}
                      variant="outline"
                    />
                  </div>
                ) : (
                  <ClientSelector
                    clients={getAvailableClients()}
                    value={formData.clientId}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, clientId: value }));
                      updateContext({ clientId: value });
                    }}
                    disabled={mode === 'view'}
                    showAddNew={mode !== 'view'}
                    onAddNew={() => {
                      setClientCountBeforeAdd(state.clients.length);
                      setIsClientModalOpen(true);
                    }}
                    data-tour="client-selector"
                  />
                )}
              </div>
              <div data-tour="case-timeline">
                <div className="flex items-center gap-1">
                  <Label htmlFor="currentStage">Current Stage</Label>
                  <FieldTooltip formId="create-case" fieldId="stage" />
                </div>
                <Select 
                  value={formData.currentStage} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currentStage: value as any }))}
                  disabled={mode === 'view'}
                  data-tour="lifecycle-selector"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scrutiny">Scrutiny</SelectItem>
                    <SelectItem value="Demand">Demand</SelectItem>
                    <SelectItem value="Adjudication">Adjudication</SelectItem>
                    <SelectItem value="Appeals">Appeals</SelectItem>
                    <SelectItem value="GSTAT">GSTAT</SelectItem>
                    <SelectItem value="HC">High Court</SelectItem>
                    <SelectItem value="SC">Supreme Court</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div data-tour="case-team-assignment">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm font-medium">Case Owner</span>
                <FieldTooltip formId="create-case" fieldId="assignee" />
              </div>
              <EmployeeSelector
                label=""
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
                roleFilter={['Partner', 'CA', 'Advocate']}
                showWorkload
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Additional case details..."
              />
            </div>
          </form>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'edit' && (
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete Case
            </Button>
          )}
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit} data-tour="save-case-btn">
              {mode === 'create' ? 'Create Case' : 'Update Case'}
            </Button>
          )}
        </DialogFooter>
        
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            // Check if a new client was added
            if (state.clients.length > clientCountBeforeAdd) {
              const newClient = state.clients[state.clients.length - 1];
              setFormData(prev => ({ ...prev, clientId: newClient.id }));
              updateContext({ clientId: newClient.id });
              toast({
                title: "Client Created",
                description: `${newClient.name} has been created and selected.`,
              });
            }
          }}
          mode="create"
        />
      </DialogContent>
    </Dialog>
  );
};