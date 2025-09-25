import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, List, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';

import { useAppState, Hearing } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { HearingForm } from '@/components/hearings/HearingForm';
import { HearingFilters, HearingFiltersState } from '@/components/hearings/HearingFilters';
import { hearingsService } from '@/services/hearingsService';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';

interface HearingFormData {
  case_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  timezone: string;
  court_id: string;
  courtroom?: string;
  judge_ids: string[];
  purpose: string;
  notes?: string;
}

// Simplified Lists Component
const HearingsList: React.FC<{ 
  hearings: Hearing[]; 
  onEdit: (h: Hearing) => void; 
  onView: (h: Hearing) => void;
  highlightCaseId?: string | null;
  highlightDate?: string | null;
  highlightCourtId?: string | null;
}> = ({ hearings, onEdit, onView, highlightCaseId, highlightDate, highlightCourtId }) => {
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
            className={`border rounded-lg p-4 transition-all duration-300 ${
              isHighlighted 
                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            data-highlighted={isHighlighted}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{case_?.caseNumber} - {case_?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {hearing.date} at {hearing.start_time} | {court?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Judges: {judges.length > 0 ? judges.map(j => j.name).join(', ') : 'No judges assigned'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onView(hearing)}>View</Button>
                <Button size="sm" onClick={() => onEdit(hearing)}>Edit</Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HearingsCalendar: React.FC<{ hearings: Hearing[]; onEdit: (h: Hearing) => void; onView: (h: Hearing) => void }> = ({ hearings, onEdit, onView }) => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-4">Calendar View</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hearings.map((hearing) => (
          <div key={hearing.id} className="border rounded p-3">
            <div className="text-sm font-medium">{hearing.date}</div>
            <div className="text-xs text-muted-foreground">{hearing.start_time}</div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => onView(hearing)}>View</Button>
              <Button size="sm" onClick={() => onEdit(hearing)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HearingsPage: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('view') || 'list');

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

  const handleFormSubmit = async (data: any) => {
    try {
      if (formMode === 'create') {
        const hearingFormData = {
          case_id: data.case_id,
          date: data.date.toISOString().split('T')[0],
          start_time: data.start_time,
          end_time: data.start_time, // Simple fallback
          timezone: 'Asia/Kolkata',
          court_id: data.court_id,
          courtroom: data.courtroom,
          judge_ids: data.judge_ids,
          purpose: data.purpose,
          notes: data.notes,
        };

        await hearingsService.createHearing(hearingFormData as any, dispatch);
        
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
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hearings</h1>
            <p className="text-muted-foreground">Manage court hearings and schedules</p>
          </div>
          <ContextualPageHelp 
            pageId="hearings" 
            activeTab={activeTab}
            variant="resizable" 
          />
        </div>
        
        <Button onClick={handleCreateHearing}>
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
          />
        </TabsContent>

        <TabsContent value="calendar">
          <HearingsCalendar
            hearings={filteredHearings}
            onEdit={handleEditHearing}
            onView={handleViewHearing}
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' && 'Schedule New Hearing'}
              {formMode === 'edit' && 'Edit Hearing'}
              {formMode === 'view' && 'Hearing Details'}
            </DialogTitle>
          </DialogHeader>
          
          <DialogBody>
            <HearingForm
              hearing={selectedHearing || undefined}
              mode={formMode}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

    </div>
  );
};