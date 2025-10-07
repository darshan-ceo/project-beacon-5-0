import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppState, Hearing } from '@/contexts/AppStateContext';
import { formatDateForDisplay, formatTimeForDisplay } from '@/utils/dateFormatters';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enGB }),
  getDay,
  locales: { 'en-GB': enGB },
});

interface ProCalendarViewProps {
  hearings: Hearing[];
  onEdit: (hearing: Hearing) => void;
  onView: (hearing: Hearing) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
}

export const ProCalendarView: React.FC<ProCalendarViewProps> = ({
  hearings,
  onEdit,
  onView,
  onSelectSlot
}) => {
  const { state } = useAppState();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // Transform hearings to calendar events
  const events = useMemo(() => {
    return hearings.map(hearing => {
      const hearingDate = new Date(hearing.date);
      const [hours, minutes] = (hearing.start_time || '10:00').split(':').map(Number);
      hearingDate.setHours(hours, minutes, 0);

      const endDate = new Date(hearingDate);
      endDate.setHours(hours + 1, minutes, 0); // Default 1-hour duration

      const caseData = state.cases.find(c => c.id === hearing.case_id);
      const courtData = state.courts.find(c => c.id === hearing.court_id);

      return {
        id: hearing.id,
        title: `${caseData?.caseNumber || 'Unknown'} - ${hearing.purpose}`,
        start: hearingDate,
        end: endDate,
        resource: {
          hearing,
          case: caseData,
          court: courtData,
        },
        status: hearing.syncStatus || 'not_synced',
      };
    });
  }, [hearings, state.cases, state.courts]);

  // Event styling based on sync status
  const eventStyleGetter = useCallback((event: any) => {
    const statusColors: Record<string, string> = {
      synced: 'hsl(var(--success))',
      sync_failed: 'hsl(var(--destructive))',
      not_synced: 'hsl(var(--primary))',
      sync_pending: 'hsl(var(--warning))',
    };

    return {
      style: {
        backgroundColor: statusColors[event.status] || statusColors.not_synced,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem',
      },
    };
  }, []);

  // Custom toolbar
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };
    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };
    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const viewLabels: Record<string, string> = {
      month: 'Month',
      week: 'Week',
      day: 'Day',
      agenda: 'Agenda',
    };

    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goToBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Current range label */}
        <h2 className="text-lg font-semibold">{toolbar.label}</h2>

        {/* View switcher */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {Object.keys(Views).map((key) => {
            const view = Views[key as keyof typeof Views];
            return (
              <Button
                key={key}
                variant={toolbar.view === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toolbar.onView(view)}
              >
                {viewLabels[view] || view}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  // Custom event wrapper for Month/Week/Day views
  const EventComponent = ({ event }: { event: any }) => {
    const { hearing, case: caseData, court } = event.resource;

    return (
      <div className="p-1">
        <div className="font-medium text-xs truncate">{event.title}</div>
        <div className="flex items-center gap-1 text-xs mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{formatTimeForDisplay(hearing.start_time)}</span>
        </div>
        {view === Views.DAY && court && (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{court.name}</span>
          </div>
        )}
      </div>
    );
  };

  // Custom Agenda view event
  const AgendaEvent = ({ event }: { event: any }) => {
    const { hearing, case: caseData, court } = event.resource;
    const judges = state.judges.filter(j => hearing.judge_ids?.includes(j.id));

    return (
      <div className="p-3 border-l-4 border-primary">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-semibold">{event.title}</div>
            <div className="text-sm text-muted-foreground">
              {caseData?.title || 'No case title'}
            </div>
          </div>
          <Badge variant={event.status === 'synced' ? 'default' : 'secondary'}>
            {event.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTimeForDisplay(hearing.start_time)} - 
              {formatTimeForDisplay(hearing.end_time || hearing.start_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{court?.name || 'Unknown Court'}</span>
          </div>
          {judges.length > 0 && (
            <div className="flex items-center gap-2 col-span-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span>{judges.map(j => j.name).join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => onView(hearing)}>
            View
          </Button>
          <Button size="sm" onClick={() => onEdit(hearing)}>
            Edit
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-300px)] min-h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={(event) => onView(event.resource.hearing)}
        onSelectSlot={onSelectSlot}
        selectable
        popup
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
          event: EventComponent,
          agenda: {
            event: AgendaEvent,
          },
        }}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        step={30}
        timeslots={2}
        formats={{
          dateFormat: 'dd',
          dayFormat: 'EEE dd',
          monthHeaderFormat: 'MMMM yyyy',
          dayHeaderFormat: 'EEEE, dd MMMM yyyy',
          agendaDateFormat: 'dd MMM',
          agendaTimeFormat: 'HH:mm',
        }}
        className="bg-background rounded-lg border"
      />
    </div>
  );
};
