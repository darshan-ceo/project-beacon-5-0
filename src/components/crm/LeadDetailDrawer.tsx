/**
 * LeadDetailDrawer
 * Comprehensive slide-over for viewing lead details and activities
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  User,
  Mail,
  Phone,
  Building2,
  Target,
  Calendar,
  IndianRupee,
  TrendingUp,
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

const getScoreBadge = (score: number): { label: string; className: string } => {
  if (score >= 80) return { label: 'Hot', className: 'bg-green-100 text-green-700' };
  if (score >= 50) return { label: 'Warm', className: 'bg-amber-100 text-amber-700' };
  if (score >= 25) return { label: 'Cool', className: 'bg-blue-100 text-blue-700' };
  return { label: 'Cold', className: 'bg-gray-100 text-gray-700' };
};

const formatCurrency = (value: number | null): string => {
  if (!value) return '—';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

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

  const scoreBadge = getScoreBadge(currentLead.lead_score);
  const sourceLabel = LEAD_SOURCE_OPTIONS.find((s) => s.value === currentLead.lead_source)?.label || currentLead.lead_source;
  const statusConfig = currentLead.lead_status ? LEAD_STATUS_CONFIG[currentLead.lead_status] : null;

  const canConvert = currentLead.lead_status !== 'won' && currentLead.lead_status !== 'lost' && !currentLead.client_id;

  const handleStatusChange = (status: LeadStatus) => {
    if (status === 'lost') {
      setPendingLostStatus(status);
      setIsLostDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ status });
    }
  };

  const handleMarkAsLost = () => {
    setPendingLostStatus('lost');
    setIsLostDialogOpen(true);
  };

  const handleLostConfirm = (reason: string) => {
    if (pendingLostStatus) {
      updateStatusMutation.mutate({ status: pendingLostStatus, notes: reason || undefined });
    }
  };

  const footer = (
    <div className="flex items-center justify-between px-6 py-4">
      {currentLead.lead_status !== 'lost' && currentLead.lead_status !== 'won' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsLost}
          className="text-destructive hover:text-destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Mark as Lost
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
        description={currentLead.designation || 'Lead Details'}
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

                {/* Lead Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{sourceLabel || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{currentLead.lead_score}</span>
                      <Badge variant="secondary" className={cn('text-xs', scoreBadge.className)}>
                        {scoreBadge.label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected Value</p>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatCurrency(currentLead.expected_value)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected Close</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {currentLead.expected_close_date
                          ? format(new Date(currentLead.expected_close_date), 'MMM d, yyyy')
                          : '—'}
                      </span>
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

                {/* Lost Reason */}
                {currentLead.lead_status === 'lost' && currentLead.lost_reason && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-destructive mb-1">Lost Reason</p>
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
                    Edit Lead
                  </Button>
                  {canConvert && (
                    <Button
                      size="sm"
                      onClick={() => onConvert(currentLead)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Convert to Client
                    </Button>
                  )}
                  {currentLead.lead_status === 'won' && currentLead.client_id && (
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

      {/* Edit Lead Modal */}
      <EditLeadModal
        lead={currentLead}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={onRefresh}
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
