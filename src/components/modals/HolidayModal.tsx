import React, { useState, useEffect } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, CalendarDays } from 'lucide-react';
import { Holiday, HolidayFormData, HOLIDAY_TYPES } from '@/types/statutory';
import { holidayService } from '@/services/holidayService';
import { format, parseISO } from 'date-fns';

// Indian states
const INDIAN_STATES = [
  { value: 'ALL', label: 'All India (National)' },
  { value: 'AN', label: 'Andaman & Nicobar' },
  { value: 'AP', label: 'Andhra Pradesh' },
  { value: 'AR', label: 'Arunachal Pradesh' },
  { value: 'AS', label: 'Assam' },
  { value: 'BR', label: 'Bihar' },
  { value: 'CG', label: 'Chhattisgarh' },
  { value: 'CH', label: 'Chandigarh' },
  { value: 'DD', label: 'Daman & Diu' },
  { value: 'DL', label: 'Delhi' },
  { value: 'GA', label: 'Goa' },
  { value: 'GJ', label: 'Gujarat' },
  { value: 'HP', label: 'Himachal Pradesh' },
  { value: 'HR', label: 'Haryana' },
  { value: 'JH', label: 'Jharkhand' },
  { value: 'JK', label: 'Jammu & Kashmir' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'KL', label: 'Kerala' },
  { value: 'LA', label: 'Ladakh' },
  { value: 'MH', label: 'Maharashtra' },
  { value: 'ML', label: 'Meghalaya' },
  { value: 'MN', label: 'Manipur' },
  { value: 'MP', label: 'Madhya Pradesh' },
  { value: 'MZ', label: 'Mizoram' },
  { value: 'NL', label: 'Nagaland' },
  { value: 'OD', label: 'Odisha' },
  { value: 'PB', label: 'Punjab' },
  { value: 'PY', label: 'Puducherry' },
  { value: 'RJ', label: 'Rajasthan' },
  { value: 'SK', label: 'Sikkim' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'TS', label: 'Telangana' },
  { value: 'TR', label: 'Tripura' },
  { value: 'UK', label: 'Uttarakhand' },
  { value: 'UP', label: 'Uttar Pradesh' },
  { value: 'WB', label: 'West Bengal' }
];

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holiday: Holiday) => void;
  mode: 'add' | 'edit' | 'view';
  holiday: Holiday | null;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  holiday
}) => {
  const [formData, setFormData] = useState<HolidayFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    type: 'national',
    state: 'ALL',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (holiday && (mode === 'edit' || mode === 'view')) {
      setFormData({
        date: holiday.date.split('T')[0],
        name: holiday.name,
        type: holiday.type,
        state: holiday.state,
        isActive: holiday.isActive
      });
    } else {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        name: '',
        type: 'national',
        state: 'ALL',
        isActive: true
      });
    }
  }, [holiday, mode, isOpen]);

  const handleSubmit = async () => {
    if (mode === 'view') return;
    
    setIsSaving(true);
    try {
      let result: Holiday | null = null;
      
      if (mode === 'add') {
        result = await holidayService.create(formData);
      } else if (mode === 'edit' && holiday) {
        result = await holidayService.update(holiday.id, formData);
      }
      
      if (result) {
        onSave(result);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = mode === 'view';

  const title = mode === 'add' ? 'Add Holiday' : mode === 'edit' ? 'Edit Holiday' : 'View Holiday';

  // Auto-set state to ALL when type is national
  const handleTypeChange = (value: 'national' | 'state' | 'optional') => {
    setFormData(prev => ({ 
      ...prev, 
      type: value,
      state: value === 'national' ? 'ALL' : prev.state
    }));
  };

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      icon={<CalendarDays className="h-5 w-5" />}
      maxWidth="max-w-lg"
      footer={
        mode !== 'view' && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !formData.name || !formData.date}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'add' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            disabled={isReadOnly}
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Holiday Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Republic Day"
            disabled={isReadOnly}
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Holiday Type</Label>
          <Select
            value={formData.type}
            onValueChange={handleTypeChange}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State - only editable for non-national holidays */}
        <div className="space-y-2">
          <Label htmlFor="state">Applicable State</Label>
          <Select
            value={formData.state}
            onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
            disabled={isReadOnly || formData.type === 'national'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map(state => (
                <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.type === 'national' && (
            <p className="text-xs text-muted-foreground">National holidays apply to all states</p>
          )}
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            disabled={isReadOnly}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
