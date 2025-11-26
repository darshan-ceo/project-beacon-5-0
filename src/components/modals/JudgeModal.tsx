import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

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
  const { dispatch, rawDispatch } = useAppState();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (formData: any) => {
    setIsSaving(true);
    try {
      const { judgesService } = await import('@/services/judgesService');
      
      if (mode === 'create') {
        const judgeData = {
          name: formData.name,
          designation: formData.designation,
          status: formData.status,
          courtId: formData.courtId,
          appointmentDate: formData.appointmentDate?.toISOString().split('T')[0] || '',
          phone: formData.phone,
          email: formData.email,
        };

        await judgesService.create(judgeData, rawDispatch);
      } else if (mode === 'edit' && judgeData) {
        await judgesService.update(judgeData.id, formData, dispatch);
      }

      onClose();
    } catch (error) {
      console.error('Judge operation failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (judgeData) {
      setIsDeleting(true);
      try {
        const { judgesService } = await import('@/services/judgesService');
        await judgesService.delete(judgeData.id, dispatch);
        onClose();
      } catch (error) {
        console.error('Judge deletion failed:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh] overflow-hidden border bg-background shadow-beacon-lg rounded-beacon-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {mode === 'create' && 'Add New Judge'}
            {mode === 'edit' && 'Edit Judge'}
            {mode === 'view' && 'Judge Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="px-6 py-4 overflow-y-auto flex-1">
          <JudgeForm
            initialData={judgeData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            mode={mode}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};