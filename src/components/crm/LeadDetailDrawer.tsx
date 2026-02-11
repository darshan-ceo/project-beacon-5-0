/**
 * LeadDetailDrawer (Inquiry Detail Drawer)
 * Comprehensive slide-over for viewing inquiry details and activities
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  Building2,
  Target,
  Calendar,
  Plus,
  Edit,
  UserCheck,
  XCircle,
  Loader2,
} from 'lucide-react';
import { LargeSlideOver } from '@/components/ui/large-slide-over';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { leadService } from '@/services/leadService';
import { Lead, LeadStatus, LEAD_STATUS_CONFIG, LEAD_SOURCE_OPTIONS } from '@/types/lead';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { AddActivityModal } from './AddActivityModal';
import { EditLeadModal } from './EditLeadModal';
import { MarkAsLostDialog } from './MarkAsLostDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (lead: Lead) => void;
  onRefresh?: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onConvert,
  onRefresh,
}) => {
  const queryClient = useQueryClient();
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [pendingLostStatus, setPendingLostStatus] = useState<LeadStatus | null>(null);

  // Refetch lead data when drawer opens
  const { data: leadResponse, isLoading } = useQuery({
    queryKey: ['lead', lead?.id],
    queryFn: () => leadService.getLead(lead!.id),
    enabled: !!lead?.id && isOpen,
  });

  const currentLead = leadResponse?.data || lead;

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: LeadStatus; notes?: string }) =>
      leadService.updateLeadStatus(currentLead!.id, status, notes),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Status updated');
        queryClient.invalidateQueries({ queryKey: ['lead', currentLead?.id] });
        queryClient.invalidateQueries({ queryKey: ['lead-activities', currentLead?.id] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
        setIsLostDialogOpen(false);
        setPendingLostStatus(null);
        onRefresh?.();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    },
  });

  if (!currentLead) return null;

  const primaryEmail = currentLead.emails?.find((e) => e.isPrimary)?.email || currentLead.emails?.[0]?.email;
  const primaryPhone = currentLead.phones?.find((p) => p.isPrimary);
  const phoneDisplay = primaryPhone
    ? `${primaryPhone.countryCode || ''}${primaryPhone.number}`
    : currentLead.phones?.[0]?.number;

  const sourceLabel = LEAD_SOURCE_OPTIONS.find((s) => s.value === currentLead.lead_source)?.label || currentLead.lead_source;
  const statusConfig = currentLead.lead_status ? LEAD_STATUS_CONFIG[currentLead.lead_status] : null;

  const canConvert = currentLead.lead_status !== 'converted' && currentLead.lead_status !== 'not_proceeding' && !currentLead.client_id;

  const handleStatusChange = (status: LeadStatus) => {
    if (status === 'not_proceeding') {
      setPendingLostStatus(status);
      setIsLostDialogOpen(true);
    } else if (status === 'converted') {
      // Intercept "converted" - require proper onboarding via modal
      onConvert(currentLead);
    } else {
      updateStatusMutation.mutate({ status });
    }
  };

  const handleMarkAsNotProceeding = () => {
    setPendingLostStatus('not_proceeding');
    setIsLostDialogOpen(true);
  };

  const handleLostConfirm = (reason: string) => {
    if (pendingLostStatus) {
      updateStatusMutation.mutate({ status: pendingLostStatus, notes: reason || undefined });
    }
  };

  const footer = (
    <div className="flex items-center justify-between px-6 py-4">
      {currentLead.lead_status !== 'not_proceeding' && currentLead.lead_status !== 'converted' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsNotProceeding}
          className="text-destructive hover:text-destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Mark as Not Proceeding
        </Button>
      ) : (
        <div />
      )}
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <>
      <LargeSlideOver
        isOpen={isOpen}
        onOpenChange={onClose}
        title={currentLead.name}
        description={currentLead.designation || 'Inquiry Details'}
        icon={<User className="h-5 w-5" />}
        footer={footer}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {primaryEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${primaryEmail}`} className="text-primary hover:underline">
                        {primaryEmail}
                      </a>
                    </div>
                  )}
                  {phoneDisplay && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${phoneDisplay}`} className="text-primary hover:underline">
                        {phoneDisplay}
                      </a>
                    </div>
                  )}
                </div>

                {/* Inquiry Metadata - Simplified for legal context */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{sourceLabel || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inquiry Type</p>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{currentLead.designation || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {currentLead.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{currentLead.notes}</p>
                  </div>
                )}

                {/* Not Proceeding Reason */}
                {currentLead.lead_status === 'not_proceeding' && currentLead.lost_reason && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-destructive mb-1">Reason</p>
                    <p className="text-sm text-destructive">{currentLead.lost_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status & Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Status & Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Quick Change */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Current Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((status) => {
                      const config = LEAD_STATUS_CONFIG[status];
                      const isActive = currentLead.lead_status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={updateStatusMutation.isPending}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                            isActive
                              ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          )}
                        >
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsActivityModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Activity
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Inquiry
                  </Button>
                  {canConvert && (
                    <Button
                      size="sm"
                      onClick={() => onConvert(currentLead)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Onboard as Client
                    </Button>
                  )}
                  {currentLead.lead_status === 'converted' && currentLead.client_id && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Converted
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Activity Timeline
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsActivityModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <LeadActivityTimeline contactId={currentLead.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </LargeSlideOver>

      {/* Add Activity Modal */}
      <AddActivityModal
        contactId={currentLead.id}
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />

      {/* Edit Lead Modal - rendered outside drawer to avoid nested dialog conflicts */}
      <EditLeadModal
        lead={currentLead}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          onRefresh?.();
          setIsEditModalOpen(false);
        }}
      />

      {/* Mark as Lost Dialog */}
      <MarkAsLostDialog
        isOpen={isLostDialogOpen}
        onClose={() => {
          setIsLostDialogOpen(false);
          setPendingLostStatus(null);
        }}
        onConfirm={handleLostConfirm}
        isSubmitting={updateStatusMutation.isPending}
        leadName={currentLead.name}
      />
    </>
  );
};

export default LeadDetailDrawer;
