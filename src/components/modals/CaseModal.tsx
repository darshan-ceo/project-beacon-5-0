import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector } from '@/components/ui/relationship-selector';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { ClientModal } from '@/components/modals/ClientModal';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { CASE_TYPES, MATTER_TYPES } from '../../../config/appConfig';
import { generateCaseNumber, getNextSequence, type CaseType } from '@/utils/caseNumberGenerator';
import { formatCaseTitle } from '@/utils/caseTitleFormatter';

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
    // Basic fields
    caseNumber: string;
    caseType: CaseType;
    caseYear: string;
    caseSequence: string;
    officeFileNo: string;
    noticeNo: string;
    issueType: string;
    title: string;
    clientId: string;
    currentStage: 'Scrutiny' | 'Adjudication' | 'First Appeal' | 'Tribunal' | 'High Court' | 'Supreme Court';
    priority: 'High' | 'Medium' | 'Low';
    assignedToId: string;
    assignedToName: string;
    description: string;
    // New fields
    period: string;
    taxDemand: string;
    authority: string;
    jurisdictionalCommissionerate: string;
    departmentLocation: string;
    matterType: string;
    tribunalBench: 'State Bench' | 'Principal Bench';
  }>({
    caseNumber: '',
    caseType: 'GST',
    caseYear: new Date().getFullYear().toString(),
    caseSequence: '001',
    officeFileNo: '',
    noticeNo: '',
    issueType: '',
    title: '',
    clientId: contextClientId || '',
    currentStage: 'Scrutiny',
    priority: 'Medium',
    assignedToId: '',
    assignedToName: '',
    description: '',
    period: '',
    taxDemand: '',
    authority: '',
    jurisdictionalCommissionerate: '',
    departmentLocation: '',
    matterType: 'Scrutiny',
    tribunalBench: 'State Bench'
  });

  useEffect(() => {
    if (caseData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        caseNumber: caseData.caseNumber,
        caseType: caseData.caseType || 'GST',
        caseYear: caseData.caseYear || new Date().getFullYear().toString(),
        caseSequence: caseData.caseSequence || '001',
        officeFileNo: caseData.officeFileNo || '',
        noticeNo: caseData.noticeNo || '',
        issueType: caseData.issueType || caseData.title,
        title: caseData.title,
        clientId: caseData.clientId,
        currentStage: caseData.currentStage,
        priority: caseData.priority,
        assignedToId: caseData.assignedToId,
        assignedToName: caseData.assignedToName,
        description: caseData.description || '',
        period: caseData.period || '',
        taxDemand: caseData.taxDemand?.toString() || '',
        authority: caseData.authority || '',
        jurisdictionalCommissionerate: caseData.jurisdictionalCommissionerate || '',
        departmentLocation: caseData.departmentLocation || '',
        matterType: caseData.matterType || 'Scrutiny',
        tribunalBench: caseData.tribunalBench || 'State Bench'
      });
      updateContext({ clientId: caseData.clientId });
    } else if (mode === 'create') {
      const year = new Date().getFullYear().toString();
      const sequence = getNextSequence(state.cases, 'GST', year);
      setFormData(prev => ({
        ...prev,
        caseYear: year,
        caseSequence: sequence,
        clientId: contextClientId || '',
      }));
    }
  }, [caseData, mode, contextClientId, state.cases.length]);

  // Auto-generate case number when components change
  useEffect(() => {
    if (mode === 'create' && formData.caseType && formData.officeFileNo && formData.noticeNo) {
      const newCaseNumber = generateCaseNumber(
        formData.caseType,
        formData.caseYear,
        formData.caseSequence,
        formData.officeFileNo,
        formData.noticeNo
      );
      setFormData(prev => ({ ...prev, caseNumber: newCaseNumber }));
    }
  }, [mode, formData.caseType, formData.caseYear, formData.caseSequence, formData.officeFileNo, formData.noticeNo]);

  // Auto-generate title when client or issueType changes
  useEffect(() => {
    if (formData.clientId && formData.issueType) {
      const client = state.clients.find(c => c.id === formData.clientId);
      if (client) {
        const newTitle = formatCaseTitle(client.name, formData.issueType);
        setFormData(prev => ({ ...prev, title: newTitle }));
      }
    }
  }, [formData.clientId, formData.issueType, state.clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.issueType) {
      toast({
        title: "Validation Error",
        description: "Please enter an issue type.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.officeFileNo || !formData.noticeNo) {
      toast({
        title: "Validation Error",
        description: "Office File No and Notice No are required.",
        variant: "destructive"
      });
      return;
    }
    
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
        caseType: formData.caseType,
        caseYear: formData.caseYear,
        caseSequence: formData.caseSequence,
        officeFileNo: formData.officeFileNo,
        noticeNo: formData.noticeNo,
        issueType: formData.issueType,
        title: formData.title,
        clientId: formData.clientId,
        currentStage: formData.currentStage,
        priority: formData.priority,
        timelineBreachStatus: 'Green',
        status: 'Active',
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        description: formData.description,
        period: formData.period,
        taxDemand: formData.taxDemand ? parseFloat(formData.taxDemand) : undefined,
        authority: formData.authority,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'Scrutiny' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'Tribunal' ? formData.tribunalBench : undefined,
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
        caseType: formData.caseType,
        caseYear: formData.caseYear,
        caseSequence: formData.caseSequence,
        officeFileNo: formData.officeFileNo,
        noticeNo: formData.noticeNo,
        issueType: formData.issueType,
        title: formData.title,
        currentStage: formData.currentStage,
        priority: formData.priority,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        description: formData.description,
        period: formData.period,
        taxDemand: formData.taxDemand ? parseFloat(formData.taxDemand) : undefined,
        authority: formData.authority,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'Scrutiny' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'Tribunal' ? formData.tribunalBench : undefined,
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
      <DialogContent className="max-w-beacon-modal max-h-[90vh]" data-tour="case-form">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create New Case'}
            {mode === 'edit' && 'Edit Case'}
            {mode === 'view' && 'Case Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Case Details</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Case Type & Number Section */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="caseType">Case Type</Label>
                  <Select 
                    value={formData.caseType} 
                    onValueChange={(value) => {
                      const sequence = getNextSequence(state.cases, value as CaseType, formData.caseYear);
                      setFormData(prev => ({ ...prev, caseType: value as CaseType, caseSequence: sequence }));
                    }}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="caseYear">Year</Label>
                  <Input
                    id="caseYear"
                    value={formData.caseYear}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="caseSequence">Sequence</Label>
                  <Input
                    id="caseSequence"
                    value={formData.caseSequence}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="officeFileNo">Office File No *</Label>
                  <Input
                    id="officeFileNo"
                    value={formData.officeFileNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, officeFileNo: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., OFFICE001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="noticeNo">Notice No *</Label>
                  <Input
                    id="noticeNo"
                    value={formData.noticeNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, noticeNo: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., ASMT-10/2025"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="caseNumber">Generated Case Number</Label>
                <Input
                  id="caseNumber"
                  value={formData.caseNumber}
                  disabled={true}
                  className="bg-muted font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: {formData.caseType}/{formData.caseYear}/{formData.caseSequence} – {formData.officeFileNo || 'OFFICE'} – {formData.noticeNo || 'NOTICE'}
                </p>
              </div>

              <div>
                <Label htmlFor="issueType">Issue Type *</Label>
                <Input
                  id="issueType"
                  value={formData.issueType}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value }))}
                  disabled={mode === 'view'}
                  placeholder="e.g., Input Tax Credit Disallowance"
                  required
                />
              </div>

              <div>
                <Label htmlFor="title">Case Title (Auto-Generated)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  disabled={true}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: Client Name – Issue Type
                </p>
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
                <div>
                  <Label htmlFor="priority">Priority</Label>
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
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div data-tour="case-timeline">
                  <Label htmlFor="currentStage">Current Stage</Label>
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
                      <SelectItem value="Adjudication">Adjudication</SelectItem>
                      <SelectItem value="First Appeal">First Appeal</SelectItem>
                      <SelectItem value="Tribunal">Tribunal</SelectItem>
                      <SelectItem value="High Court">High Court</SelectItem>
                      <SelectItem value="Supreme Court">Supreme Court</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.currentStage === 'Scrutiny' && (
                  <div>
                    <Label htmlFor="matterType">Matter Type</Label>
                    <Select 
                      value={formData.matterType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, matterType: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATTER_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.currentStage === 'Tribunal' && (
                  <div>
                    <Label htmlFor="tribunalBench">Tribunal Bench</Label>
                    <Select 
                      value={formData.tribunalBench} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tribunalBench: value as any }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="State Bench">State Bench → High Court</SelectItem>
                        <SelectItem value="Principal Bench">Principal Bench → Supreme Court</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.tribunalBench === 'Principal Bench' && (
                      <p className="text-xs text-warning mt-1">
                        ⚠️ Principal Bench will route directly to Supreme Court
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    value={formData.period}
                    onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., Q1 FY2024-25"
                  />
                </div>
                <div>
                  <Label htmlFor="taxDemand">Tax Demand (₹)</Label>
                  <Input
                    id="taxDemand"
                    type="number"
                    value={formData.taxDemand}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxDemand: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., 2500000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="authority">Authority</Label>
                <Input
                  id="authority"
                  value={formData.authority}
                  onChange={(e) => setFormData(prev => ({ ...prev, authority: e.target.value }))}
                  disabled={mode === 'view'}
                  placeholder="e.g., Deputy Commissioner (GST)"
                />
              </div>

              <div>
                <Label htmlFor="jurisdictionalCommissionerate">Jurisdictional Commissionerate</Label>
                <Input
                  id="jurisdictionalCommissionerate"
                  value={formData.jurisdictionalCommissionerate}
                  onChange={(e) => setFormData(prev => ({ ...prev, jurisdictionalCommissionerate: e.target.value }))}
                  disabled={mode === 'view'}
                  placeholder="e.g., Mumbai GST Commissionerate"
                />
              </div>

              <div>
                <Label htmlFor="departmentLocation">Department Location</Label>
                <Input
                  id="departmentLocation"
                  value={formData.departmentLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, departmentLocation: e.target.value }))}
                  disabled={mode === 'view'}
                  placeholder="e.g., Mumbai Central"
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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
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
            </TabsContent>
          </Tabs>
        </DialogBody>

        <DialogFooter className="gap-3">
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