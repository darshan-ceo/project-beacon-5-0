/**
 * LeadsPage
 * Main CRM lead pipeline page with Kanban and table views
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Plus, LayoutGrid, List } from 'lucide-react';
import { leadService } from '@/services/leadService';
import { LeadFilters as LeadFiltersType, Lead, LeadStatus } from '@/types/lead';
import { LeadStats } from '@/components/crm/LeadStats';
import { LeadFilters } from '@/components/crm/LeadFilters';
import { LeadPipeline } from '@/components/crm/LeadPipeline';
import { LeadDetailDrawer } from '@/components/crm/LeadDetailDrawer';
import { ConvertToClientModal } from '@/components/crm/ConvertToClientModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ViewMode = 'pipeline' | 'table';

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [filters, setFilters] = useState<LeadFiltersType>({});
  
  // Drawer and modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Fetch leads
  const { data: leadsResponse, isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadService.getLeads(filters),
  });

  // Fetch pipeline stats
  const { data: statsResponse, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['lead-pipeline-stats'],
    queryFn: () => leadService.getPipelineStats(),
  });

  // Fetch team members for owner filter
  const { data: ownersData } = useQuery({
    queryKey: ['lead-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const owners = (ownersData || []).map((p: { id: string; full_name: string }) => ({
    id: p.id,
    name: p.full_name || 'Unknown',
  }));

  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) =>
      leadService.updateLeadStatus(leadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
      toast.success('Lead status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lead status');
    },
  });

  const handleRefresh = useCallback(() => {
    refetchLeads();
    refetchStats();
  }, [refetchLeads, refetchStats]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    await updateStatusMutation.mutateAsync({ leadId, status: newStatus });
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleConvertLead = (lead: Lead) => {
    setConvertingLead(lead);
    setIsConvertModalOpen(true);
  };

  const handleConversionSuccess = () => {
    refetchLeads();
    refetchStats();
    setIsConvertModalOpen(false);
    setIsDrawerOpen(false);
    setConvertingLead(null);
    setSelectedLead(null);
  };

  const handleNewLead = () => {
    // Navigate to contacts page to create a new contact and mark as lead
    toast.info('To create a new lead, add a contact and mark it as a lead');
  };

  const leads = leadsResponse?.data || [];
  const stats = statsResponse?.data || null;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and track lead progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="pipeline" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleNewLead} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Lead</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <LeadStats stats={stats} isLoading={isLoadingStats} />

      {/* Filters */}
      <LeadFilters filters={filters} onFiltersChange={setFilters} owners={owners} />

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <LeadPipeline
          leads={leads}
          isLoading={isLoadingLeads}
          onStatusChange={handleStatusChange}
          onViewLead={handleViewLead}
          onConvertLead={handleConvertLead}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Table view coming soon. Use the Pipeline view for now.
        </div>
      )}

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
        onConvert={handleConvertLead}
        onRefresh={handleRefresh}
      />

      {/* Convert to Client Modal */}
      <ConvertToClientModal
        lead={convertingLead}
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setConvertingLead(null);
        }}
        onSuccess={handleConversionSuccess}
      />
    </div>
  );
};

export default LeadsPage;
