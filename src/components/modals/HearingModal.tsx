import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin } from 'lucide-react';
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
      // Validate relationships
      const judgeCourtValidation = validateJudgeCourt(formData.judgeId, formData.courtId);
      if (!judgeCourtValidation.isValid) {
        toast({
          title: "Validation Error",
          description: judgeCourtValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
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
        const hearingFormData = {
          case_id: formData.caseId,
          date: formData.date.toISOString().split('T')[0],
          start_time: formData.time,
          end_time: formData.time,
          timezone: 'Asia/Kolkata',
          court_id: formData.courtId,
          judge_ids: [formData.judgeId],
          purpose: 'mention' as const,
          notes: formData.notes
        };

        await hearingsService.createHearing(hearingFormData, dispatch);
      } else if (mode === 'edit' && hearingData) {
        const updates = {
          court_id: formData.courtId,
          judge_ids: [formData.judgeId],
          date: formData.date.toISOString().split('T')[0],
          start_time: formData.time,
          end_time: formData.time,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Schedule New Hearing'}
            {mode === 'edit' && 'Edit Hearing'}
            {mode === 'view' && 'Hearing Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Context Information */}
          {context.clientId && (
            <ContextBadge
              label="Client"
              value={getContextDetails().client?.name || 'Unknown Client'}
              variant="outline"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hearing Date</Label>
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
              <Label htmlFor="time">Time</Label>
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

          <div>
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={formData.agenda}
              onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
              disabled={mode === 'view'}
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode !== 'view' && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? (mode === 'create' ? 'Scheduling...' : 'Updating...')
                  : (mode === 'create' ? 'Schedule Hearing' : 'Update Hearing')
                }
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};