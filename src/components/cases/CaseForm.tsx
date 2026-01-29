import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Users, Clock, Scale, DollarSign, MapPin, AlignLeft } from 'lucide-react';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector } from '@/components/ui/relationship-selector';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { IssueTypeSelector } from '@/components/ui/IssueTypeSelector';
import { CASE_TYPES } from '../../../config/appConfig';
import { getNextSequence, type CaseType } from '@/utils/caseNumberGenerator';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { getAllStates, getCitiesForState } from '@/data/gstat-state-benches';
import { useStatutoryDeadlines } from '@/hooks/useStatutoryDeadlines';
import { DeadlineStatusBadge } from '@/components/ui/DeadlineStatusBadge';
import { StandardDateInput } from '@/components/ui/standard-date-input';

// Helper function to calculate days until due date
const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export interface CaseFormData {
  caseNumber: string;
  caseType: CaseType;
  caseYear: string;
  caseSequence: string;
  officeFileNo: string;
  noticeNo: string;
  issueType: string;
  title: string;
  clientId: string;
  currentStage: string;
  priority: 'High' | 'Medium' | 'Low';
  assignedToId: string;
  assignedToName: string;
  description: string;
  notice_date: string;
  reply_due_date: string;
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
  stateBenchState: string;
  stateBenchCity: string;
  notice_no: string;
  form_type: string;
  section_invoked: string;
  financial_year: string;
  authorityId: string;
  city: string;
  // Phase 5: Order & Appeal Milestone Fields
  order_date: string;           // Date of adjudication order (DRC-07)
  order_received_date: string;  // Date order was received (for deadline calc)
  appeal_filed_date: string;    // Date appeal was filed
  impugned_order_no: string;    // Order number being appealed
  impugned_order_date: string;  // Date of impugned order
  impugned_order_amount: string; // Amount in dispute
}

