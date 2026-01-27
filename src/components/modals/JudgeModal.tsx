import React, { useState, useEffect } from 'react';
import { Scale, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { JudgeForm } from '@/components/masters/judges/JudgeForm';
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { FormStickyFooter } from '@/components/ui/form-sticky-footer';

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

  const handleFormSubmit = async (formData: any) => {
    setIsSaving(true);
    try {
      const { judgesService } = await import('@/services/judgesService');
      
      // Helper to format Date to YYYY-MM-DD string
      const formatDate = (date: Date | null | undefined): string | undefined => {
        if (!date) return undefined;
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
      };
      
      if (mode === 'create') {
        const judgePayload = {
          name: formData.name,
          designation: formData.designation,
          status: formData.status,
          courtId: formData.courtId,
          appointmentDate: formatDate(formData.appointmentDate),
          phone: formData.phone,
          email: formData.email,
          bench: formData.bench,
          jurisdiction: formData.jurisdiction,
          city: formData.city,
          state: formData.state,
          photoUrl: formData.photoUrl,
          retirementDate: formatDate(formData.retirementDate),
          specialization: formData.specializations,
          chambers: formData.chambers,
          assistant: formData.assistant,
          address: formData.address,
          availability: formData.availability,
          tags: formData.tags,
          notes: formData.notes,
          memberType: formData.memberType,
          authorityLevel: formData.authorityLevel,
          qualifications: formData.qualifications,
          tenureDetails: formData.tenureDetails ? {
            ...formData.tenureDetails,
            tenureStartDate: formatDate(formData.tenureDetails.tenureStartDate),
            tenureEndDate: formatDate(formData.tenureDetails.tenureEndDate),
          } : undefined,
        };

        await judgesService.create(judgePayload, rawDispatch);
      } else if (mode === 'edit' && judgeData) {
        // Prepare complete update payload including all Phase 1 fields
        const updatePayload = {
          name: formData.name,
          designation: formData.designation,
          status: formData.status,
          courtId: formData.courtId,
          appointmentDate: formatDate(formData.appointmentDate),
          phone: formData.phone,
          email: formData.email,
          bench: formData.bench,
          jurisdiction: formData.jurisdiction,
          city: formData.city,
          state: formData.state,
          photoUrl: formData.photoUrl,
          retirementDate: formatDate(formData.retirementDate),
          specialization: formData.specializations,
          chambers: formData.chambers,
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
            ...formData.tenureDetails,
            tenureStartDate: formatDate(formData.tenureDetails.tenureStartDate),
            tenureEndDate: formatDate(formData.tenureDetails.tenureEndDate),
          } : undefined,
        };
        
        await judgesService.update(judgeData.id, updatePayload, dispatch, currentUserId || undefined);
      }

      onClose();
    } catch (error: any) {
      console.error('Judge operation failed:', error);
      toast({
        title: 'Error Saving Judge',
        description: error?.message || 'Failed to save judge. Please try again.',
        variant: 'destructive'
      });
      setIsSaving(false);
    }
  };

  // RBAC permission checks
  const { hasPermission } = useAdvancedRBAC();
  const canDeleteJudges = hasPermission('judges', 'delete');

  const handleDelete = async () => {
    if (judgeData) {
      // RBAC permission check
      if (!canDeleteJudges) {
        toast({
          title: 'Permission Denied',
          description: "You don't have permission to delete judges.",
          variant: 'destructive',
        });
        return;
      }
      
      setIsDeleting(true);
      try {
        const { judgesService } = await import('@/services/judgesService');
        await judgesService.delete(judgeData.id, dispatch);
        onClose();
      } catch (error: any) {
        console.error('Judge deletion failed:', error);
        toast({
          title: 'Error Deleting Judge',
          description: error?.message || 'Failed to delete judge.',
          variant: 'destructive'
        });
        setIsDeleting(false);
      }
    }
  };

  // Generate dynamic title
  const getTitle = () => {
    if (mode === 'create') return 'Add New Judge';
    if (mode === 'edit') return 'Edit Judge';
    return 'Judge Details';
  };

  // Footer with action buttons
  const footer = (
    <FormStickyFooter
      mode={mode}
      onCancel={onClose}
      onPrimaryAction={mode !== 'view' ? () => {
        const form = document.getElementById('judge-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      } : undefined}
      onDelete={handleDelete}
      primaryLabel={mode === 'create' ? 'Create Judge' : 'Update Judge'}
      isPrimaryLoading={isSaving}
      isDeleteLoading={isDeleting}
      showDelete={mode === 'edit' && canDeleteJudges}
    />
  );

  return (
    <AdaptiveFormShell
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      icon={<Scale className="h-5 w-5" />}
      complexity="complex"
      footer={footer}
      dataTour="judge-modal"
    >
      <JudgeForm
        initialData={judgeData}
        onSubmit={handleFormSubmit}
        onCancel={onClose}
        mode={mode}
      />
    </AdaptiveFormShell>
  );
};
