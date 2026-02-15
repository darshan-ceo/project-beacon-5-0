import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Users, Scale, AlignLeft } from 'lucide-react';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { ClientSelector } from '@/components/ui/relationship-selector';
import { EmployeeSelector } from '@/components/ui/employee-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { IssueTypeSelector } from '@/components/ui/IssueTypeSelector';
import { CASE_TYPES } from '../../../config/appConfig';
import { getNextSequence, type CaseType } from '@/utils/caseNumberGenerator';
import { cn } from '@/lib/utils';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { getAllStates, getCitiesForState } from '@/data/gstat-state-benches';

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
  order_date: string;
  order_received_date: string;
  appeal_filed_date: string;
  impugned_order_no: string;
  impugned_order_date: string;
  impugned_order_amount: string;
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

  const isDisabled = mode === 'view';

  return (
    <div className="space-y-6">
      {/* Client Selector - Top of Form */}
      <div className="space-y-2">
        {contextClientId ? (
          <ContextBadge
            label="Client"
            value={(() => {
              const client = getContextDetails().client;
              return (client && 'display_name' in client ? client.display_name : client && 'name' in client ? (client as any).name : 'Unknown Client');
            })()}
            variant="outline"
          />
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
          />
        )}
      </div>

      {/* Section 1: Case Identification */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Case Identification</CardTitle>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Minimal notice details required to start tracking this case
          </p>
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
                  Office File No
                </Label>
                <FieldTooltip formId="create-case" fieldId="office_file_no" />
              </div>
              <Input
                id="officeFileNo"
                value={formData.officeFileNo}
                onChange={(e) => setFormData(prev => ({ ...prev, officeFileNo: e.target.value }))}
                disabled={isDisabled}
                placeholder="e.g., OFFICE001 (optional)"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="noticeNo">
                  Notice / Reference No <span className="text-destructive">*</span>
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

          {/* Case number generated in backend but not displayed */}
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
                Primary Issue (if known)
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

      {/* Section 3: Assignment */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Assignment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Section 4: Case Lifecycle Stage */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Case Lifecycle Stage</CardTitle>
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
                    <SelectItem key={level.id} value={level.name}>
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
