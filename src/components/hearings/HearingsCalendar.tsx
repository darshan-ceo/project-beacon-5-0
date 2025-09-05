import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useAppState } from '@/contexts/AppStateContext';
import { featureFlagService } from '@/services/featureFlagService';
import { hearingsService } from '@/services/hearingsService';
import { Hearing, HearingFilters } from '@/types/hearings';
import { HearingDrawer } from './HearingDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Filter, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    hearing: Hearing;
    case: any;
    court: any;
    judges: any[];
  };
}

interface HearingsCalendarProps {
  filters?: HearingFilters;
  onFiltersChange?: (filters: HearingFilters) => void;
}

export const HearingsCalendar: React.FC<HearingsCalendarProps> = ({
  filters,
  onFiltersChange
}) => {
  const { state } = useAppState();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('view');
  const [newEventSlot, setNewEventSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localFilters, setLocalFilters] = useState<HearingFilters>(filters || {});

  const isEnabled = featureFlagService.isEnabled('hearings_module_v1');

  // Fetch hearings
  useEffect(() => {
    if (!isEnabled) return;
    
    const loadHearings = async () => {
      setIsLoading(true);
      try {
        const data = await hearingsService.getHearings(localFilters);
        setHearings(data);
      } catch (error) {
        console.error('Failed to load hearings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHearings();
  }, [localFilters, isEnabled]);

  // Convert hearings to calendar events
  const events: CalendarEvent[] = hearings.map(hearing => {
    const case_ = state.cases.find(c => c.id === hearing.case_id || c.id === hearing.clientId);
    const court = state.courts.find(c => c.id === hearing.court_id);
    const judges = state.judges.filter(j => 
      hearing.judge_ids?.includes(j.id) || j.id === hearing.judgeId
    );
    
    const startDateTime = new Date(`${hearing.date}T${hearing.start_time || hearing.time || '10:00'}`);
    const endDateTime = hearing.end_time 
      ? new Date(`${hearing.date}T${hearing.end_time}`)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    return {
      id: hearing.id,
      title: case_?.caseNumber || `Case ${hearing.case_id}`,
      start: startDateTime,
      end: endDateTime,
      resource: {
        hearing,
        case: case_,
        court,
        judges
      }
    };
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedHearing(event.resource.hearing);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setNewEventSlot({ start, end });
    setSelectedHearing(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleEventDrop = ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    // Handle drag-to-reschedule
    const updatedHearing = {
      ...event.resource.hearing,
      date: start.toISOString().split('T')[0],
      start_time: start.toTimeString().slice(0, 5),
      end_time: end.toTimeString().slice(0, 5)
    };
    
    hearingsService.updateHearing(event.id, updatedHearing, {} as any);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const hearing = event.resource.hearing;
    let backgroundColor = '#3174ad';
    
    switch (hearing.status) {
      case 'scheduled':
        backgroundColor = '#3b82f6';
        break;
      case 'concluded':
        backgroundColor = '#10b981';
        break;
      case 'adjourned':
        backgroundColor = '#f59e0b';
        break;
      case 'withdrawn':
        backgroundColor = '#ef4444';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const CustomEvent: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const { hearing, case: caseData, court, judges } = event.resource;
    
    return (
      <div className="p-1">
        <div className="font-medium text-xs">{event.title}</div>
        <div className="text-xs opacity-90">
          {court?.name} | {judges?.[0]?.name}
        </div>
        <Badge 
          variant="outline" 
          className="text-xs mt-1 bg-white/20 border-white/30 text-white"
        >
          {hearing.purpose}
        </Badge>
      </div>
    );
  };

  const applyFilters = (newFilters: HearingFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Hearings Calendar is not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Hearings Calendar
          </h2>
          <p className="text-muted-foreground">
            Manage and schedule hearings across all cases
          </p>
        </div>
        
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Filter Hearings</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={localFilters.dateFrom || ''}
                      onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={localFilters.dateTo || ''}
                      onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <div className="mt-2 space-y-2">
                    {['scheduled', 'concluded', 'adjourned', 'withdrawn'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={status}
                          checked={localFilters.status?.includes(status as any) || false}
                          onCheckedChange={(checked) => {
                            const newStatus = checked
                              ? [...(localFilters.status || []), status as any]
                              : localFilters.status?.filter(s => s !== status) || [];
                            setLocalFilters(prev => ({ ...prev, status: newStatus }));
                          }}
                        />
                        <Label htmlFor={status} className="capitalize">{status}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => applyFilters(localFilters)}
                >
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => {
              setSelectedHearing(null);
              setDrawerMode('create');
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Hearing
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading hearings...</p>
              </div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleEventClick}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              selectable
              resizable
              eventPropGetter={eventStyleGetter}
              components={{
                event: CustomEvent
              }}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) => 
                  `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Hearing Drawer */}
      <HearingDrawer
        hearing={selectedHearing || undefined}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        prefillData={newEventSlot ? {
          date: newEventSlot.start.toISOString().split('T')[0],
          start_time: newEventSlot.start.toTimeString().slice(0, 5),
          end_time: newEventSlot.end.toTimeString().slice(0, 5),
          case_id: '',
          court_id: '',
          judge_ids: [],
          purpose: 'mention',
          timezone: 'Asia/Kolkata'
        } : undefined}
      />
    </div>
  );
};