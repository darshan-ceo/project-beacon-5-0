import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  judge?: Judge | null;
  mode: 'create' | 'edit' | 'view';
}

export const JudgeModal: React.FC<JudgeModalProps> = ({ isOpen, onClose, judge: judgeData, mode }) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<{
    name: string;
    designation: string;
    court: string;
    appointmentDate: Date;
    specialization: string[];
    retirementDate: Date;
    status: 'Active' | 'On Leave' | 'Retired';
    chambers: string;
    phone: string;
    email: string;
  }>({
    name: '',
    designation: '',
    court: '',
    appointmentDate: new Date(),
    specialization: [],
    retirementDate: new Date(),
    status: 'Active',
    chambers: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (judgeData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: judgeData.name,
        designation: judgeData.designation,
        court: judgeData.courtId,
        appointmentDate: new Date(judgeData.appointmentDate),
        specialization: judgeData.specialization,
        retirementDate: new Date(judgeData.retirementDate),
        status: judgeData.status,
        chambers: judgeData.contactInfo.chambers,
        phone: judgeData.contactInfo.phone || '',
        email: judgeData.contactInfo.email || ''
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        designation: '',
        court: '',
        appointmentDate: new Date(),
        specialization: [],
        retirementDate: new Date(),
        status: 'Active',
        chambers: '',
        phone: '',
        email: ''
      });
    }
  }, [judgeData, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      const newJudge: Judge = {
        id: Date.now().toString(),
        name: formData.name,
        designation: formData.designation,
        courtId: formData.court,
        appointmentDate: formData.appointmentDate.toISOString().split('T')[0],
        specialization: formData.specialization,
        totalCases: 0,
        avgDisposalTime: '6 months',
        retirementDate: formData.retirementDate.toISOString().split('T')[0],
        status: formData.status,
        contactInfo: {
          chambers: formData.chambers,
          phone: formData.phone,
          email: formData.email
        }
      };

      dispatch({ type: 'ADD_JUDGE', payload: newJudge });
      toast({
        title: "Judge Added",
        description: `Judge "${formData.name}" has been added successfully.`,
      });
    } else if (mode === 'edit' && judgeData) {
      const updatedJudge: Judge = {
        ...judgeData,
        name: formData.name,
        designation: formData.designation,
        courtId: formData.court,
        appointmentDate: formData.appointmentDate.toISOString().split('T')[0],
        specialization: formData.specialization,
        retirementDate: formData.retirementDate.toISOString().split('T')[0],
        status: formData.status,
        contactInfo: {
          chambers: formData.chambers,
          phone: formData.phone,
          email: formData.email
        }
      };

      dispatch({ type: 'UPDATE_JUDGE', payload: updatedJudge });
      toast({
        title: "Judge Updated",
        description: `Judge "${formData.name}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (judgeData) {
      dispatch({ type: 'DELETE_JUDGE', payload: judgeData.id });
      toast({
        title: "Judge Deleted",
        description: `Judge "${judgeData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  const handleSpecializationChange = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(specialization)
        ? prev.specialization.filter(s => s !== specialization)
        : [...prev.specialization, specialization]
    }));
  };

  const specializationOptions = [
    'Tax Law', 'Corporate Law', 'Civil Law', 'Criminal Law', 'Constitutional Law',
    'Commercial Law', 'Property Law', 'Family Law', 'Labour Law', 'Environmental Law'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Add New Judge'}
            {mode === 'edit' && 'Edit Judge'}
            {mode === 'view' && 'Judge Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Judge Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Select 
                value={formData.designation} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chief Justice">Chief Justice</SelectItem>
                  <SelectItem value="Justice">Justice</SelectItem>
                  <SelectItem value="Additional Judge">Additional Judge</SelectItem>
                  <SelectItem value="Judicial Member">Judicial Member</SelectItem>
                  <SelectItem value="Technical Member">Technical Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="court">Court</Label>
            <Select 
              value={formData.court} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, court: value }))}
              disabled={mode === 'view'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select court" />
              </SelectTrigger>
              <SelectContent>
                {state.courts.map((court) => (
                  <SelectItem key={court.id} value={court.name}>
                    {court.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Appointment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.appointmentDate && "text-muted-foreground"
                    )}
                    disabled={mode === 'view'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.appointmentDate ? format(formData.appointmentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.appointmentDate}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, appointmentDate: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Retirement Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.retirementDate && "text-muted-foreground"
                    )}
                    disabled={mode === 'view'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.retirementDate ? format(formData.retirementDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.retirementDate}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, retirementDate: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              disabled={mode === 'view'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Specialization</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {specializationOptions.map((spec) => (
                <div key={spec} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={spec}
                    checked={formData.specialization.includes(spec)}
                    onChange={() => handleSpecializationChange(spec)}
                    disabled={mode === 'view'}
                    className="rounded"
                  />
                  <Label htmlFor={spec} className="text-sm">{spec}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="chambers">Chambers</Label>
            <Input
              id="chambers"
              value={formData.chambers}
              onChange={(e) => setFormData(prev => ({ ...prev, chambers: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={mode === 'view'}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Judge
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit">
                {mode === 'create' ? 'Add Judge' : 'Update Judge'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};