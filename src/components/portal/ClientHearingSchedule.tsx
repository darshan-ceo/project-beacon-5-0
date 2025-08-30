import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Scale,
  AlertTriangle,
  CheckCircle,
  User
} from 'lucide-react';

interface Hearing {
  id: string;
  caseId: string;
  date: string;
  time: string;
  courtName?: string;
  judgeName?: string;
  type: string;
  status: 'Scheduled' | 'Confirmed' | 'Rescheduled' | 'Completed';
  agenda?: string;
  notes?: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
}

interface ClientHearingScheduleProps {
  hearings: Hearing[];
  cases: Case[];
}

export const ClientHearingSchedule: React.FC<ClientHearingScheduleProps> = ({ 
  hearings, 
  cases 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Separate upcoming and past hearings
  const now = new Date();
  const upcomingHearings = hearings.filter(h => new Date(h.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastHearings = hearings.filter(h => new Date(h.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get hearings for selected date (calendar view)
  const selectedDateHearings = selectedDate 
    ? hearings.filter(h => {
        const hearingDate = new Date(h.date);
        return hearingDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  // Get case details for a hearing
  const getCaseDetails = (caseId: string) => {
    return cases.find(c => c.id === caseId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-success-foreground';
      case 'Scheduled': return 'bg-primary text-primary-foreground';
      case 'Rescheduled': return 'bg-warning text-warning-foreground';
      case 'Completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'final':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Scale className="h-4 w-4 text-primary" />;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01 ${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const HearingCard: React.FC<{ hearing: Hearing; showDate?: boolean }> = ({ hearing, showDate = true }) => {
    const caseDetails = getCaseDetails(hearing.caseId);
    
    return (
      <Card className="hover-lift">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3">
              {getTypeIcon(hearing.type)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">
                  {caseDetails?.caseNumber || 'Case TBD'}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  {caseDetails?.title || 'Case details pending'}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(hearing.status)}>
              {hearing.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            {showDate && (
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium text-foreground">
                  {new Date(hearing.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium text-foreground">
                {formatTime(hearing.time)}
              </span>
            </div>

            {hearing.courtName && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Court:</span>
                <span className="font-medium text-foreground">
                  {hearing.courtName}
                </span>
              </div>
            )}

            {hearing.judgeName && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Judge:</span>
                <span className="font-medium text-foreground">
                  {hearing.judgeName}
                </span>
              </div>
            )}

            {hearing.agenda && (
              <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Agenda:</p>
                <p className="text-sm text-foreground">{hearing.agenda}</p>
              </div>
            )}

            {hearing.notes && (
              <div className="mt-2 p-2 bg-accent/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                <p className="text-sm text-foreground">{hearing.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Hearing Schedule</h2>
        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'list' ? (
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingHearings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastHearings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingHearings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Upcoming Hearings
                  </h3>
                  <p className="text-muted-foreground text-center">
                    You don't have any scheduled hearings at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {upcomingHearings.map((hearing) => (
                  <motion.div
                    key={hearing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <HearingCard hearing={hearing} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastHearings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Past Hearings
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Your hearing history will appear here once you have completed hearings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {pastHearings.map((hearing) => (
                  <motion.div
                    key={hearing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <HearingCard hearing={hearing} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>
                Click on a date to view hearings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasHearing: hearings.map(h => new Date(h.date))
                }}
                modifiersStyles={{
                  hasHearing: { 
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Hearings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedDate 
                  ? `Hearings on ${selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}`
                  : 'Select a Date'
                }
              </CardTitle>
              <CardDescription>
                {selectedDateHearings.length} hearing{selectedDateHearings.length !== 1 ? 's' : ''} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateHearings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hearings on this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateHearings.map((hearing) => (
                    <HearingCard key={hearing.id} hearing={hearing} showDate={false} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};