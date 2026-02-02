import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientModal } from '@/components/modals/ClientModal';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { generateCaseNumber, getNextSequence, type CaseType } from '@/utils/caseNumberGenerator';
import { formatCaseTitle } from '@/utils/caseTitleFormatter';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { CaseForm, CaseFormData } from '@/components/cases/CaseForm';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  case?: Case | null;
  mode: 'create' | 'edit' | 'view';
  contextClientId?: string;
}

// Helper function to calculate days until due date
const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to calculate total demand
const calculateTotal = (tax: string, interest: string, penalty: string): number => {
  const t = parseFloat(tax) || 0;
  const i = parseFloat(interest) || 0;
  const p = parseFloat(penalty) || 0;
  return t + i + p;
};

export const CaseModal: React.FC<CaseModalProps> = ({ 
  isOpen, 
  onClose, 
  case: caseData, 
  mode,
  contextClientId 
}) => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  const { validateCaseClient } = useRelationships();
  const { context, updateContext, getAvailableClients, getContextDetails } = useContextualForms({
    clientId: contextClientId
  });
  
  // RBAC permission flags
  const canCreateCases = hasPermission('cases', 'write');
  const canEditCases = hasPermission('cases', 'write');
  const canDeleteCases = hasPermission('cases', 'delete');
  
  const [isStatutoryDeadline, setIsStatutoryDeadline] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientCountBeforeAdd, setClientCountBeforeAdd] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<CaseFormData>({
    caseNumber: '',
    caseType: 'GST',
    caseYear: new Date().getFullYear().toString(),
    caseSequence: '001',
    officeFileNo: '',
    noticeNo: '',
    issueType: '',
    title: '',
    clientId: contextClientId || '',
    currentStage: 'Assessment',
    priority: 'Medium',
    assignedToId: '',
    assignedToName: '',
    description: '',
    notice_date: '',
    reply_due_date: '',
    period: '',
    taxDemand: '',
    interest_amount: '',
    penalty_amount: '',
    total_demand: 0,
    specificOfficer: '',
    jurisdictionalCommissionerate: '',
    departmentLocation: '',
    matterType: 'Scrutiny',
    tribunalBench: 'State Bench',
    stateBenchState: '',
    stateBenchCity: '',
    notice_no: '',
    form_type: '',
    section_invoked: '',
    financial_year: '',
    authorityId: '',
    city: '',
    // Phase 5: Order & Appeal Milestone Fields
    order_date: '',
    order_received_date: '',
    appeal_filed_date: '',
    impugned_order_no: '',
    impugned_order_date: '',
    impugned_order_amount: ''
  });

  useEffect(() => {
    if (caseData && (mode === 'edit' || mode === 'view')) {
      const c = caseData as any;
      setFormData({
        caseNumber: c.caseNumber || c.case_number || '',
        caseType: c.caseType || c.case_type || 'GST',
        caseYear: c.caseYear || c.case_year || new Date().getFullYear().toString(),
        caseSequence: c.caseSequence || c.case_sequence || '001',
        officeFileNo: c.officeFileNo || c.office_file_no || '',
        noticeNo: c.noticeNo || c.notice_no || '',
        issueType: c.issueType || c.issue_type || c.title || '',
        title: c.title || '',
        clientId: c.clientId || c.client_id || '',
        currentStage: c.currentStage || c.stage_code || c.current_stage || 'Assessment',
        priority: c.priority || 'Medium',
        assignedToId: c.assignedToId || c.assigned_to || '',
        assignedToName: c.assignedToName || c.assigned_to_name || '',
        description: c.description || '',
        notice_date: c.notice_date || c.noticeDate || '',
        reply_due_date: c.reply_due_date || c.replyDueDate || '',
        period: c.period || '',
        taxDemand: (c.taxDemand || c.tax_demand)?.toString() || '',
        interest_amount: (c.interestAmount || c.interest_amount)?.toString() || '',
        penalty_amount: (c.penaltyAmount || c.penalty_amount)?.toString() || '',
        total_demand: c.totalDemand || c.total_demand || 0,
        specificOfficer: c.specificOfficer || c.specific_officer || '',
        jurisdictionalCommissionerate: c.jurisdictionalCommissionerate || '',
        departmentLocation: c.departmentLocation || '',
        matterType: c.matterType || c.matter_type || 'Scrutiny',
        tribunalBench: c.tribunalBench || c.tribunal_bench || 'State Bench',
        stateBenchState: c.stateBenchState || c.state_bench_state || '',
        stateBenchCity: c.stateBenchCity || c.state_bench_city || '',
        notice_no: c.noticeNo || c.notice_no || '',
        form_type: c.formType || c.form_type || '',
        section_invoked: c.sectionInvoked || c.section_invoked || '',
        financial_year: c.financialYear || c.financial_year || '',
        authorityId: c.authorityId || c.authority_id || '',
        city: c.city || '',
        // Phase 5: Order & Appeal Milestone Fields
        order_date: c.orderDate || c.order_date || '',
        order_received_date: c.orderReceivedDate || c.order_received_date || '',
        appeal_filed_date: c.appealFiledDate || c.appeal_filed_date || '',
        impugned_order_no: c.impugnedOrderNo || c.impugned_order_no || '',
        impugned_order_date: c.impugnedOrderDate || c.impugned_order_date || '',
        impugned_order_amount: (c.impugnedOrderAmount || c.impugned_order_amount)?.toString() || ''
      });
      updateContext({ clientId: c.clientId || c.client_id });
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
  }, [caseData, mode, contextClientId]);

  // Auto-generate case number
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

  // Auto-generate title
  useEffect(() => {
    if (formData.clientId && formData.issueType) {
      const client = state.clients.find(c => c.id === formData.clientId);
      if (client) {
        const clientName = 'display_name' in client ? client.display_name : 'name' in client ? (client as any).name : '';
        const newTitle = formatCaseTitle(clientName, formData.issueType);
        setFormData(prev => ({ ...prev, title: newTitle }));
      }
    }
  }, [formData.clientId, formData.issueType, state.clients]);

  // Auto-calculate total demand
  useEffect(() => {
    const total = calculateTotal(formData.taxDemand, formData.interest_amount, formData.penalty_amount);
    if (total !== formData.total_demand) {
      setFormData(prev => ({ ...prev, total_demand: total }));
    }
  }, [formData.taxDemand, formData.interest_amount, formData.penalty_amount]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (mode === 'create' && !canCreateCases) {
      toast({ title: "Permission Denied", description: "You don't have permission to create cases.", variant: "destructive" });
      return;
    }
    if (mode === 'edit' && !canEditCases) {
      toast({ title: "Permission Denied", description: "You don't have permission to edit cases.", variant: "destructive" });
      return;
    }
    if (mode === 'edit' && caseData?.status === 'Completed') {
      toast({ title: "Case is Read-Only", description: "This case has been completed and cannot be edited.", variant: "destructive" });
      return;
    }
    
    const showValidationError = (msg: string) => {
      toast({ title: "Validation Error", description: msg, variant: "destructive" });
    };

    // Validation
    if (mode === 'create') {
      if (!formData.officeFileNo || !formData.noticeNo) {
        showValidationError("Office File No and Notice No are required for new cases.");
        return;
      }
      if (!formData.issueType) {
        showValidationError("Please select an issue type for new cases.");
        return;
      }
      if (!formData.notice_date) {
        showValidationError("Notice Date is required for new cases.");
        return;
      }
      if (!formData.reply_due_date) {
        showValidationError("Reply Due Date is required for new cases.");
        return;
      }
      if (!formData.city) {
        showValidationError("City is required for jurisdiction determination.");
        return;
      }
    }
    
    if (!formData.clientId) {
      showValidationError("Client is required.");
      return;
    }
    
    const clientValidation = validateCaseClient(formData.clientId);
    if (!clientValidation.isValid) {
      showValidationError(clientValidation.errors.join(', '));
      return;
    }

    if (!formData.assignedToId && mode === 'create') {
      showValidationError("Please select an employee for assignment.");
      return;
    }

    // Date validation
    if (formData.notice_date && formData.reply_due_date) {
      if (new Date(formData.notice_date) > new Date()) {
        showValidationError("Notice Date cannot be in the future.");
        return;
      }
      if (new Date(formData.reply_due_date) < new Date(formData.notice_date)) {
        showValidationError("Reply Due Date must be after Notice Date.");
        return;
      }
    }

    // Deadline warnings
    if (formData.reply_due_date) {
      const daysLeft = getDaysUntilDue(formData.reply_due_date);
      if (daysLeft < 0) {
        toast({ title: "⚠️ Overdue Notice", description: `Reply is ${Math.abs(daysLeft)} days overdue!`, variant: "destructive" });
      } else if (daysLeft < 3) {
        toast({ title: "⚠️ Urgent", description: `Reply due in ${daysLeft} days!`, variant: "destructive" });
      } else if (daysLeft < 7) {
        toast({ title: "⚠️ Approaching Deadline", description: `Reply due in ${daysLeft} days` });
      }
    }
    
    if (mode === 'create') {
      const newCase: Case = {
        id: uuidv4(),
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
        assignedTo: formData.assignedToId,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        description: formData.description,
        notice_date: formData.notice_date,
        reply_due_date: formData.reply_due_date,
        period: formData.period,
        taxDemand: formData.taxDemand ? parseFloat(formData.taxDemand) : undefined,
        interest_amount: formData.interest_amount ? parseFloat(formData.interest_amount) : undefined,
        penalty_amount: formData.penalty_amount ? parseFloat(formData.penalty_amount) : undefined,
        total_demand: formData.total_demand,
        specificOfficer: formData.specificOfficer,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'Assessment' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'GTAT / CESTAT / ITAT' ? formData.tribunalBench : undefined,
        stateBenchState: (formData.currentStage === 'GTAT / CESTAT / ITAT' && formData.matterType === 'state_bench') ? formData.stateBenchState : undefined,
        stateBenchCity: (formData.currentStage === 'GTAT / CESTAT / ITAT' && formData.matterType === 'state_bench') ? formData.stateBenchCity : undefined,
        notice_no: formData.notice_no,
        form_type: formData.form_type as any,
        section_invoked: formData.section_invoked,
        financial_year: formData.financial_year,
        authorityId: formData.authorityId,
        city: formData.city,
        createdDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        documents: 0,
        progress: 0,
        generatedForms: []
      };

      setIsSaving(true);
      try {
        const { casesService } = await import('@/services/casesService');
        await casesService.create(newCase, dispatch);
        onClose();
      } catch (error) {
        console.error('Case creation failed:', error);
      } finally {
        setIsSaving(false);
      }
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
        assignedTo: formData.assignedToId,
        assignedToId: formData.assignedToId,
        assignedToName: formData.assignedToName,
        description: formData.description,
        notice_date: formData.notice_date,
        reply_due_date: formData.reply_due_date,
        period: formData.period,
        taxDemand: formData.taxDemand ? parseFloat(formData.taxDemand) : undefined,
        interest_amount: formData.interest_amount ? parseFloat(formData.interest_amount) : undefined,
        penalty_amount: formData.penalty_amount ? parseFloat(formData.penalty_amount) : undefined,
        total_demand: formData.total_demand,
        specificOfficer: formData.specificOfficer,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'Assessment' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'GTAT / CESTAT / ITAT' ? formData.tribunalBench : undefined,
        stateBenchState: (formData.currentStage === 'GTAT / CESTAT / ITAT' && formData.matterType === 'state_bench') ? formData.stateBenchState : undefined,
        stateBenchCity: (formData.currentStage === 'GTAT / CESTAT / ITAT' && formData.matterType === 'state_bench') ? formData.stateBenchCity : undefined,
        notice_no: formData.notice_no,
        form_type: formData.form_type as any,
        section_invoked: formData.section_invoked,
        financial_year: formData.financial_year,
        authorityId: formData.authorityId,
        city: formData.city,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      setIsSaving(true);
      try {
        const { casesService } = await import('@/services/casesService');
        await casesService.update(caseData.id, updatedCase, dispatch);
        onClose();
      } catch (error) {
        console.error('Case update failed:', error);
      } finally {
        setIsSaving(false);
      }
      return;
    }
  };

  const handleDelete = async () => {
    if (caseData) {
      if (!canDeleteCases) {
        toast({ title: 'Permission Denied', description: "You don't have permission to delete cases.", variant: 'destructive' });
        return;
      }
      
      setIsDeleting(true);
      try {
        const { casesService } = await import('@/services/casesService');
        await casesService.delete(caseData.id, dispatch);
        onClose();
      } catch (error) {
        console.error('Case deletion failed:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getTitle = () => {
    if (mode === 'create') return 'Create New Case';
    if (mode === 'edit') return 'Edit Case';
    return 'Case Details';
  };

  const footer = (
    <div className="flex items-center justify-end gap-3 px-6 py-4">
      <Button type="button" variant="outline" onClick={onClose}>
        {mode === 'view' ? 'Close' : 'Cancel'}
      </Button>
      {mode === 'edit' && canDeleteCases && (
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : 'Delete Case'}
        </Button>
      )}
      {mode !== 'view' && (
        <Button type="submit" onClick={handleSubmit} data-tour="save-case-btn" disabled={isSaving}>
          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : mode === 'create' ? 'Create Case' : 'Update Case'}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <AdaptiveFormShell
        isOpen={isOpen}
        onClose={onClose}
        title={getTitle()}
        icon={<FileText className="h-5 w-5" />}
        complexity="complex"
        footer={footer}
        dataTour="case-form"
      >
        <CaseForm
          mode={mode}
          formData={formData}
          setFormData={setFormData}
          contextClientId={contextClientId}
          onAddNewClient={() => {
            setClientCountBeforeAdd(state.clients.length);
            setIsClientModalOpen(true);
          }}
          getAvailableClients={getAvailableClients}
          getContextDetails={getContextDetails}
          updateContext={updateContext}
          isStatutoryDeadline={isStatutoryDeadline}
          setIsStatutoryDeadline={setIsStatutoryDeadline}
        />
      </AdaptiveFormShell>
      
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          if (state.clients.length > clientCountBeforeAdd) {
            const newClient = state.clients[state.clients.length - 1];
            const clientName = 'display_name' in newClient ? newClient.display_name : 'name' in newClient ? (newClient as any).name : 'Client';
            setFormData(prev => ({ ...prev, clientId: newClient.id }));
            updateContext({ clientId: newClient.id });
            toast({ title: "Client Created", description: `${clientName} has been created and selected.` });
          }
        }}
        mode="create"
      />
    </>
  );
};
