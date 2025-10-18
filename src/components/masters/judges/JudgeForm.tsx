import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, MapPin, User, Phone, Mail, Tag, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { AddressForm } from '@/components/ui/AddressForm';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { EnhancedAddressData } from '@/services/addressMasterService';
import { specializationsService } from '@/services/specializationsService';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TagInput } from '@/components/ui/TagInput';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface JudgeFormData {
  name: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Retired' | 'Transferred' | 'Deceased';
  courtId: string;
  bench?: string;
  jurisdiction?: string;
  city?: string;
  state?: string;
  appointmentDate: Date | null;
  retirementDate: Date | null;
  specializations: string[];
  chambers?: string;
  email?: string;
  phone?: string;
  assistant?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address?: EnhancedAddressData;
  availability?: {
    days?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
    startTime?: string;
    endTime?: string;
    notes?: string;
  };
  tags?: string[];
  notes?: string;
}

interface JudgeFormProps {
  initialData?: Judge | null;
  onSubmit: (data: JudgeFormData) => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

const DESIGNATION_OPTIONS = [
  'Chief Justice',
  'Justice',
  'Additional Judge',
  'Judicial Member',
  'Technical Member',
  'Vice President',
  'Member',
  'Presiding Officer'
];

const STATUS_OPTIONS = [
  'Active',
  'On Leave', 
  'Retired',
  'Transferred',
  'Deceased'
];

const DAY_OPTIONS = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' }
];

