import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Scale, Calendar as CalendarCheckIcon, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Hearing, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { CaseSelector, CourtSelector, JudgeSelector } from '@/components/ui/relationship-selector';
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
import { ModalLayout } from '@/components/ui/modal-layout';

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
  const { validateJudgeCourt, getCaseWithClient } = useRelationships();
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
    date: Date;
    time: string;
    type: 'Adjourned' | 'Final' | 'Argued' | 'Preliminary';
    status: 'scheduled' | 'concluded' | 'adjourned' | 'no-board' | 'withdrawn';
    agenda: string;
    notes: string;
  }>({
    caseId: contextCaseId || '',
    courtId: '',
    judgeId: '',
    date: new Date(),
    time: '10:00',
    type: 'Preliminary',
    status: 'scheduled',
    agenda: '',
    notes: ''
  });
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (hearingData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        caseId: hearingData.caseId,
        courtId: hearingData.courtId,
        judgeId: hearingData.judgeId,
        date: new Date(hearingData.date),
        time: hearingData.time,
        type: hearingData.type,
        status: hearingData.status as any,
        agenda: hearingData.agenda,
        notes: hearingData.notes || ''
      });
      updateContext({ 
        caseId: hearingData.caseId, 
        clientId: hearingData.clientId,
        courtId: hearingData.courtId,
        judgeId: hearingData.judgeId
      });
    }
  }, [hearingData, mode, updateContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate relationships (only validate judge if provided)
      if (formData.judgeId) {
        const judgeCourtValidation = validateJudgeCourt(formData.judgeId, formData.courtId);
        if (!judgeCourtValidation.isValid) {
          toast({
            title: "Validation Error",
            description: judgeCourtValidation.errors.join(', '),
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      const caseWithClient = getCaseWithClient(formData.caseId);
      if (!caseWithClient?.case || !caseWithClient?.client) {
        toast({
          title: "Error",
          description: "Could not find case or client information.",
          variant: "destructive"
        });
        return;
      }

      if (mode === 'create') {
        // Calculate end time (assume 1 hour duration if not specified)
        const startTime = formData.time;
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours + 1, minutes);
        const endTime = endDate.toTimeString().slice(0, 5);

        const hearingFormData = {
          case_id: formData.caseId,
          date: formData.date.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          timezone: 'Asia/Kolkata',
          court_id: formData.courtId,
          judge_ids: formData.judgeId ? [formData.judgeId] : [],
          purpose: 'mention' as const,
          notes: formData.notes || formData.agenda
        };

        await hearingsService.createHearing(hearingFormData, dispatch);
      } else if (mode === 'edit' && hearingData) {
        // Calculate end time for updates too
        const startTime = formData.time;
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours + 1, minutes);
        const endTime = endDate.toTimeString().slice(0, 5);

        const updates = {
          court_id: formData.courtId,
          judge_ids: formData.judgeId ? [formData.judgeId] : [],
          date: formData.date.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          agenda: formData.agenda,
          notes: formData.notes
        };

        await hearingsService.updateHearing(hearingData.id, updates, dispatch);
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
    <ModalLayout
      open={isOpen}
      onOpenChange={onClose}
      title={getModalTitle()}
      icon={<Scale className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      showHeaderDivider={true}
      showFooterDivider={true}
      footer={
        <div className="flex gap-2">
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
        </div>
      }
    >
      {/* Context Badges */}
      {(() => {
        const details = getContextDetails();
        const badges = [];
        
        if (details.client) {
          badges.push(<Badge key="client" variant="outline" className="text-xs">{details.client.name}</Badge>);
        }
        if (details.case) {
          badges.push(<Badge key="case" variant="outline" className="text-xs">{details.case.caseNumber}</Badge>);
        }
        
        return badges.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap mb-4">{badges}</div>
        ) : null;
      })()}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Case & Legal Forum Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4" />
              Case & Legal Forum Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            
            {/* Court and Judge in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CourtSelector
                courts={getAvailableCourts()}
                value={formData.courtId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, courtId: value, judgeId: '' }));
                  updateContext({ courtId: value });
                }}
                disabled={mode === 'view'}
              />
              
              <JudgeSelector
                judges={getAvailableJudges(formData.courtId)}
                value={formData.judgeId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, judgeId: value }));
                  updateContext({ judgeId: value });
                }}
                disabled={mode === 'view' || !formData.courtId}
              />
            </div>
            
            {/* Court Address Alert (if enabled) */}
            {formData.courtId && isAddressMasterEnabled && (() => {
              const selectedCourt = state.courts.find(court => court.id === formData.courtId);
              return selectedCourt?.address ? (
                <Alert className="mt-2">
                  <MapPin className="h-4 w-4" />
                  <AlertTitle>Legal Forum Address</AlertTitle>
                  <AlertDescription>
                    {typeof selectedCourt.address === 'object' ? (
                      <AddressView 
                        address={selectedCourt.address}
                        compact={true}
                        showSource={false}
                      />
                    ) : (
                      <div className="text-sm">{selectedCourt.address}</div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Section 2: Schedule Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheckIcon className="h-4 w-4" />
              Schedule Information
            </CardTitle>
          </CardHeader>
          <CardContent>
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

        {/* Section 3: Hearing Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Hearing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
      </form>
    </ModalLayout>
  );
};