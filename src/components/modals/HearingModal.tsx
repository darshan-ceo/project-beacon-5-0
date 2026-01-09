import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Scale, Calendar as CalendarCheckIcon, FileText, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Hearing, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { CaseSelector, CourtSelector, JudgeSelector, AuthoritySelector, LegalForumSelector } from '@/components/ui/relationship-selector';
import { ContextBadge } from '@/components/ui/context-badge';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { AddressView } from '@/components/ui/AddressView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { featureFlagService } from '@/services/featureFlagService';
import { hearingsService } from '@/services/hearingsService';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { HearingOutcomeSection } from './HearingOutcomeSection';
import { HearingDocumentUpload } from '../hearings/HearingDocumentUpload';
import { HearingSummaryGenerator } from '../hearings/HearingSummaryGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detectHearingConflicts } from '@/utils/hearingConflicts';
import { supabase } from '@/integrations/supabase/client';
import { uploadDocument } from '@/services/supabaseDocumentService';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

interface HearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hearing?: Hearing | null;
  mode: 'create' | 'edit' | 'view';
  contextCaseId?: string;
  contextClientId?: string;
}

export const HearingModal: React.FC<HearingModalProps> = ({ 
  isOpen, 
  onClose, 
  hearing: hearingData, 
  mode,
  contextCaseId,
  contextClientId 
}) => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  const { validateJudgeCourt, getCaseWithClient } = useRelationships();
  
  // RBAC permission flags
  const canCreateHearings = hasPermission('hearings', 'write');
  const canEditHearings = hasPermission('hearings', 'write');
  
  const { 
    context, 
    updateContext, 
    getAvailableCases, 
    getAvailableCourts, 
    getAvailableJudges,
    getContextDetails 
  } = useContextualForms({
    caseId: contextCaseId,
    clientId: contextClientId
  });

  const [formData, setFormData] = useState<{
    caseId: string;
    courtId: string;
    judgeId: string;
    authorityId: string;
    forumId: string;
    date: Date;
    time: string;
    type: 'Adjourned' | 'Final' | 'Argued' | 'Preliminary';
    status: 'scheduled' | 'concluded' | 'adjourned' | 'no-board' | 'withdrawn';
    agenda: string;
    notes: string;
    // Phase 2: Outcome fields
    outcome?: string;
    outcomeText?: string;
    nextHearingDate?: Date;
    autoCreateNextHearing?: boolean;
  }>({
    caseId: contextCaseId || '',
    courtId: '',
    judgeId: '',
    authorityId: '',
    forumId: '',
    date: new Date(),
    time: '10:00',
    type: 'Preliminary',
    status: 'scheduled',
    agenda: '',
    notes: '',
    outcome: undefined,
    outcomeText: '',
    nextHearingDate: undefined,
    autoCreateNextHearing: false
  });
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conflicts, setConflicts] = useState<{
    hasConflicts: boolean;
    conflicts: Array<{
      conflictingHearingTitle: string;
      conflictingCaseNumber: string;
      conflictingTime: string;
      conflictingCourt: string;
      overlapMinutes: number;
      severity: 'critical' | 'warning';
    }>;
  }>({ hasConflicts: false, conflicts: [] });

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    // Only initialize formData ONCE when modal opens with hearingData in edit/view mode
    if (isOpen && hearingData && (mode === 'edit' || mode === 'view') && !isInitialized) {
      setFormData({
        // Use snake_case with camelCase fallback for legacy data
        caseId: hearingData.case_id || hearingData.caseId || '',
        courtId: hearingData.court_id || hearingData.courtId || '',
        judgeId: hearingData.judge_ids?.[0] || hearingData.judgeId || '',
        authorityId: hearingData.authority_id || hearingData.court_id || hearingData.courtId || '',
        forumId: hearingData.forum_id || hearingData.court_id || hearingData.courtId || '',
        date: new Date(hearingData.date),
        time: hearingData.start_time || hearingData.time || '10:00',
        type: hearingData.type || 'Preliminary',
        status: (hearingData.status as any) || 'scheduled',
        agenda: hearingData.agenda || hearingData.notes || '',
        notes: hearingData.notes || '',
        outcome: hearingData.outcome,
        outcomeText: hearingData.outcome_text || '',
        nextHearingDate: hearingData.next_hearing_date ? new Date(hearingData.next_hearing_date) : undefined,
        autoCreateNextHearing: false
      });
      updateContext({ 
        caseId: hearingData.case_id || hearingData.caseId, 
        clientId: hearingData.clientId,
        courtId: hearingData.court_id || hearingData.courtId,
        judgeId: hearingData.judge_ids?.[0] || hearingData.judgeId
      });
      setIsInitialized(true);
    }
    
    // Reset initialization flag and clear attachments when modal closes
    if (!isOpen) {
      setIsInitialized(false);
      setAttachments([]);
    }
  }, [hearingData, mode, updateContext, isOpen, isInitialized]);

  // Check for conflicts when date, time, or court changes
  useEffect(() => {
    if (!formData.date || !formData.time || !formData.forumId) {
      setConflicts({ hasConflicts: false, conflicts: [] });
      return;
    }

    const dateStr = formData.date.toISOString().split('T')[0];
    const result = detectHearingConflicts(
      {
        id: hearingData?.id,
        date: dateStr,
        start_time: formData.time,
        court_id: formData.forumId
      },
      state.hearings,
      state.cases,
      state.courts
    );

    setConflicts(result);
  }, [formData.date, formData.time, formData.forumId, state.hearings, state.cases, state.courts, hearingData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    
    // Check RBAC permission
    if (mode === 'create' && !canCreateHearings) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create hearings.",
        variant: "destructive"
      });
      return;
    }
    
    if (mode === 'edit' && !canEditHearings) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit hearings.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Phase 1: Validate mandatory field (Legal Forum)
      if (!formData.forumId) {
        toast({
          title: "Validation Error",
          description: "Legal Forum is a mandatory field",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Phase 1: Validate past date using local midnight
      const selectedLocalDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate());
      const todayLocalDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      if (selectedLocalDate < todayLocalDate) {
        toast({
          title: "Validation Error",
          description: "Hearing date cannot be in the past",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Phase 1: Normalize and validate time format (accept both 12h and 24h)
      let normalizedTime = formData.time.trim();
      // Check for 12-hour format (e.g., "10:00 AM" or "2:30 PM")
      const time12hMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (time12hMatch) {
        let hours = parseInt(time12hMatch[1]);
        const minutes = time12hMatch[2];
        const meridiem = time12hMatch[3].toUpperCase();
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      // Validate 24-hour format
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedTime)) {
        toast({
          title: "Validation Error",
          description: "Time must be in valid format (HH:mm or HH:mm AM/PM)",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      // Update formData with normalized time
      if (normalizedTime !== formData.time) {
        setFormData(prev => ({ ...prev, time: normalizedTime }));
      }

      // Validate judge-authority relationship
      if (formData.judgeId && formData.authorityId) {
        const judge = state.judges.find(j => j.id === formData.judgeId);
        const authority = state.courts.find(c => c.id === formData.authorityId);
        if (judge && authority && judge.authorityLevel && authority.authorityLevel) {
          if (judge.authorityLevel !== authority.authorityLevel) {
            toast({
              title: "Validation Error",
              description: `Judge ${judge.name} is not assigned to ${authority.name}`,
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      const caseWithClient = getCaseWithClient(formData.caseId);
      if (!caseWithClient?.case || !caseWithClient?.client) {
        toast({
          title: "Error",
          description: "Could not find case or client information.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (mode === 'create') {
        // Block hearing creation for completed cases
        const targetCase = state.cases.find(c => c.id === formData.caseId);
        if (targetCase?.status === 'Completed') {
          toast({
            title: "Cannot Schedule Hearing",
            description: "This case has been completed. No new hearings can be scheduled.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        // Calculate end time (assume 1 hour duration if not specified)
        const startTime = formData.time;
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours + 1, minutes);
        const endTime = endDate.toTimeString().slice(0, 5);

        // Phase 1: Get authority and forum names for derived fields
        const authority = state.courts.find(c => c.id === formData.authorityId);
        const forum = state.courts.find(c => c.id === formData.forumId);
        const judge = formData.judgeId ? state.judges.find(j => j.id === formData.judgeId) : undefined;

        const hearingFormData = {
          case_id: formData.caseId,
          date: format(formData.date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          timezone: 'Asia/Kolkata',
          court_id: formData.forumId || undefined, // Convert empty to undefined
          judge_ids: formData.judgeId ? [formData.judgeId] : [],
          purpose: 'mention' as const,
          notes: formData.notes || formData.agenda,
          authority_id: formData.authorityId || undefined, // Convert empty to undefined
          forum_id: formData.forumId || undefined,         // Convert empty to undefined
          authority_name: authority?.name,
          forum_name: forum?.name,
          judge_name: judge?.name,
          bench_details: judge?.bench
        };

        const newHearing = await hearingsService.createHearing(hearingFormData, dispatch);

        // Upload attached documents
        if (attachments.length > 0 && newHearing?.id) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.warn('No authenticated user found for document upload');
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();
              
              if (!profile?.tenant_id) {
                console.warn('Unable to determine tenant for document upload');
              } else {
                for (const file of attachments) {
                  const uploadedDoc = await uploadDocument(file, {
                    tenant_id: profile.tenant_id,
                    hearing_id: newHearing.id,
                    case_id: formData.caseId,
                    category: 'Miscellaneous'
                  });
                  
                  // Add document to state so it appears immediately
                  if (uploadedDoc) {
                    dispatch({
                      type: 'ADD_DOCUMENT',
                      payload: {
                        id: uploadedDoc.id,
                        name: uploadedDoc.file_name,
                        type: uploadedDoc.file_type,
                        size: uploadedDoc.file_size,
                        path: uploadedDoc.file_path,
                        caseId: formData.caseId,
                        clientId: caseWithClient.client.id,
                        uploadedById: user.id,
                        uploadedByName: user.email || 'Unknown',
                        uploadedAt: new Date().toISOString(),
                        tags: [],
                        isShared: false,
                        folderId: undefined,
                        category: 'Miscellaneous'
                      }
                    });
                  }
                }
                toast({
                  title: "Documents Uploaded",
                  description: `${attachments.length} document(s) linked to hearing.`
                });
                // Clear attachments after successful upload
                setAttachments([]);
              }
            }
          } catch (docError) {
            console.error('Failed to upload hearing documents:', docError);
            toast({
              title: "Warning",
              description: "Hearing scheduled but some documents failed to upload.",
              variant: "destructive"
            });
          }
        }
      } else if (mode === 'edit' && hearingData) {
        // Get judge name for update
        const judge = formData.judgeId ? state.judges.find(j => j.id === formData.judgeId) : undefined;

        const updates = {
          case_id: formData.caseId || hearingData.case_id, // CRITICAL: Include case_id
          court_id: formData.forumId,
          authority_id: formData.authorityId || undefined,
          forum_id: formData.forumId || undefined,
          // Use UI-friendly fields so the service can map to DB + update state correctly
          date: format(formData.date, 'yyyy-MM-dd'),
          start_time: formData.time,
          judge_ids: formData.judgeId ? [formData.judgeId] : undefined,
          notes: formData.notes || undefined,
          status: formData.status
        };

        await hearingsService.updateHearing(hearingData.id, updates, dispatch);

        // Upload any new attached documents
        if (attachments.length > 0 && hearingData.id) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.warn('No authenticated user found for document upload');
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();
              
              if (!profile?.tenant_id) {
                console.warn('Unable to determine tenant for document upload');
              } else {
                for (const file of attachments) {
                  const uploadedDoc = await uploadDocument(file, {
                    tenant_id: profile.tenant_id,
                    hearing_id: hearingData.id,
                    case_id: formData.caseId,
                    category: 'Miscellaneous'
                  });
                  
                  // Add document to state so it appears immediately
                  if (uploadedDoc) {
                    dispatch({
                      type: 'ADD_DOCUMENT',
                      payload: {
                        id: uploadedDoc.id,
                        name: uploadedDoc.file_name,
                        type: uploadedDoc.file_type,
                        size: uploadedDoc.file_size,
                        path: uploadedDoc.file_path,
                        caseId: formData.caseId,
                        clientId: caseWithClient.client.id,
                        uploadedById: user.id,
                        uploadedByName: user.email || 'Unknown',
                        uploadedAt: new Date().toISOString(),
                        tags: [],
                        isShared: false,
                        folderId: undefined,
                        category: 'Miscellaneous'
                      }
                    });
                  }
                }
                toast({
                  title: "Documents Uploaded",
                  description: `${attachments.length} document(s) linked to hearing.`
                });
                // Clear attachments after successful upload
                setAttachments([]);
              }
            }
          } catch (docError) {
            console.error('Failed to upload hearing documents:', docError);
            toast({
              title: "Warning",
              description: "Hearing updated but some documents failed to upload.",
              variant: "destructive"
            });
          }
        }
      }

      // Phase 2: Record outcome if provided
      if (formData.outcome && hearingData) {
        await hearingsService.recordOutcome(
          hearingData.id,
          formData.outcome,
          formData.outcomeText,
          formData.nextHearingDate?.toISOString().split('T')[0],
          formData.autoCreateNextHearing,
          dispatch
        );
      }

      onClose();
    } catch (error) {
      console.error('Error submitting hearing:', error);
      // Error toast is handled by the service
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (mode === 'create') return 'Schedule New Hearing';
    if (mode === 'edit') return 'Edit Hearing';
    return 'Hearing Details';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh] overflow-hidden border bg-background shadow-beacon-lg rounded-beacon-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          {(() => {
            const details = getContextDetails();
            const hasBadges = details.client || details.case;
            
            return hasBadges ? (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {details.client && (
                  <Badge variant="outline" className="text-xs">
                    {details.client.name}
                  </Badge>
                )}
                {details.case && (
                  <Badge variant="outline" className="text-xs">
                    {details.case.caseNumber}
                  </Badge>
                )}
              </div>
            ) : null;
          })()}
        </DialogHeader>

        <DialogBody className="px-6 py-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Case & Legal Forum Details */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Case & Legal Forum Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Case Selector or Context Badge */}
                <div>
                  {contextCaseId ? (
                    <div className="space-y-2">
                      <Label>Case</Label>
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
                        setFormData(prev => ({ ...prev, caseId: value }));
                        updateContext({ caseId: value });
                      }}
                      disabled={mode === 'view'}
                    />
                  )}
                </div>
                
                {/* Phase 1: Authority and Forum Selectors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <FieldTooltip formId="create-hearing" fieldId="authority" />
                    </div>
                    <AuthoritySelector
                      courts={state.courts}
                      value={formData.authorityId}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, authorityId: value }));
                      }}
                      disabled={mode === 'view'}
                      required={false}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <FieldTooltip formId="create-hearing" fieldId="forum" />
                    </div>
                    <LegalForumSelector
                      courts={state.courts}
                      value={formData.forumId}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, forumId: value, courtId: value }));
                        updateContext({ courtId: value });
                      }}
                      disabled={mode === 'view'}
                      required={true}
                    />
                  </div>
                </div>

                {/* Judge Selector */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <FieldTooltip formId="create-hearing" fieldId="judge" />
                  </div>
                  <JudgeSelector
                    judges={getAvailableJudges(formData.forumId)}
                    value={formData.judgeId}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, judgeId: value }));
                      updateContext({ judgeId: value });
                    }}
                    disabled={mode === 'view' || !formData.forumId}
                  />
                </div>
                
                {/* Forum Address Alert (if enabled) */}
                {formData.forumId && isAddressMasterEnabled && (() => {
                  const selectedForum = state.courts.find(court => court.id === formData.forumId);
                  return selectedForum?.address ? (
                    <Alert className="mt-2">
                      <MapPin className="h-4 w-4" />
                      <AlertTitle>Legal Forum Address</AlertTitle>
                      <AlertDescription>
                        {typeof selectedForum.address === 'object' ? (
                          <AddressView 
                            address={selectedForum.address}
                            compact={true}
                            showSource={false}
                          />
                        ) : (
                          <div className="text-sm">{selectedForum.address}</div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : null;
                })()}
              </CardContent>
            </Card>

            {/* Section 2: Schedule Information */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheckIcon className="h-4 w-4" />
                  Schedule Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label>Hearing Date <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-hearing" fieldId="date" />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                          )}
                          disabled={mode === 'view'}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Time Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="time">Time <span className="text-destructive">*</span></Label>
                      <FieldTooltip formId="create-hearing" fieldId="time" />
                    </div>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      disabled={mode === 'view'}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conflict Warning Section */}
            {conflicts.hasConflicts && (
              <Alert variant={conflicts.conflicts.some(c => c.severity === 'critical') ? 'destructive' : 'default'} 
                className="border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="text-base font-semibold">
                  {conflicts.conflicts.some(c => c.severity === 'critical') 
                    ? 'Critical Scheduling Conflict Detected' 
                    : 'Scheduling Conflict Warning'}
                </AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  <p className="text-sm">
                    {conflicts.conflicts.length === 1 
                      ? 'This hearing overlaps with another scheduled hearing:'
                      : `This hearing overlaps with ${conflicts.conflicts.length} other scheduled hearings:`}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {conflicts.conflicts.map((conflict, idx) => (
                      <div key={idx} className="bg-background/50 rounded-md p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{conflict.conflictingCaseNumber}</span>
                          <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {conflict.severity === 'critical' ? 'Same Court' : 'Different Court'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{conflict.conflictingHearingTitle}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>🕐 {conflict.conflictingTime}</span>
                          <span>🏛️ {conflict.conflictingCourt}</span>
                          <span>⏱️ {conflict.overlapMinutes} min overlap</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium mt-2">
                    {conflicts.conflicts.some(c => c.severity === 'critical')
                      ? '⚠️ You may not be able to attend both hearings. Please reschedule or assign different counsel.'
                      : 'ℹ️ Consider travel time between courts when confirming this schedule.'}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Section 3: Hearing Details */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Hearing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Agenda */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="agenda">
                      Agenda <span className="text-destructive">*</span>
                    </Label>
                    <FieldTooltip formId="create-hearing" fieldId="agenda" />
                  </div>
                  <Textarea
                    id="agenda"
                    value={formData.agenda}
                    onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                    disabled={mode === 'view'}
                    rows={3}
                    placeholder="Enter the hearing agenda..."
                    required
                  />
                </div>
                
                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="notes">Notes</Label>
                    <FieldTooltip formId="create-hearing" fieldId="notes" />
                  </div>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    disabled={mode === 'view'}
                    rows={3}
                    placeholder="Additional notes or instructions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Phase 2: Outcome Section (only show for edit mode or if hearing is concluded) */}
            {(mode === 'edit' || mode === 'view') && (
              <HearingOutcomeSection
                outcome={formData.outcome}
                outcomeText={formData.outcomeText}
                nextHearingDate={formData.nextHearingDate}
                autoCreateNextHearing={formData.autoCreateNextHearing}
                onOutcomeChange={(outcome) => setFormData(prev => ({ ...prev, outcome }))}
                onOutcomeTextChange={(text) => setFormData(prev => ({ ...prev, outcomeText: text }))}
                onNextHearingDateChange={(date) => setFormData(prev => ({ ...prev, nextHearingDate: date }))}
                onAutoCreateChange={(checked) => setFormData(prev => ({ ...prev, autoCreateNextHearing: checked }))}
                disabled={mode === 'view'}
              />
            )}

            {/* Phase 4: AI Summary Generator (View Mode Only) */}
            {mode === 'view' && hearingData && (
              <HearingSummaryGenerator hearing={hearingData} />
            )}

            {/* Phase 3: Document Upload Section */}
            <HearingDocumentUpload
              hearingId={hearingData?.id}
              caseId={formData.caseId}
              onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])}
              existingFiles={attachments}
              onRemoveFile={(index) => {
                setAttachments(prev => prev.filter((_, i) => i !== index));
              }}
              disabled={mode === 'view'}
            />
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Scheduling...' : 'Updating...'}
                </>
              ) : (
                <>
                  <CalendarCheckIcon className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Schedule Hearing' : 'Update Hearing'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};