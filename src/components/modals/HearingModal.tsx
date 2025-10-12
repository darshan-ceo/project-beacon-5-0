import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Scale, Calendar as CalendarCheckIcon, FileText } from 'lucide-react';
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
import { featureFlagService } from '@/services/featureFlagService';
import { hearingsService } from '@/services/hearingsService';
import { FieldTooltip } from '@/components/ui/field-tooltip';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {mode === 'create' && 'Schedule New Hearing'}
            {mode === 'edit' && 'Edit Hearing'}
            {mode === 'view' && 'Hearing Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[60vh]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Context Information */}
            {context.clientId && (
              <ContextBadge
                label="Client"
                value={getContextDetails().client?.name || 'Unknown Client'}
                variant="outline"
              />
            )}

            {/* Section 1: Case & Court Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Scale className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Case & Court Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {contextCaseId ? (
                  <ContextBadge
                    label="Case"
                    value={getContextDetails().case?.caseNumber || 'Unknown Case'}
                    variant="outline"
                  />
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
              
              <div>
                <CourtSelector
                  courts={getAvailableCourts()}
                  value={formData.courtId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, courtId: value, judgeId: '' }));
                    updateContext({ courtId: value });
                  }}
                  disabled={mode === 'view'}
                />
              </div>
            </div>

            <div>
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
            </div>

            {/* Section 2: Schedule Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <CalendarCheckIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Schedule Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <Label>Hearing Date</Label>
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
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="time">Time</Label>
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
            </div>

            {/* Court Address Display */}
            {formData.courtId && isAddressMasterEnabled && (() => {
              const selectedCourt = state.courts.find(court => court.id === formData.courtId);
              return selectedCourt ? (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Court Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {selectedCourt.address && typeof selectedCourt.address === 'object' ? (
                      <AddressView 
                        address={selectedCourt.address}
                        compact={true}
                        showSource={false}
                      />
                    ) : selectedCourt.address && typeof selectedCourt.address === 'string' ? (
                      <div className="text-sm">
                        {selectedCourt.address}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No address information available
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Section 3: Hearing Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Hearing Details</h3>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="agenda">Agenda <span className="text-destructive">*</span></Label>
                  <FieldTooltip formId="create-hearing" fieldId="agenda" />
                </div>
                <Textarea
                  id="agenda"
                  value={formData.agenda}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                  disabled={mode === 'view'}
                  rows={3}
                  required
                />
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting 
                ? (mode === 'create' ? 'Scheduling...' : 'Updating...')
                : (mode === 'create' ? 'Schedule Hearing' : 'Update Hearing')
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};