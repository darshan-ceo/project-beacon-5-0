import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { Clock, MapPin, Scale, Plus } from 'lucide-react';
import { HearingModal } from '@/components/modals/HearingModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface HearingCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HearingCalendar: React.FC<HearingCalendarProps> = ({ isOpen, onClose }) => {
  const { state } = useAppState();
  const [selectedHearing, setSelectedHearing] = useState(null);
  const [hearingModal, setHearingModal] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit' | 'view',
    hearing: null
  });

  // Convert hearings to calendar events
  const events = state.hearings.map(hearing => {
    const hearingDate = new Date(hearing.date);
    const [hours, minutes] = hearing.time.split(':').map(Number);
    hearingDate.setHours(hours, minutes);
    
    const caseInfo = state.cases.find(c => c.id === hearing.caseId);
    const courtInfo = state.courts.find(c => c.id === hearing.courtId);
    
    return {
      id: hearing.id,
      title: `${caseInfo?.caseNumber || 'Unknown'} - ${hearing.type}`,
      start: hearingDate,
      end: new Date(hearingDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
      resource: hearing,
      status: hearing.status
    };
  });

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3174ad';
    
    switch (event.status) {
      case 'Scheduled':
        backgroundColor = 'hsl(var(--primary))';
        break;
      case 'Completed':
        backgroundColor = 'hsl(var(--success))';
        break;
      case 'Cancelled':
        backgroundColor = 'hsl(var(--destructive))';
        break;
      case 'Postponed':
        backgroundColor = 'hsl(var(--warning))';
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

  const handleSelectEvent = (event: any) => {
    setHearingModal({
      isOpen: true,
      mode: 'view',
      hearing: event.resource
    });
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setHearingModal({
      isOpen: true,
      mode: 'create',
      hearing: {
        date: format(start, 'yyyy-MM-dd'),
        time: format(start, 'HH:mm')
      }
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Hearing Calendar</span>
              </div>
              <Button
                onClick={() => setHearingModal({ isOpen: true, mode: 'create', hearing: null })}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Hearing
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge style={{ backgroundColor: 'hsl(var(--primary))' }}>Scheduled</Badge>
                  <Badge style={{ backgroundColor: 'hsl(var(--success))' }}>Completed</Badge>
                  <Badge style={{ backgroundColor: 'hsl(var(--destructive))' }}>Cancelled</Badge>
                  <Badge style={{ backgroundColor: 'hsl(var(--warning))' }}>Postponed</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <div style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                popup
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
                step={60}
                showMultiDayTimes
                components={{
                  event: ({ event }) => (
                    <div className="text-xs">
                      <div className="font-medium">{event.title}</div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{format(event.start, 'HH:mm')}</span>
                      </div>
                    </div>
                  ),
                  agenda: {
                    event: ({ event }) => {
                      const hearing = event.resource;
                      const caseInfo = state.cases.find(c => c.id === hearing.caseId);
                      const courtInfo = state.courts.find(c => c.id === hearing.courtId);
                      const judgeInfo = state.judges.find(j => j.id === hearing.judgeId);
                      
                      return (
                        <div className="p-2">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{courtInfo?.name || 'Unknown Court'}</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <Scale className="h-3 w-3 mr-1" />
                              <span>Judge: {judgeInfo?.name || 'Unknown Judge'}</span>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="mt-2"
                            style={{ 
                              backgroundColor: eventStyleGetter(event).style.backgroundColor,
                              color: 'white'
                            }}
                          >
                            {hearing.status}
                          </Badge>
                        </div>
                      );
                    }
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HearingModal
        isOpen={hearingModal.isOpen}
        onClose={() => setHearingModal({ isOpen: false, mode: 'create', hearing: null })}
        hearing={hearingModal.hearing}
        mode={hearingModal.mode}
      />
    </>
  );
};