export const JudgeForm: React.FC<JudgeFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  mode,
  isLoading = false
}) => {
  const { state } = useAppState();
  const [formData, setFormData] = useState<JudgeFormData>({
    name: '',
    designation: '',
    status: 'Active',
    courtId: '',
    appointmentDate: null,
    retirementDate: null,
    specializations: [],
    assistant: {},
    availability: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '09:00',
      endTime: '17:00'
    },
    tags: []
  });

  const [availableSpecializations, setAvailableSpecializations] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<any>(null);

  useEffect(() => {
    loadSpecializations();
    if (initialData) {
      populateFormFromJudge(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (formData.courtId) {
      const court = state.courts.find(c => c.id === formData.courtId);
      setSelectedCourt(court);
      if (court) {
        // Auto-populate city/state from court if not already set
        if (!formData.city && court.address) {
          const address = typeof court.address === 'string' ? null : court.address;
          setFormData(prev => ({
            ...prev, 
            city: address?.city || '',
            state: address?.state || ''
          }));
        }
      }
    }
  }, [formData.courtId, state.courts]);

  const loadSpecializations = async () => {
    try {
      const specializations = await specializationsService.getEnabledSpecializations();
      setAvailableSpecializations(specializations);
    } catch (error) {
      console.error('Failed to load specializations:', error);
      // Fallback to default specializations
      setAvailableSpecializations([
        'GST/Indirect Tax',
        'Customs',
        'Excise',
        'Constitutional/Writs',
        'Corporate/Commercial',
        'Civil',
        'Criminal',
        'Labour',
        'Environmental',
        'Family',
        'Property'
      ]);
    }
  };

  const populateFormFromJudge = (judge: Judge) => {
    setFormData({
      name: judge.name,
      designation: judge.designation,
      status: judge.status,
      courtId: judge.courtId,
      bench: (judge as any).bench,
      jurisdiction: (judge as any).jurisdiction,
      city: (judge as any).city,
      state: (judge as any).state,
      appointmentDate: judge.appointmentDate ? new Date(judge.appointmentDate) : null,
      retirementDate: judge.retirementDate ? new Date(judge.retirementDate) : null,
      specializations: judge.specialization || [],
      chambers: judge.contactInfo?.chambers,
      email: judge.contactInfo?.email,
      phone: judge.contactInfo?.phone,
      assistant: (judge as any).assistant || {},
      address: (judge as any).address,
      availability: (judge as any).availability || {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '09:00',
        endTime: '17:00'
      },
      tags: (judge as any).tags || [],
      notes: (judge as any).notes
    });
  };

  const calculateYearsOfService = () => {
    if (!formData.appointmentDate) return 0;
    const now = new Date();
    const appointment = formData.appointmentDate;
    return Math.floor((now.getTime() - appointment.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: prev.availability?.days?.includes(day as any)
          ? prev.availability.days.filter(d => d !== day)
          : [...(prev.availability?.days || []), day as any]
      }
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Judge name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.courtId) {
      toast({
        title: "Validation Error", 
        description: "Court assignment is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.designation) {
      toast({
        title: "Validation Error",
        description: "Designation is required", 
        variant: "destructive"
      });
      return;
    }

    if (formData.appointmentDate && formData.retirementDate && 
        formData.appointmentDate >= formData.retirementDate) {
      toast({
        title: "Validation Error",
        description: "Retirement date must be after appointment date",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Judge Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isReadOnly}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
                Photo upload functionality (to be implemented)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Court Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Court Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="court">Legal Forum *</Label>
              <Select 
                value={formData.courtId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, courtId: value }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Legal Forum" />
                </SelectTrigger>
                <SelectContent>
                  {state.courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bench">Bench/Courtroom</Label>
              <Input
                id="bench"
                value={formData.bench || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bench: e.target.value }))}
                disabled={isReadOnly}
                placeholder="e.g., Bench A, Court Room 3"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                disabled={isReadOnly}
                placeholder="e.g., Delhi, Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                disabled={isReadOnly}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                disabled={isReadOnly}
                placeholder="State"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Designation & Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Designation & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Select 
                value={formData.designation} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATION_OPTIONS.map((designation) => (
                    <SelectItem key={designation} value={designation}>
                      {designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Appointment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.appointmentDate && "text-muted-foreground"
                    )}
                    disabled={isReadOnly}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.appointmentDate ? format(formData.appointmentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.appointmentDate || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, appointmentDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Retirement Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.retirementDate && "text-muted-foreground"
                    )}
                    disabled={isReadOnly}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.retirementDate ? format(formData.retirementDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.retirementDate || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, retirementDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Years of Service</Label>
            <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground">
              {calculateYearsOfService()} years (computed)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialization Section */}
      <Card>
        <CardHeader>
          <CardTitle>Specialization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableSpecializations.map((specialization) => (
              <div key={specialization} className="flex items-center space-x-2">
                <Checkbox
                  id={specialization}
                  checked={formData.specializations.includes(specialization)}
                  onCheckedChange={() => handleSpecializationToggle(specialization)}
                  disabled={isReadOnly}
                />
                <Label 
                  htmlFor={specialization} 
                  className={cn(
                    "text-sm",
                    specialization === 'GST/Indirect Tax' && "font-semibold text-primary"
                  )}
                >
                  {specialization}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isReadOnly}
                placeholder="judge@court.gov.in"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isReadOnly}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chambers">Chambers</Label>
            <Input
              id="chambers"
              value={formData.chambers || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, chambers: e.target.value }))}
              disabled={isReadOnly}
              placeholder="Chamber location/number"
            />
          </div>

          <Separator />
          
          <div className="space-y-4">
            <Label className="text-sm font-medium">Assistant/Court Officer</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assistant-name">Name</Label>
                <Input
                  id="assistant-name"
                  value={formData.assistant?.name || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    assistant: { ...prev.assistant, name: e.target.value }
                  }))}
                  disabled={isReadOnly}
                  placeholder="Assistant name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-email">Email</Label>
                <Input
                  id="assistant-email"
                  type="email"
                  value={formData.assistant?.email || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    assistant: { ...prev.assistant, email: e.target.value }
                  }))}
                  disabled={isReadOnly}
                  placeholder="assistant@court.gov.in"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-phone">Phone</Label>
                <Input
                  id="assistant-phone"
                  value={formData.assistant?.phone || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    assistant: { ...prev.assistant, phone: e.target.value }
                  }))}
                  disabled={isReadOnly}
                  placeholder="+91 98765 43211"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm
            value={formData.address || {
              line1: '',
              line2: '',
              locality: '',
              district: '',
              cityId: '',
              stateId: '',
              pincode: '',
              countryId: 'IN',
              source: 'manual'
            }}
            onChange={(address) => setFormData(prev => ({ ...prev, address }))}
            disabled={isReadOnly}
            module="judge"
          />
        </CardContent>
      </Card>

      {/* Availability Section */}
      <Card>
        <CardHeader>
          <CardTitle>Availability (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-3">
              {DAY_OPTIONS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={formData.availability?.days?.includes(day.value as any) || false}
                    onCheckedChange={() => handleDayToggle(day.value)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor={day.value} className="text-sm">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={formData.availability?.startTime || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, startTime: e.target.value }
                }))}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={formData.availability?.endTime || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, endTime: e.target.value }
                }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability-notes">Notes</Label>
            <Textarea
              id="availability-notes"
              value={formData.availability?.notes || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                availability: { ...prev.availability, notes: e.target.value }
              }))}
              disabled={isReadOnly}
              placeholder="Special availability notes, holiday schedules, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metadata Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md">
              {formData.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  {!isReadOnly && (
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  )}
                </Badge>
              ))}
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="w-24 h-6 text-xs"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleAddTag}
                    className="h-6 px-2"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={isReadOnly}
              placeholder="Additional notes about the judge..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Read-only metadata for edit mode */}
      {mode === 'edit' && initialData && (
        <Card>
          <CardHeader>
            <CardTitle>Record Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Created: {initialData.createdAt ? format(new Date(initialData.createdAt), 'PPp') : 'Unknown'}</div>
            <div>Updated: {initialData.updatedAt ? format(new Date(initialData.updatedAt), 'PPp') : 'Unknown'}</div>
            <div>Created by: {(initialData as any).createdBy || 'Unknown'}</div>
            <div>Updated by: {(initialData as any).updatedBy || 'Unknown'}</div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {mode === 'view' ? 'Close' : 'Cancel'}
        </Button>
        {mode !== 'view' && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Add Judge' : 'Update Judge'}
          </Button>
        )}
      </div>
    </form>
  );
};