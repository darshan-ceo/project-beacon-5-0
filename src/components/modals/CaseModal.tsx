import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector } from '@/components/ui/relationship-selector';
import { useRelationships } from '@/hooks/useRelationships';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  case?: Case | null;
  mode: 'create' | 'edit' | 'view';
}

export const CaseModal: React.FC<CaseModalProps> = ({ isOpen, onClose, case: caseData, mode }) => {
  const { state, dispatch } = useAppState();
  const { validateCaseClient } = useRelationships();
  const [formData, setFormData] = useState<{
    caseNumber: string;
    title: string;
    clientId: string;
    currentStage: 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC';
    priority: 'High' | 'Medium' | 'Low';
    assignedTo: string;
    description: string;
  }>({
    caseNumber: '',
    title: '',
    clientId: '',
    currentStage: 'Scrutiny',
    priority: 'Medium',
    assignedTo: '',
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
        assignedTo: caseData.assignedTo,
        description: ''
      });
    } else if (mode === 'create') {
      setFormData({
        caseNumber: `CASE-${new Date().getFullYear()}-${String(state.cases.length + 1).padStart(3, '0')}`,
        title: '',
        clientId: '',
        currentStage: 'Scrutiny',
        priority: 'Medium',
        assignedTo: '',
        description: ''
      });
    }
  }, [caseData, mode, state.cases.length]);

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
    
    if (mode === 'create') {
      const newCase: Case = {
        id: Date.now().toString(),
        caseNumber: formData.caseNumber,
        title: formData.title,
        clientId: formData.clientId, // FK reference
        currentStage: formData.currentStage,
        priority: formData.priority,
        slaStatus: 'Green',
        assignedTo: formData.assignedTo,
        createdDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        documents: 0,
        progress: 0
      };

      dispatch({ type: 'ADD_CASE', payload: newCase });
      toast({
        title: "Case Created",
        description: `Case ${formData.caseNumber} has been created successfully.`,
      });
    } else if (mode === 'edit' && caseData) {
      const updatedCase: Case = {
        ...caseData,
        title: formData.title,
        clientId: formData.clientId, // FK reference
        currentStage: formData.currentStage,
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
      toast({
        title: "Case Updated",
        description: `Case ${formData.caseNumber} has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (caseData) {
      dispatch({ type: 'DELETE_CASE', payload: caseData.id });
      toast({
        title: "Case Deleted",
        description: `Case ${caseData.caseNumber} has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create New Case'}
            {mode === 'edit' && 'Edit Case'}
            {mode === 'view' && 'Case Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input
                id="caseNumber"
                value={formData.caseNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, caseNumber: e.target.value }))}
                disabled={mode === 'view' || mode === 'edit'}
                required
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'High' | 'Medium' | 'Low' }))}
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
            <Label htmlFor="title">Case Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div>
            <ClientSelector
              clients={state.clients.filter(c => c.status === 'Active')}
              value={formData.clientId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
              disabled={mode === 'view'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentStage">Current Stage</Label>
              <Select 
                value={formData.currentStage} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, currentStage: value as any }))}
                disabled={mode === 'view'}
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
                  <SelectItem value="HC">HC</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={mode === 'view'}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Case
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit">
                {mode === 'create' ? 'Create Case' : 'Update Case'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};