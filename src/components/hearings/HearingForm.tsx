import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState, Hearing } from '@/contexts/AppStateContext';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';

interface HearingFormProps {
  hearing?: Hearing;
  mode: 'create' | 'edit' | 'view';
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const HearingForm: React.FC<HearingFormProps> = ({
  hearing,
  mode,
  onSubmit,
  onCancel
}) => {
  const { state } = useAppState();
  
  const [formData, setFormData] = useState<{
    case_id: string;
    date: string;
    start_time: string;
    court_id: string;
    judge_ids: string[];
    purpose: 'PH' | 'mention' | 'final' | 'other';
    notes: string;
  }>({
    case_id: hearing?.case_id || '',
    date: hearing?.date || new Date().toISOString().split('T')[0],
    start_time: hearing?.start_time || '10:00',
    court_id: hearing?.court_id || '',
    judge_ids: hearing?.judge_ids || [],
    purpose: hearing?.purpose || 'mention',
    notes: hearing?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      date: new Date(formData.date),
      end_time: formData.start_time, // Simple fallback
    };
    
    await onSubmit(submitData);
  };

  const disabled = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      <FieldTooltipWrapper
        formId="hearing-form"
        fieldId="case_id"
        label="Case"
        required
      >
        <Select 
          value={formData.case_id} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, case_id: value }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select case" />
          </SelectTrigger>
          <SelectContent>
            {state.cases.map(case_ => (
              <SelectItem key={case_.id} value={case_.id}>
                {case_.caseNumber} - {case_.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldTooltipWrapper>

      <div className="grid grid-cols-2 gap-4">
        <FieldTooltipWrapper
          formId="hearing-form"
          fieldId="date"
          label="Date"
          required
        >
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            disabled={disabled}
          />
        </FieldTooltipWrapper>
        
        <FieldTooltipWrapper
          formId="hearing-form"
          fieldId="start_time"
          label="Time"
          required
        >
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            disabled={disabled}
          />
        </FieldTooltipWrapper>
      </div>

      <FieldTooltipWrapper
        formId="hearing-form"
        fieldId="court_id"
        label="Legal Forum"
        required
      >
        <Select 
          value={formData.court_id} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, court_id: value }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Legal Forum" />
          </SelectTrigger>
          <SelectContent>
            {state.courts.map(court => (
              <SelectItem key={court.id} value={court.id}>
                {court.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldTooltipWrapper>

      <FieldTooltipWrapper
        formId="hearing-form"
        fieldId="judge_ids"
        label="Judge"
      >
        <Select 
          value={formData.judge_ids[0] || ''} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, judge_ids: [value] }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select judge" />
          </SelectTrigger>
          <SelectContent>
            {state.judges.map(judge => (
              <SelectItem key={judge.id} value={judge.id}>
                {judge.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldTooltipWrapper>

      <FieldTooltipWrapper
        formId="hearing-form"
        fieldId="purpose"
        label="Purpose"
        required
      >
        <Select 
          value={formData.purpose} 
          onValueChange={(value: 'PH' | 'mention' | 'final' | 'other') => setFormData(prev => ({ ...prev, purpose: value }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mention">Mention</SelectItem>
            <SelectItem value="final">Final Hearing</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </FieldTooltipWrapper>

      <FieldTooltipWrapper
        formId="hearing-form"
        fieldId="notes"
        label="Notes"
      >
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          disabled={disabled}
          rows={3}
        />
      </FieldTooltipWrapper>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {mode === 'view' ? 'Close' : 'Cancel'}
        </Button>
        {mode !== 'view' && (
          <Button type="submit">
            {mode === 'create' ? 'Schedule Hearing' : 'Update Hearing'}
          </Button>
        )}
      </div>

    </form>
  );
};