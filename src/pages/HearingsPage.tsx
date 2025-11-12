import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Calendar, List } from 'lucide-react';
import { formatDateForDisplay, formatTimeForDisplay } from '@/utils/dateFormatters';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { useAppState, Hearing } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { HearingModal } from '@/components/modals/HearingModal';
import { HearingFilters, HearingFiltersState } from '@/components/hearings/HearingFilters';
import { hearingsService } from '@/services/hearingsService';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';
import { CalendarSyncBadge } from '@/components/hearings/CalendarSyncBadge';
import { CalendarSyncStatsCard } from '@/components/hearings/CalendarSyncStatsCard';
import { CalendarSyncErrorModal } from '@/components/hearings/CalendarSyncErrorModal';
import { HearingsBulkActions } from '@/components/hearings/HearingsBulkActions';
import { HearingMetrics } from '@/components/hearings/HearingMetrics';
import { integrationsService } from '@/services/integrationsService';
import { calendarService } from '@/services/calendar/calendarService';


// Simplified Lists Component
const HearingsList: React.FC<{ 
  hearings: Hearing[]; 
  onEdit: (h: Hearing) => void; 
  onView: (h: Hearing) => void;
  highlightCaseId?: string | null;
  highlightDate?: string | null;
  highlightCourtId?: string | null;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  calendarProvider?: string;
}> = ({ hearings, onEdit, onView, highlightCaseId, highlightDate, highlightCourtId, selectedIds, onToggleSelection, calendarProvider }) => {
  const { state } = useAppState();
  
  // Auto-scroll to highlighted hearing when component mounts
  useEffect(() => {
    if (highlightCaseId && highlightDate && highlightCourtId) {
      setTimeout(() => {
        const highlightedElement = document.querySelector('[data-highlighted="true"]');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightCaseId, highlightDate, highlightCourtId]);
  
  if (hearings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hearings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hearings.map((hearing) => {
        console.log('Processing hearing:', hearing.id, 'judge_ids:', hearing.judge_ids);
        const case_ = state.cases.find(c => c.id === hearing.case_id);
        const court = state.courts.find(c => c.id === hearing.court_id);
        const judges = state.judges.filter(j => (hearing.judge_ids || []).includes(j.id));
        
        const isHighlighted = highlightCaseId === hearing.case_id && 
                             highlightDate === hearing.date && 
                             highlightCourtId === hearing.court_id;
        
        return (
          <div 
            key={hearing.id} 
            className={`border rounded-lg p-3 md:p-4 transition-all duration-300 ${
              isHighlighted 
                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            data-highlighted={isHighlighted}
          >
            <div className="flex flex-col md:flex-row items-start gap-3">
              <Checkbox
                checked={selectedIds.has(hearing.id)}
                onCheckedChange={() => onToggleSelection(hearing.id)}
                className="mt-1 self-start"
              />
              
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm md:text-base">
                      {case_?.caseNumber} - {case_?.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {formatDateForDisplay(hearing.date)} at {formatTimeForDisplay(hearing.start_time)}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {court?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Judges: {judges.length > 0 ? judges.map(j => j.name).join(', ') : 'No judges assigned'}
                    </p>
                    {calendarProvider && calendarProvider !== 'none' && (
                      <div className="mt-2">
                        <CalendarSyncBadge
                          status={hearing.syncStatus || 'not_synced'}
                          error={hearing.syncError}
                          lastSyncAt={hearing.lastSyncAt}
                          provider={calendarProvider}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button size="sm" variant="outline" onClick={() => onView(hearing)} className="flex-1 md:flex-none">
                      View
                    </Button>
                    <Button size="sm" onClick={() => onEdit(hearing)} className="flex-1 md:flex-none">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Import ProCalendarView instead
import { ProCalendarView } from '@/components/hearings/ProCalendarView';

export const HearingsPage: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('view') || 'list');
  const [selectedHearingIds, setSelectedHearingIds] = useState<Set<string>>(new Set());
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', activeTab);
    setSearchParams(newParams, { replace: true });
  }, [activeTab, setSearchParams]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  
  // Get URL parameters for contextual filtering and highlighting
  const caseId = searchParams.get('caseId');
  const hearingDate = searchParams.get('hearingDate');
  const courtId = searchParams.get('courtId');
  
  const [filters, setFilters] = useState<HearingFiltersState>({
    searchTerm: searchParams.get('search') || '',
    clientIds: searchParams.getAll('client') || [],
    caseIds: caseId ? [caseId] : searchParams.getAll('case') || [],
    courtIds: courtId ? [courtId] : searchParams.getAll('court') || [],
    judgeIds: searchParams.getAll('judge') || [],
    hearingTypes: searchParams.getAll('type') || [],
    statuses: searchParams.getAll('status') || [],
    internalCounselIds: searchParams.getAll('counsel') || [],
    tags: searchParams.getAll('tag') || [],
  });

  // Load calendar settings (use first client as org for now)
  const currentOrg = state.clients[0];
  const calendarSettings = currentOrg ? integrationsService.loadCalendarSettings(currentOrg.id) : null;

  // Simple filtering
  const filteredHearings = state.hearings.filter(hearing => {
    if (filters.searchTerm) {
      const case_ = state.cases.find(c => c.id === hearing.case_id);
      const court = state.courts.find(c => c.id === hearing.court_id);
      const term = filters.searchTerm.toLowerCase();
      
      if (!(
        case_?.caseNumber.toLowerCase().includes(term) ||
        case_?.title.toLowerCase().includes(term) ||
        court?.name.toLowerCase().includes(term)
      )) {
        return false;
      }
    }
    
    if (filters.caseIds.length > 0 && !filters.caseIds.includes(hearing.case_id)) {
      return false;
    }
    
    if (filters.courtIds.length > 0 && !filters.courtIds.includes(hearing.court_id)) {
      return false;
    }
    
    // Outcome filter
    if (filters.outcomes && filters.outcomes.length > 0) {
      // Only filter if hearing has an outcome (skip scheduled hearings without outcome)
      if (hearing.outcome && !filters.outcomes.includes(hearing.outcome)) {
        return false;
      }
      // If filter is active but hearing has no outcome, hide it
      if (!hearing.outcome) {
        return false;
      }
    }
    
    return true;
  });

  const handleCreateHearing = () => {
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

  // Bulk action handlers
  const handleToggleSelection = (id: string) => {
    setSelectedHearingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRetrySync = async (hearingId: string) => {
    if (!calendarSettings) return;
    
    const hearing = state.hearings.find(h => h.id === hearingId);
    if (!hearing) return;

    const caseData = state.cases.find(c => c.id === hearing.case_id);
    const courtData = state.courts.find(c => c.id === hearing.court_id);
    const judgeData = hearing.judge_ids?.[0] ? state.judges.find(j => j.id === hearing.judge_ids[0]) : undefined;

    const eventId = await calendarService.manualSync(hearing as any, calendarSettings, caseData, courtData, judgeData);
    
    if (eventId) {
      await hearingsService.updateHearing(hearingId, {
        externalEventId: eventId,
        syncStatus: 'synced',
        syncError: undefined
      } as any, dispatch);
    }
  };

  const handleBulkSync = async () => {
    if (!calendarSettings) return { success: 0, failed: 0 };
    
    const selectedHearings = state.hearings.filter(h => selectedHearingIds.has(h.id));
    const result = await calendarService.bulkSync(
      selectedHearings as any,
      calendarSettings,
      (id) => state.cases.find(c => c.id === id),
      (id) => state.courts.find(c => c.id === id),
      (id) => state.judges.find(j => j.id === id)
    );

    // Update hearing sync statuses
    for (const res of result.results) {
      if (res.success) {
        const hearing = selectedHearings.find(h => h.id === res.hearingId);
        if (hearing) {
          await hearingsService.updateHearing(res.hearingId, {
            syncStatus: 'synced'
          } as any, dispatch);
        }
      }
    }

    return { success: result.success, failed: result.failed };
  };

  const handleBulkRemove = async () => {
    if (!calendarSettings) return { success: 0, failed: 0 };
    
    const selectedHearings = state.hearings.filter(h => selectedHearingIds.has(h.id));
    const result = await calendarService.bulkDelete(selectedHearings as any, calendarSettings);

    // Update hearing sync statuses
    for (const hearing of selectedHearings) {
      await hearingsService.updateHearing(hearing.id, {
        externalEventId: undefined,
        syncStatus: 'not_synced'
      } as any, dispatch);
    }

    return result;
  };

  const handleRetryAllFailed = async () => {
    const failedHearings = calendarService.getFailedSyncs(state.hearings);
    
    for (const hearing of failedHearings) {
      await handleRetrySync(hearing.id);
    }
    
    toast({
      title: 'Retry Complete',
      description: `Retried ${failedHearings.length} failed sync(s)`
    });
  };

  const getFailedHearingsWithDetails = () => {
    return calendarService.getFailedSyncs(state.hearings).map(h => {
      const caseData = state.cases.find(c => c.id === h.case_id);
      return {
        ...h,
        case_number: caseData?.caseNumber,
        case_title: caseData?.title
      };
    });
  };


  return (
    <div className="p-6 space-y-6">
      
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Hearings</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Manage court hearings and schedules
            </p>
          </div>
          <ContextualPageHelp 
            pageId="hearings" 
            activeTab={activeTab}
            variant="resizable" 
          />
        </div>
        
        {/* Desktop Schedule Button */}
        <Button onClick={handleCreateHearing} className="hidden md:flex">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Hearing
        </Button>
      </div>

      {/* Hearing Metrics Dashboard */}
      <HearingMetrics hearings={state.hearings} />

      {/* Calendar Sync Stats */}
      {calendarSettings && calendarSettings.provider !== 'none' && (
        <CalendarSyncStatsCard
          hearings={filteredHearings}
          onViewErrors={() => setShowErrorModal(true)}
          onRetryFailed={handleRetryAllFailed}
        />
      )}

      {/* Filters */}
      <HearingFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <HearingsList
            hearings={filteredHearings}
            onEdit={handleEditHearing}
            onView={handleViewHearing}
            highlightCaseId={caseId}
            highlightDate={hearingDate}
            highlightCourtId={courtId}
            selectedIds={selectedHearingIds}
            onToggleSelection={handleToggleSelection}
            calendarProvider={calendarSettings?.provider}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <ProCalendarView
            hearings={filteredHearings}
            onEdit={handleEditHearing}
            onView={handleViewHearing}
            onSelectSlot={(slotInfo) => {
              // Pre-fill date when clicking empty slot
              handleCreateHearing();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Mobile: Floating Schedule Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleCreateHearing}
          size="lg"
          className="shadow-2xl h-14 w-14 rounded-full p-0"
          title="Schedule Hearing"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Hearing Modal */}
      <HearingModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedHearing(null);
        }}
        hearing={selectedHearing}
        mode={formMode}
      />

      {/* Bulk Actions */}
      {calendarSettings && calendarSettings.provider !== 'none' && (
        <HearingsBulkActions
          selectedCount={selectedHearingIds.size}
          onSyncToCalendar={handleBulkSync}
          onRemoveFromCalendar={handleBulkRemove}
          onUpdateCalendarEvents={handleBulkSync}
          onClearSelection={() => setSelectedHearingIds(new Set())}
        />
      )}

      {/* Error Modal */}
      <CalendarSyncErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        failedHearings={getFailedHearingsWithDetails()}
        onRetry={handleRetrySync}
        onRetryAll={handleRetryAllFailed}
        onOpenSettings={() => navigate('/rbac')}
      />

      {/* Mobile: Floating Schedule Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleCreateHearing}
          size="lg"
          className="shadow-2xl h-14 w-14 rounded-full p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

    </div>
  );
};