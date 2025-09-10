import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { HearingForm } from '@/components/hearings/HearingForm';
import { HearingFilters, HearingFiltersState } from '@/components/hearings/HearingFilters';
import { HearingsList } from '@/components/hearings/HearingsList';
import { HearingsCalendar } from '@/components/hearings/HearingsCalendar';
import { hearingsService } from '@/services/hearingsService';
import { Hearing, HearingFormData } from '@/types/hearings';

export const HearingsPage: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('view') || 'list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [filteredHearings, setFilteredHearings] = useState<Hearing[]>([]);
  
  const [filters, setFilters] = useState<HearingFiltersState>({
    searchTerm: searchParams.get('search') || '',
    clientIds: searchParams.getAll('client') || [],
    caseIds: searchParams.getAll('case') || [],
    courtIds: searchParams.getAll('court') || [],
    judgeIds: searchParams.getAll('judge') || [],
    hearingTypes: searchParams.getAll('type') || [],
    statuses: searchParams.getAll('status') || [],
    internalCounselIds: searchParams.getAll('counsel') || [],
    tags: searchParams.getAll('tag') || [],
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (activeTab !== 'list') params.set('view', activeTab);
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    
    filters.clientIds.forEach(id => params.append('client', id));
    filters.caseIds.forEach(id => params.append('case', id));
    filters.courtIds.forEach(id => params.append('court', id));
    filters.judgeIds.forEach(id => params.append('judge', id));
    filters.hearingTypes.forEach(type => params.append('type', type));
    filters.statuses.forEach(status => params.append('status', status));
    filters.internalCounselIds.forEach(id => params.append('counsel', id));
    filters.tags.forEach(tag => params.append('tag', tag));
    
    setSearchParams(params);
  }, [filters, activeTab, setSearchParams]);

  // Filter hearings based on current filters
  useEffect(() => {
    let filtered = [...state.hearings];

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(hearing => {
        const case_ = state.cases.find(c => c.id === hearing.case_id);
        const court = state.courts.find(c => c.id === hearing.court_id);
        const judges = state.judges.filter(j => hearing.judge_ids.includes(j.id));
        
        return (
          case_?.caseNumber.toLowerCase().includes(term) ||
          case_?.title.toLowerCase().includes(term) ||
          court?.name.toLowerCase().includes(term) ||
          judges.some(j => j.name.toLowerCase().includes(term)) ||
          hearing.notes?.toLowerCase().includes(term) ||
          hearing.purpose.toLowerCase().includes(term)
        );
      });
    }

    // Client filter
    if (filters.clientIds.length > 0) {
      filtered = filtered.filter(hearing => {
        const case_ = state.cases.find(c => c.id === hearing.case_id);
        return case_ && filters.clientIds.includes(case_.clientId);
      });
    }

    // Case filter
    if (filters.caseIds.length > 0) {
      filtered = filtered.filter(hearing => 
        filters.caseIds.includes(hearing.case_id)
      );
    }

    // Court filter
    if (filters.courtIds.length > 0) {
      filtered = filtered.filter(hearing => 
        filters.courtIds.includes(hearing.court_id)
      );
    }

    // Judge filter
    if (filters.judgeIds.length > 0) {
      filtered = filtered.filter(hearing => 
        hearing.judge_ids.some(judgeId => filters.judgeIds.includes(judgeId))
      );
    }

    // Hearing type filter
    if (filters.hearingTypes.length > 0) {
      filtered = filtered.filter(hearing => 
        filters.hearingTypes.includes(hearing.purpose)
      );
    }

    // Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(hearing => 
        filters.statuses.includes(hearing.status)
      );
    }

    // Date range filter
    if (filters.dateRange?.from) {
      const fromDate = filters.dateRange.from.toISOString().split('T')[0];
      const toDate = filters.dateRange.to?.toISOString().split('T')[0] || fromDate;
      
      filtered = filtered.filter(hearing => 
        hearing.date >= fromDate && hearing.date <= toDate
      );
    }

    setFilteredHearings(filtered);
  }, [state.hearings, state.cases, state.courts, state.judges, filters]);

  const handleCreateHearing = (prefillData?: Partial<HearingFormData>) => {
    setSelectedHearing(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEditHearing = (hearing: Hearing) => {
    setSelectedHearing(hearing);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleViewHearing = (hearing: Hearing) => {
    setSelectedHearing(hearing);
    setFormMode('view');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (formMode === 'create') {
        // Calculate end time if not provided
        if (!data.end_time && data.start_time) {
          const [hours, minutes] = data.start_time.split(':').map(Number);
          const endDate = new Date();
          endDate.setHours(hours + 1, minutes);
          data.end_time = endDate.toTimeString().slice(0, 5);
        }

        const hearingFormData: HearingFormData = {
          case_id: data.case_id,
          date: data.date.toISOString().split('T')[0],
          start_time: data.start_time,
          end_time: data.end_time,
          timezone: 'Asia/Kolkata',
          court_id: data.court_id,
          courtroom: data.courtroom,
          judge_ids: data.judge_ids,
          purpose: data.purpose,
          notes: data.notes,
        };

        await hearingsService.createHearing(hearingFormData, dispatch);
        
      } else if (formMode === 'edit' && selectedHearing) {
        const updates = {
          court_id: data.court_id,
          courtroom: data.courtroom,
          judge_ids: data.judge_ids,
          date: data.date.toISOString().split('T')[0],
          start_time: data.start_time,
          end_time: data.end_time,
          purpose: data.purpose,
          notes: data.notes,
        };

        await hearingsService.updateHearing(selectedHearing.id, updates, dispatch);
      }

      setIsFormOpen(false);
      setSelectedHearing(null);
      
    } catch (error) {
      console.error('Error saving hearing:', error);
      // Error toast is handled by the service
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedHearing(null);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hearings</h1>
          <p className="text-muted-foreground">
            Manage court hearings and schedules
          </p>
        </div>
        
        <Button onClick={() => handleCreateHearing()}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Hearing
        </Button>
      </div>

      {/* Filters */}
      <HearingFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <HearingsList
            hearings={filteredHearings}
            onEdit={handleEditHearing}
            onView={handleViewHearing}
            onCreate={handleCreateHearing}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <HearingsCalendar
            hearings={filteredHearings}
            onEdit={handleEditHearing}
            onView={handleViewHearing}
            onCreate={handleCreateHearing}
          />
        </TabsContent>
      </Tabs>

      {/* Hearing Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' && 'Schedule New Hearing'}
              {formMode === 'edit' && 'Edit Hearing'}
              {formMode === 'view' && 'Hearing Details'}
            </DialogTitle>
          </DialogHeader>
          
          <HearingForm
            hearing={selectedHearing}
            mode={formMode}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
};