export interface CaseFormProps {
  mode: 'create' | 'edit' | 'view';
  formData: CaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<CaseFormData>>;
  contextClientId?: string;
  onAddNewClient?: () => void;
  getAvailableClients: () => any[];
  getContextDetails: () => { client?: any };
  updateContext: (ctx: { clientId?: string }) => void;
  isStatutoryDeadline: boolean;
  setIsStatutoryDeadline: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Pure form component for Case creation/editing
 * Extracted from CaseModal for use with AdaptiveFormShell
 */
export const CaseForm: React.FC<CaseFormProps> = ({
  mode,
  formData,
  setFormData,
  contextClientId,
  onAddNewClient,
  getAvailableClients,
  getContextDetails,
  updateContext,
  isStatutoryDeadline,
  setIsStatutoryDeadline,
}) => {
  const { state } = useAppState();
  const { calculateReplyDeadline, formatDeadlineForForm } = useStatutoryDeadlines({
    autoCalculate: false,
  });

  const isDisabled = mode === 'view';

  return (
    <div className="space-y-6">
      {/* Section 1: Case Identification */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Case Identification</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                disabled={isDisabled}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="officeFileNo">
                  Office File No <span className="text-destructive">*</span>
                </Label>
                <FieldTooltip formId="create-case" fieldId="office_file_no" />
              </div>
              <Input
                id="officeFileNo"
                value={formData.officeFileNo}
                onChange={(e) => setFormData(prev => ({ ...prev, officeFileNo: e.target.value }))}
                disabled={isDisabled}
                placeholder="e.g., OFFICE001"
                required
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="noticeNo">
                  Notice No <span className="text-destructive">*</span>
                </Label>
                <FieldTooltip formId="create-case" fieldId="notice_no" />
              </div>
              <Input
                id="noticeNo"
                value={formData.noticeNo}
                onChange={(e) => setFormData(prev => ({ ...prev, noticeNo: e.target.value }))}
                disabled={isDisabled}
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
              <FieldTooltip formId="create-case" fieldId="issue_type" />
            </div>
            <IssueTypeSelector
              value={formData.issueType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, issueType: value }))}
              disabled={isDisabled}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label>
                  Notice Date <span className="text-destructive">*</span>
                </Label>
                <FieldTooltip formId="create-case" fieldId="notice_date" />
              </div>
              <StandardDateInput
                id="notice_date"
                value={formData.notice_date}
                onChange={async (value) => {
                  const noticeDate = value;
                  let replyDue = '';
                  if (noticeDate) {
                    const result = await calculateReplyDeadline(noticeDate, formData.issueType);
                    if (result) {
                      replyDue = formatDeadlineForForm(result);
                      setIsStatutoryDeadline(true);
                    } else {
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
                disabled={isDisabled}
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
                <FieldTooltip formId="create-case" fieldId="reply_due_date" />
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
                  setFormData(prev => ({ ...prev, reply_due_date: value }));
                  if (value) setIsStatutoryDeadline(false);
                }}
                disabled={isDisabled}
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
              <ClientSelector
                clients={getAvailableClients()}
                value={formData.clientId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, clientId: value }));
                  updateContext({ clientId: value });
                }}
                disabled={isDisabled}
                showAddNew={mode !== 'view'}
                onAddNew={onAddNewClient}
                data-tour="client-selector"
              />
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
              disabled={isDisabled}
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
              disabled={isDisabled}
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

      {/* Section 5: Legal Stage & Forum */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Legal Stage & Forum</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  matterType: ''
                }))}
                disabled={isDisabled}
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
                    stateBenchState: value === 'state_bench' ? prev.stateBenchState : '',
                    stateBenchCity: value === 'state_bench' ? prev.stateBenchCity : ''
                  }))}
                  disabled={isDisabled}
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
                      stateBenchCity: ''
                    }))}
                    disabled={isDisabled}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="z-[200] bg-popover max-h-[300px]" position="popper" sideOffset={5}>
                      {getAllStates().map(st => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
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
                      disabled={isDisabled}
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

      {/* Section 6: Financial Details */}
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
              disabled={isDisabled}
              placeholder="e.g., Q1 FY2024-25, Apr-Jun 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                disabled={isDisabled}
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
                disabled={isDisabled}
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
                disabled={isDisabled}
                placeholder="Optional"
              />
            </div>
          </div>
          
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

      {/* Section 7: GST Notice Details */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">GST Notice Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="notice_no">Notice Number</Label>
                <FieldTooltip formId="create-case" fieldId="notice_number" />
              </div>
              <Input
                id="notice_no"
                value={formData.notice_no}
                onChange={(e) => setFormData(prev => ({ ...prev, notice_no: e.target.value }))}
                disabled={isDisabled}
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
                disabled={isDisabled}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
                  <SelectItem value="DRC-01A">DRC-01A (Pre-SCN Intimation)</SelectItem>
                  <SelectItem value="DRC-01">DRC-01 (Show Cause Notice)</SelectItem>
                  <SelectItem value="DRC-03">DRC-03 (Audit Intimation)</SelectItem>
                  <SelectItem value="DRC-07">DRC-07 (Order)</SelectItem>
                  <SelectItem value="DRC-08">DRC-08 (Rectification)</SelectItem>
                  <SelectItem value="ASMT-10">ASMT-10 (Notice for Clarification)</SelectItem>
                  <SelectItem value="ASMT-11">ASMT-11 (Summary of Order)</SelectItem>
                  <SelectItem value="ASMT-12">ASMT-12 (Final Notice)</SelectItem>
                  <SelectItem value="APL-01">APL-01 (Appeal Filed)</SelectItem>
                  <SelectItem value="APL-05">APL-05 (Appeal Order)</SelectItem>
                  <SelectItem value="SCN">SCN (Show Cause Notice)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="section_invoked">Section Invoked</Label>
                <FieldTooltip formId="create-case" fieldId="section_invoked" />
              </div>
              <Input
                id="section_invoked"
                value={formData.section_invoked}
                onChange={(e) => setFormData(prev => ({ ...prev, section_invoked: e.target.value }))}
                disabled={isDisabled}
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
                disabled={isDisabled}
                placeholder="FY 2024-25"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={isDisabled}
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
                disabled={isDisabled}
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
              disabled={isDisabled}
              placeholder="e.g., Shri Rajesh Kumar, Deputy Commissioner"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Jurisdiction Details */}
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
              disabled={isDisabled}
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
              disabled={isDisabled}
              placeholder="e.g., Mumbai Central"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 9: Order & Appeal Milestones (Visible for Adjudication and above) */}
      {['Adjudication', 'First Appeal', 'Tribunal', 'High Court', 'Supreme Court'].includes(formData.currentStage) && (
        <Card className="shadow-sm border border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Order & Appeal Milestones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="order_date">
                    Order Date {formData.currentStage !== 'Assessment' && <span className="text-destructive">*</span>}
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="order_date" />
                </div>
                <StandardDateInput
                  id="order_date"
                  value={formData.order_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, order_date: value }))}
                  disabled={isDisabled}
                  placeholder="Date of order (e.g., DRC-07)"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="order_received_date">
                    Order Received Date
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="order_received_date" />
                </div>
                <StandardDateInput
                  id="order_received_date"
                  value={formData.order_received_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, order_received_date: value }))}
                  disabled={isDisabled}
                  placeholder="Date order was received"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="impugned_order_no">
                    Impugned Order Number
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="impugned_order_no" />
                </div>
                <Input
                  id="impugned_order_no"
                  value={formData.impugned_order_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, impugned_order_no: e.target.value }))}
                  disabled={isDisabled}
                  placeholder="e.g., DRC-07/2025/001"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="impugned_order_amount">
                    Amount in Dispute (₹)
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="impugned_order_amount" />
                </div>
                <Input
                  id="impugned_order_amount"
                  type="number"
                  value={formData.impugned_order_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, impugned_order_amount: e.target.value }))}
                  disabled={isDisabled}
                  placeholder="Amount confirmed/disputed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="impugned_order_date">
                    Impugned Order Date
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="impugned_order_date" />
                </div>
                <StandardDateInput
                  id="impugned_order_date"
                  value={formData.impugned_order_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, impugned_order_date: value }))}
                  disabled={isDisabled}
                  placeholder="Date of impugned order"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label htmlFor="appeal_filed_date">
                    Appeal Filed Date
                  </Label>
                  <FieldTooltip formId="create-case" fieldId="appeal_filed_date" />
                </div>
                <StandardDateInput
                  id="appeal_filed_date"
                  value={formData.appeal_filed_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, appeal_filed_date: value }))}
                  disabled={isDisabled}
                  placeholder="Date appeal was filed"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 10: Description */}
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
            disabled={isDisabled}
            rows={3}
            placeholder="Additional case details..."
            className="mt-2"
          />
        </CardContent>
      </Card>
    </div>
  );
};
