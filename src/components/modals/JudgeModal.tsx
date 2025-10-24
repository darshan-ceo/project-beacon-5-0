import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { Separator } from '@/components/ui/separator';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  judge?: Judge | null;
  mode: 'create' | 'edit' | 'view';
}

import { JudgeForm } from '@/components/masters/judges/JudgeForm';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  judge?: Judge | null;
  mode: 'create' | 'edit' | 'view';
}

export const JudgeModal: React.FC<JudgeModalProps> = ({ isOpen, onClose, judge: judgeData, mode }) => {
  const { dispatch } = useAppState();

  const handleSubmit = async (formData: any) => {
    try {
      if (mode === 'create') {
        const newJudge: Judge = {
          id: Date.now().toString(),
          name: formData.name,
          designation: formData.designation,
          status: formData.status,
          courtId: formData.courtId,
          bench: formData.bench,
          jurisdiction: formData.jurisdiction,
          city: formData.city,
          state: formData.state,
          appointmentDate: formData.appointmentDate?.toISOString().split('T')[0] || '',
          retirementDate: formData.retirementDate?.toISOString().split('T')[0],
          yearsOfService: formData.appointmentDate ? 
            Math.floor((new Date().getTime() - formData.appointmentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
          specialization: formData.specializations || [],
          chambers: formData.chambers,
          email: formData.email,
          phone: formData.phone,
          assistant: formData.assistant,
          address: formData.address,
          availability: formData.availability,
          tags: formData.tags,
          notes: formData.notes,
          // Phase 1 fields
          memberType: formData.memberType,
          authorityLevel: formData.authorityLevel,
          qualifications: formData.qualifications,
          tenureDetails: formData.tenureDetails ? {
            tenureStartDate: formData.tenureDetails.tenureStartDate?.toISOString().split('T')[0],
            tenureEndDate: formData.tenureDetails.tenureEndDate?.toISOString().split('T')[0],
            maxTenureYears: formData.tenureDetails.maxTenureYears,
            extensionGranted: formData.tenureDetails.extensionGranted,
            ageLimit: formData.tenureDetails.ageLimit
          } : undefined,
          // Legacy fields
          totalCases: 0,
          avgDisposalTime: '0 days',
          contactInfo: {
            chambers: formData.chambers || '',
            phone: formData.phone,
            email: formData.email
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
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
          status: formData.status,
          courtId: formData.courtId,
          bench: formData.bench,
          jurisdiction: formData.jurisdiction,
          city: formData.city,
          state: formData.state,
          appointmentDate: formData.appointmentDate?.toISOString().split('T')[0] || judgeData.appointmentDate,
          retirementDate: formData.retirementDate?.toISOString().split('T')[0],
          yearsOfService: formData.appointmentDate ? 
            Math.floor((new Date().getTime() - formData.appointmentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : judgeData.yearsOfService,
          specialization: formData.specializations || [],
          chambers: formData.chambers,
          email: formData.email,
          phone: formData.phone,
          assistant: formData.assistant,
          address: formData.address,
          availability: formData.availability,
          tags: formData.tags,
          notes: formData.notes,
          // Phase 1 fields
          memberType: formData.memberType,
          authorityLevel: formData.authorityLevel,
          qualifications: formData.qualifications,
          tenureDetails: formData.tenureDetails ? {
            tenureStartDate: formData.tenureDetails.tenureStartDate?.toISOString().split('T')[0],
            tenureEndDate: formData.tenureDetails.tenureEndDate?.toISOString().split('T')[0],
            maxTenureYears: formData.tenureDetails.maxTenureYears,
            extensionGranted: formData.tenureDetails.extensionGranted,
            ageLimit: formData.tenureDetails.ageLimit
          } : undefined,
          contactInfo: {
            chambers: formData.chambers || '',
            phone: formData.phone,
            email: formData.email
          },
          updatedAt: new Date().toISOString(),
          updatedBy: 'system'
        };

        dispatch({ type: 'UPDATE_JUDGE', payload: updatedJudge });
        toast({
          title: "Judge Updated",
          description: `Judge "${formData.name}" has been updated successfully.`,
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save judge. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Add New Judge'}
            {mode === 'edit' && 'Edit Judge'}
            {mode === 'view' && 'Judge Details'}
          </DialogTitle>
        </DialogHeader>

        <JudgeForm
          initialData={judgeData}
          onSubmit={handleSubmit}
          onCancel={onClose}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
};