import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Clock, Scale, DollarSign, MapPin, AlignLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector, LegalForumSelector } from '@/components/ui/relationship-selector';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { ClientModal } from '@/components/modals/ClientModal';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { IssueTypeSelector } from '@/components/ui/IssueTypeSelector';
import { CASE_TYPES } from '../../../config/appConfig';
import { generateCaseNumber, getNextSequence, type CaseType } from '@/utils/caseNumberGenerator';
import { formatCaseTitle } from '@/utils/caseTitleFormatter';
import { autoCapitalizeFirst } from '@/utils/textFormatters';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { getAllStates, getCitiesForState } from '@/data/gstat-state-benches';
import { useStatutoryDeadlines } from '@/hooks/useStatutoryDeadlines';
import { DeadlineStatusBadge } from '@/components/ui/DeadlineStatusBadge';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { StandardDateInput } from '@/components/ui/standard-date-input';
import { formatDateForStorage } from '@/utils/dateFormatters';

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
  
  // Statutory deadline calculation hook
  const { calculateReplyDeadline, formatDeadlineForForm, isCalculating } = useStatutoryDeadlines({
    autoCalculate: false // We'll calculate manually on notice date change
  });
  const [isStatutoryDeadline, setIsStatutoryDeadline] = useState(false);
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientCountBeforeAdd, setClientCountBeforeAdd] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    currentStage: string; // Synced with AuthorityLevel from Legal Authorities
    priority: 'High' | 'Medium' | 'Low';
    assignedToId: string;
    assignedToName: string;
    description: string;
    // Timeline & Compliance
    notice_date: string;
    reply_due_date: string;
    // GST metadata fields
    period: string;
    taxDemand: string;
    interest_amount: string;
    penalty_amount: string;
    total_demand: number;
    authorityLevel: string;
    specificOfficer: string;
    jurisdictionalCommissionerate: string;
    departmentLocation: string;
    matterType: string;
    tribunalBench: 'State Bench' | 'Principal Bench';
    stateBenchState: string; // State selection for State Bench
    stateBenchCity: string; // City selection for State Bench
    // Phase 1: Production-ready fields
    notice_no: string;
    form_type: string;
    section_invoked: string;
    financial_year: string;
    authorityId: string;
    city: string;
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
    authorityLevel: '',
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
    city: ''
  });

  useEffect(() => {
    if (caseData && (mode === 'edit' || mode === 'view')) {
      // Cast to any to access both camelCase and snake_case fields
      const c = caseData as any;
      
      // Debug logging for field binding investigation
      console.log('[CaseModal] Initializing form with caseData:', {
        id: c.id,
        officeFileNo: c.officeFileNo || c.office_file_no,
        noticeNo: c.noticeNo || c.notice_no,
        caseType: c.caseType || c.case_type,
        city: c.city,
        noticeDate: c.noticeDate || c.notice_date,
        replyDueDate: c.replyDueDate || c.reply_due_date,
        rawCaseData: caseData
      });
      
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
        notice_date: c.noticeDate || c.notice_date || '',
        reply_due_date: c.replyDueDate || c.reply_due_date || '',
        period: c.period || '',
        taxDemand: (c.taxDemand || c.tax_demand)?.toString() || '',
        interest_amount: (c.interestAmount || c.interest_amount)?.toString() || '',
        penalty_amount: (c.penaltyAmount || c.penalty_amount)?.toString() || '',
        total_demand: c.totalDemand || c.total_demand || 0,
        authorityLevel: c.authorityLevel || c.authority_level || '',
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
        city: c.city || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check RBAC permissions
    if (mode === 'create' && !canCreateCases) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create cases.",
        variant: "destructive"
      });
      return;
    }
    
    if (mode === 'edit' && !canEditCases) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit cases.",
        variant: "destructive"
      });
      return;
    }
    
    // Block editing of completed cases
    if (mode === 'edit' && caseData?.status === 'Completed') {
      toast({
        title: "Case is Read-Only",
        description: "This case has been completed and cannot be edited.",
        variant: "destructive"
      });
      return;
    }
    
    // Grandfather clause: Only require these fields for new cases
    if (mode === 'create') {
      // New cases: Always require both fields
      if (!formData.officeFileNo || !formData.noticeNo) {
        toast({
          title: "Validation Error",
          description: "Office File No and Notice No are required for new cases.",
          variant: "destructive"
        });
        return;
      }
    } else if (mode === 'edit') {
      // Existing cases: Only validate if field was originally populated (prevent data loss)
      const originalHadOfficeFileNo = caseData?.officeFileNo;
      const originalHadNoticeNo = caseData?.noticeNo;
      
      if (originalHadOfficeFileNo && !formData.officeFileNo) {
        toast({
          title: "Validation Error",
          description: "Office File No cannot be removed from existing case.",
          variant: "destructive"
        });
        return;
      }
      if (originalHadNoticeNo && !formData.noticeNo) {
        toast({
          title: "Validation Error",
          description: "Notice No cannot be removed from existing case.",
          variant: "destructive"
        });
        return;
      }
    }

    // Helper function for cleaner validation messages
    const showValidationError = (msg: string) => {
      toast({
        title: "Validation Error",
        description: msg,
        variant: "destructive"
      });
    };

    // issueType validation with grandfather clause
    if (mode === 'create') {
      if (!formData.issueType) {
        showValidationError("Please select an issue type for new cases.");
        return;
      }
    } else if (mode === 'edit') {
      const originalHadIssueType = caseData?.issueType;
      if (originalHadIssueType && !formData.issueType) {
        showValidationError("Issue type cannot be removed from existing case.");
        return;
      }
    }

    // Grandfather clause for date fields: Only require for new cases
    if (mode === 'create') {
      // New cases: Always require compliance date fields
      if (!formData.notice_date) {
        showValidationError("Notice Date is required for new cases.");
        return;
      }
      if (!formData.reply_due_date) {
        showValidationError("Reply Due Date is required for new cases.");
        return;
      }
    } else if (mode === 'edit') {
      // Existing cases: Only validate if field was originally populated (prevent data loss)
      const originalHadNoticeDate = caseData?.noticeDate || caseData?.notice_date;
      const originalHadReplyDueDate = caseData?.replyDueDate || caseData?.reply_due_date;
      
      if (originalHadNoticeDate && !formData.notice_date) {
        showValidationError("Notice Date cannot be removed from existing case.");
        return;
      }
      if (originalHadReplyDueDate && !formData.reply_due_date) {
        showValidationError("Reply Due Date cannot be removed from existing case.");
        return;
      }
      // Legacy cases without these dates → allow save without forcing new values
    }

    // Date relationship validation (only if BOTH dates exist)
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

    // Check for approaching deadline
    const daysLeft = getDaysUntilDue(formData.reply_due_date);
    if (daysLeft < 0) {
      toast({
        title: "⚠️ Overdue Notice",
        description: `Reply is ${Math.abs(daysLeft)} days overdue!`,
        variant: "destructive"
      });
    } else if (daysLeft < 3) {
      toast({
        title: "⚠️ Urgent",
        description: `Reply due in ${daysLeft} days!`,
        variant: "destructive"
      });
    } else if (daysLeft < 7) {
      toast({
        title: "⚠️ Approaching Deadline",
        description: `Reply due in ${daysLeft} days`,
      });
    }
    
    if (!formData.clientId) {
      toast({
        title: "Validation Error",
        description: "Client is required.",
        variant: "destructive"
      });
      return;
    }
    
    // City validation with grandfather clause
    if (mode === 'create') {
      // New cases: Always require city
      if (!formData.city) {
        showValidationError("City is required for jurisdiction determination.");
        return;
      }
    } else if (mode === 'edit') {
      // Existing cases: Only validate if field was originally populated
      const originalHadCity = caseData?.city;
      
      // If case originally had city but user cleared it, show error (prevent data loss)
      if (originalHadCity && !formData.city) {
        showValidationError("City cannot be removed from existing case.");
        return;
      }
      // Legacy cases without city → allow save without forcing new value
    }
    
    // authorityId validation with grandfather clause
    if (mode === 'create') {
      if (!formData.authorityId && formData.currentStage !== 'Assessment') {
        showValidationError("Legal Forum / Issuing Authority is required for cases beyond Assessment stage.");
        return;
      }
    } else if (mode === 'edit') {
      const originalHadAuthority = caseData?.authorityId;
      // Only require authority if case originally had it AND stage is not Assessment
      if (originalHadAuthority && !formData.authorityId) {
        showValidationError("Legal Forum / Issuing Authority cannot be removed from existing case.");
        return;
      }
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

    // assignedToId validation with grandfather clause
    if (formData.assignedToId) {
      // Only validate if user selected an assignment
      const assignedEmployee = state.employees.find(emp => emp.id === formData.assignedToId);
      if (!assignedEmployee) {
        showValidationError("Please select a valid employee for assignment.");
        return;
      }
      if (assignedEmployee.status !== 'Active') {
        showValidationError("Cannot assign case to inactive employee.");
        return;
      }
    } else if (mode === 'create') {
      // New cases must have assignment
      showValidationError("Please select an employee for assignment.");
      return;
    } else if (mode === 'edit') {
      // Existing cases: Only require if originally had assignment
      const originalHadAssignment = caseData?.assignedToId || caseData?.assignedTo;
      if (originalHadAssignment) {
        showValidationError("Employee assignment cannot be removed from existing case.");
        return;
      }
    }
    
    if (mode === 'create') {
      // Generate temporary UUID - will be replaced by Supabase
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
        authorityLevel: formData.authorityLevel,
        specificOfficer: formData.specificOfficer,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'ASSESSMENT' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'TRIBUNAL' ? formData.tribunalBench : undefined,
        stateBenchState: (formData.currentStage === 'TRIBUNAL' && formData.matterType === 'state_bench') ? formData.stateBenchState : undefined,
        stateBenchCity: (formData.currentStage === 'TRIBUNAL' && formData.matterType === 'state_bench') ? formData.stateBenchCity : undefined,
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
        // Service handles persistence and toast notifications
        const { casesService } = await import('@/services/casesService');
        await casesService.create(newCase, dispatch);
        onClose();
      } catch (error) {
        console.error('Case creation failed:', error);
        // Error toast already shown by service
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
        authorityLevel: formData.authorityLevel,
        specificOfficer: formData.specificOfficer,
        jurisdictionalCommissionerate: formData.jurisdictionalCommissionerate,
        departmentLocation: formData.departmentLocation,
        matterType: formData.currentStage === 'ASSESSMENT' ? formData.matterType as any : undefined,
        tribunalBench: formData.currentStage === 'TRIBUNAL' ? formData.tribunalBench : undefined,
        stateBenchState: (formData.currentStage === 'TRIBUNAL' && formData.matterType === 'state_bench') ? formData.stateBenchState : undefined,
        stateBenchCity: (formData.currentStage === 'TRIBUNAL' && formData.matterType === 'state_bench') ? formData.stateBenchCity : undefined,
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
        // Service handles persistence and toast notifications
        const { casesService } = await import('@/services/casesService');
        await casesService.update(caseData.id, updatedCase, dispatch);
        onClose();
      } catch (error) {
        console.error('Case update failed:', error);
        // Error toast already shown by service
      } finally {
        setIsSaving(false);
      }
      return; // Prevent additional onClose call
    }

    onClose();
  };

  const handleDelete = async () => {
    if (caseData) {
      // RBAC permission check
      if (!canDeleteCases) {
        toast({
          title: 'Permission Denied',
          description: "You don't have permission to delete cases.",
          variant: 'destructive',
        });
        return;
      }
      
      setIsDeleting(true);
      try {
        // Service handles persistence and toast notifications
        const { casesService } = await import('@/services/casesService');
        await casesService.delete(caseData.id, dispatch);
        onClose();
      } catch (error) {
        console.error('Case deletion failed:', error);
        // Error toast already shown by service
      } finally {
        setIsDeleting(false);
      }
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Case Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-4">
              {/* Section 1: Case Identification */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Case Identification</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="caseType">
                        Case Type <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.caseType} 
                        onValueChange={(value) => {
                          const sequence = getNextSequence(state.cases, value as CaseType, formData.caseYear);
                          setFormData(prev => ({ ...prev, caseType: value as CaseType, caseSequence: sequence }));
                        }}
                        disabled={mode === 'view'}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
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
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="officeFileNo">
                          Office File No <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip 
                          formId="create-case"
                          fieldId="office_file_no"
                        />
                      </div>
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
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="noticeNo">
                          Notice No <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip 
                          formId="create-case"
                          fieldId="notice_no"
                        />
                      </div>
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
                </CardContent>
              </Card>

              {/* Section 2: Case Details */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Case Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="issueType">
                        Issue Type <span className="text-destructive">*</span>
                      </Label>
                      <FieldTooltip 
                        formId="create-case"
                        fieldId="issue_type"
                      />
                    </div>
                    <IssueTypeSelector
                      value={formData.issueType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, issueType: value }))}
                      disabled={mode === 'view'}
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
                </CardContent>
              </Card>

              {/* Section 3: Timeline & Compliance */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Timeline & Compliance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label>
                          Notice Date <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip 
                          formId="create-case"
                          fieldId="notice_date"
                        />
                      </div>
                      <StandardDateInput
                        id="notice_date"
                        value={formData.notice_date}
                        onChange={async (value) => {
                          const noticeDate = value;
                          
                          // Calculate statutory deadline instead of fixed 15 days
                          let replyDue = '';
                          if (noticeDate) {
                            const result = await calculateReplyDeadline(noticeDate, formData.issueType);
                            if (result) {
                              replyDue = formatDeadlineForForm(result);
                              setIsStatutoryDeadline(true);
                            } else {
                              // Fallback to 30 days if no statutory rule found
                              const date = new Date(noticeDate);
                              replyDue = format(addDays(date, 30), 'yyyy-MM-dd');
                              setIsStatutoryDeadline(false);
                            }
                          } else {
                            setIsStatutoryDeadline(false);
                          }
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            notice_date: noticeDate,
                            reply_due_date: replyDue 
                          }));
                        }}
                        disabled={mode === 'view'}
                        max={new Date().toISOString().split('T')[0]}
                        showYearDropdown
                        fromYear={2015}
                        toYear={new Date().getFullYear()}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label>
                          Reply Due Date <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip 
                          formId="create-case"
                          fieldId="reply_due_date"
                        />
                        {isStatutoryDeadline && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200">
                                  <Info className="h-3 w-3 mr-1" />
                                  Statutory
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>This deadline is auto-generated based on statutory rules. Please verify notice date to ensure correct calculation.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {formData.reply_due_date && (
                        <div className="mb-2">
                          <DeadlineStatusBadge 
                            deadline={formData.reply_due_date} 
                            showDays 
                            isStatutory={isStatutoryDeadline}
                            size="sm"
                          />
                        </div>
                      )}
                      <StandardDateInput
                        id="reply_due_date"
                        value={formData.reply_due_date}
                        onChange={(value) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            reply_due_date: value 
                          }));
                          // If manually changed, mark as not statutory
                          if (value) setIsStatutoryDeadline(false);
                        }}
                        disabled={mode === 'view'}
                        error={formData.reply_due_date ? getDaysUntilDue(formData.reply_due_date) < 3 : false}
                        showYearDropdown
                        fromYear={2015}
                        toYear={new Date().getFullYear() + 2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Assignment */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Assignment</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {contextClientId ? (
                      <div className="space-y-2">
                        <ContextBadge
                          label="Client"
                          value={(() => {
                            const client = getContextDetails().client;
                            return (client && 'display_name' in client ? client.display_name : client && 'name' in client ? (client as any).name : 'Unknown Client');
                          })()}
                          variant="outline"
                        />
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  <div data-tour="case-team-assignment">
                    <EmployeeSelector
                      label="Assigned To"
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
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="priority">Priority</Label>
                      <FieldTooltip formId="create-case" fieldId="priority" />
                    </div>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Section 1: Legal Stage & Forum */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Legal Stage & Forum</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div data-tour="case-timeline">
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="currentStage">
                          Authority Level <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip formId="create-case" fieldId="current_stage" />
                      </div>
                      <Select 
                        value={formData.currentStage} 
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          currentStage: value,
                          matterType: '' // Reset matter type when authority level changes
                        }))}
                        disabled={mode === 'view'}
                        data-tour="lifecycle-selector"
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select authority level" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                          {authorityHierarchyService.getActiveAuthorityLevels().map(level => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Matter Type - Dynamic based on current stage */}
                    {formData.currentStage && 
                     authorityHierarchyService.allowsMatterTypes(formData.currentStage) && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Label htmlFor="matterType">Matter Type</Label>
                          <FieldTooltip formId="create-case" fieldId="matter_type" />
                        </div>
                        <Select 
                          value={formData.matterType} 
                          onValueChange={(value) => setFormData(prev => ({ 
                            ...prev, 
                            matterType: value,
                            // Reset state bench location when matter type changes
                            stateBenchState: value === 'state_bench' ? prev.stateBenchState : '',
                            stateBenchCity: value === 'state_bench' ? prev.stateBenchCity : ''
                          }))}
                          disabled={mode === 'view'}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select matter type" />
                          </SelectTrigger>
                          <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                            {authorityHierarchyService
                              .getMatterTypesByLevel(formData.currentStage)
                              .map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* State Bench Location - Cascading State and City selection */}
                    {formData.currentStage === 'TRIBUNAL' && formData.matterType === 'state_bench' && (
                      <>
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Label htmlFor="stateBenchState">State *</Label>
                            <FieldTooltip 
                              formId="create-case" 
                              fieldId="state_bench_state" 
                              content="Select the state for State Bench jurisdiction as per GSTAT notification"
                            />
                          </div>
                          <Select 
                            value={formData.stateBenchState} 
                            onValueChange={(value) => setFormData(prev => ({ 
                              ...prev, 
                              stateBenchState: value,
                              stateBenchCity: '' // Reset city when state changes
                            }))}
                            disabled={mode === 'view'}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="z-[200] bg-popover max-h-[300px]" position="popper" sideOffset={5}>
                              {getAllStates().map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.stateBenchState && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Label htmlFor="stateBenchCity">City *</Label>
                              <FieldTooltip 
                                formId="create-case" 
                                fieldId="state_bench_city" 
                                content="Select the city where the State Bench is located for this state"
                              />
                            </div>
                            <Select 
                              value={formData.stateBenchCity} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, stateBenchCity: value }))}
                              disabled={mode === 'view'}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent className="z-[200] bg-popover max-h-[300px]" position="popper" sideOffset={5}>
                                {getCitiesForState(formData.stateBenchState).map(city => (
                                  <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Financial Details */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Financial Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="period">Period</Label>
                      <FieldTooltip formId="create-case" fieldId="period" />
                    </div>
                    <Input
                      id="period"
                      value={formData.period}
                      onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                      disabled={mode === 'view'}
                      placeholder="e.g., Q1 FY2024-25, Apr-Jun 2024"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="taxDemand">Tax Demand (₹)</Label>
                        <FieldTooltip formId="create-case" fieldId="tax_demand" />
                      </div>
                      <Input
                        id="taxDemand"
                        type="number"
                        value={formData.taxDemand}
                        onChange={(e) => setFormData(prev => ({ ...prev, taxDemand: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="e.g., 2500000"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="interest_amount">Interest Amount (₹)</Label>
                        <FieldTooltip formId="create-case" fieldId="interest_amount" />
                      </div>
                      <Input
                        id="interest_amount"
                        type="number"
                        value={formData.interest_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, interest_amount: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="penalty_amount">Penalty Amount (₹)</Label>
                        <FieldTooltip formId="create-case" fieldId="penalty_amount" />
                      </div>
                      <Input
                        id="penalty_amount"
                        type="number"
                        value={formData.penalty_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, penalty_amount: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  
                  {/* Total Demand - Auto-calculated */}
                  {formData.total_demand > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-base font-semibold">Total Demand (₹)</Label>
                      <div className="text-2xl font-bold text-primary mt-1">
                        ₹ {formData.total_demand.toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated: Tax + Interest + Penalty
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: GST Notice Details */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">GST Notice Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="notice_no">Notice Number</Label>
                        <FieldTooltip formId="create-case" fieldId="notice_number" />
                      </div>
                      <Input
                        id="notice_no"
                        value={formData.notice_no}
                        onChange={(e) => setFormData(prev => ({ ...prev, notice_no: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="e.g., ZA270325006940Y"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="form_type">Form Type</Label>
                        <FieldTooltip formId="create-case" fieldId="form_type" />
                      </div>
                      <Select
                        value={formData.form_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, form_type: value }))}
                        disabled={mode === 'view'}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select form type" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                          <SelectItem value="DRC-01">DRC-01 (Show Cause Notice)</SelectItem>
                          <SelectItem value="DRC-03">DRC-03 (Audit Intimation)</SelectItem>
                          <SelectItem value="DRC-07">DRC-07 (Order)</SelectItem>
                          <SelectItem value="ASMT-10">ASMT-10 (Notice for Clarification)</SelectItem>
                          <SelectItem value="ASMT-11">ASMT-11 (Summary of Order)</SelectItem>
                          <SelectItem value="ASMT-12">ASMT-12 (Final Notice)</SelectItem>
                          <SelectItem value="SCN">SCN (Show Cause Notice)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="section_invoked">Section Invoked</Label>
                        <FieldTooltip formId="create-case" fieldId="section_invoked" />
                      </div>
                      <Input
                        id="section_invoked"
                        value={formData.section_invoked}
                        onChange={(e) => setFormData(prev => ({ ...prev, section_invoked: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="e.g., Section 73, Section 74"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="financial_year">Financial Year</Label>
                        <FieldTooltip formId="create-case" fieldId="financial_year" />
                      </div>
                      <Input
                        id="financial_year"
                        value={formData.financial_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, financial_year: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="FY 2024-25"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="authorityId">
                          Legal Forum / Issuing Authority {formData.currentStage !== 'Assessment' && <span className="text-destructive">*</span>}
                        </Label>
                        <FieldTooltip formId="create-case" fieldId="authority" />
                      </div>
                      <Select
                        value={formData.authorityId}
                        onValueChange={(value) => {
                          const court = state.courts.find(c => c.id === value);
                          setFormData(prev => ({ 
                            ...prev, 
                            authorityId: value,
                            authorityLevel: court?.authorityLevel || court?.type || ''
                          }));
                        }}
                        disabled={mode === 'view'}
                      >
                        <SelectTrigger className={cn(
                          "bg-background",
                          !formData.authorityId && formData.currentStage !== 'Assessment' && 'border-destructive'
                        )}>
                          <SelectValue placeholder="Select authority" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                          {state.courts
                            .sort((a, b) => {
                              const levels = ['ADJUDICATION', 'FIRST_APPEAL', 'REVISIONAL', 'TRIBUNAL', 'HIGH_COURT', 'SUPREME_COURT'];
                              const aLevel = levels.indexOf(a.authorityLevel || '');
                              const bLevel = levels.indexOf(b.authorityLevel || '');
                              return aLevel - bLevel;
                            })
                            .map(court => (
                              <SelectItem key={court.id} value={court.id}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded">{court.authorityLevel}</span>
                                  <span>{court.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {!formData.authorityId && formData.currentStage !== 'Assessment' && (
                        <p className="text-sm text-destructive mt-1">Authority is required</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label htmlFor="city">
                          City <span className="text-destructive">*</span>
                        </Label>
                        <FieldTooltip formId="create-case" fieldId="city" />
                      </div>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="e.g., Ahmedabad"
                        className={!formData.city ? 'border-destructive' : ''}
                      />
                      {!formData.city && (
                        <p className="text-sm text-destructive mt-1">City is required</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="specificOfficer">
                        Specific Officer Name <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <FieldTooltip formId="create-case" fieldId="specific_officer" />
                    </div>
                    <Input
                      id="specificOfficer"
                      value={formData.specificOfficer}
                      onChange={(e) => setFormData(prev => ({ ...prev, specificOfficer: e.target.value }))}
                      onBlur={(e) => setFormData(prev => ({ ...prev, specificOfficer: autoCapitalizeFirst(e.target.value) }))}
                      disabled={mode === 'view'}
                      placeholder="e.g., Shri Rajesh Kumar, Deputy Commissioner"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Jurisdiction Details */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Jurisdiction Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="jurisdictionalCommissionerate">
                        GST Commissionerate <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <FieldTooltip formId="create-case" fieldId="jurisdictional_commissionerate" />
                    </div>
                    <Input
                      id="jurisdictionalCommissionerate"
                      value={formData.jurisdictionalCommissionerate}
                      onChange={(e) => setFormData(prev => ({ ...prev, jurisdictionalCommissionerate: e.target.value }))}
                      onBlur={(e) => setFormData(prev => ({ ...prev, jurisdictionalCommissionerate: autoCapitalizeFirst(e.target.value) }))}
                      disabled={mode === 'view'}
                      placeholder="e.g., Mumbai GST Commissionerate"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label htmlFor="departmentLocation">
                        Office Location <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <FieldTooltip formId="create-case" fieldId="department_location" />
                    </div>
                    <Input
                      id="departmentLocation"
                      value={formData.departmentLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, departmentLocation: e.target.value }))}
                      onBlur={(e) => setFormData(prev => ({ ...prev, departmentLocation: autoCapitalizeFirst(e.target.value) }))}
                      disabled={mode === 'view'}
                      placeholder="e.g., Mumbai Central"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 5: Description */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Additional Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="description">Description <span className="text-muted-foreground">(Optional)</span></Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    onBlur={(e) => {
                      const capitalized = autoCapitalizeFirst(e.target.value);
                      setFormData(prev => ({ ...prev, description: capitalized }));
                    }}
                    disabled={mode === 'view'}
                    rows={3}
                    placeholder="Additional case details..."
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'edit' && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Case'
              )}
            </Button>
          )}
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit} data-tour="save-case-btn" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'create' ? 'Create Case' : 'Update Case'
              )}
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
              const clientName = 'display_name' in newClient ? newClient.display_name : 'name' in newClient ? (newClient as any).name : 'Client';
              setFormData(prev => ({ ...prev, clientId: newClient.id }));
              updateContext({ clientId: newClient.id });
              toast({
                title: "Client Created",
                description: `${clientName} has been created and selected.`,
              });
            }
          }}
          mode="create"
        />
      </DialogContent>
    </Dialog>
  );
};
