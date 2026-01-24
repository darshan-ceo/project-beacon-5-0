import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { hearingsService } from '@/services/hearingsService';
import { Hearing as GlobalHearing } from '@/types/hearings';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { integrationsService, CalendarConnectionStatus } from '@/services/integrationsService';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { 
  Calendar, 
  Clock, 
  MapPin,
  Gavel,
  Users,
  Plus,
  Edit,
  Trash2,
  Bell,
  Video,
  FileText,
  AlertCircle,
  CheckCircle,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationConfigModal } from '@/components/modals/NotificationConfigModal';
import { HearingModal } from '@/components/modals/HearingModal';
import { useAppState, Case as AppStateCase } from '@/contexts/AppStateContext';
import { getAllHearingConflicts } from '@/utils/hearingConflicts';
import { QuickEditHearing } from '@/components/hearings/QuickEditHearing';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  client: string;
}

interface Hearing {
  id: string;
  caseId: string;
  caseNumber: string;
  title: string;
  date: string;
  time: string;
  court: string;
  judge: string;
  type: 'Adjourned' | 'Final' | 'Argued';
  status: 'Scheduled' | 'Completed' | 'Postponed';
  reminder: '1 day' | '3 days' | '7 days';
  location?: string;
  notes?: string;
}

interface HearingSchedulerProps {
  cases: Array<Case & { client: string }>;
  selectedCase?: AppStateCase | null;
}

export const HearingScheduler: React.FC<HearingSchedulerProps> = ({ cases, selectedCase }) => {
  const navigate = useNavigate();
  const { state, dispatch, rawDispatch } = useAppState();
  const { hasPermission } = useAdvancedRBAC();
  
  // RBAC permission flags
  const canCreateHearings = hasPermission('hearings', 'write');
  
  const [selectedDate, setSelectedDate] = useState('');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'global' | 'case'>('global');
  const [calendarStatus, setCalendarStatus] = useState<{
    google: CalendarConnectionStatus;
    outlook: CalendarConnectionStatus;
  }>({
    google: { connected: false },
    outlook: { connected: false }
  });

  useEffect(() => {
    setViewMode(selectedCase ? 'case' : 'global');
  }, [selectedCase]);

  useEffect(() => {
    const loadCalendarStatus = async () => {
      try {
        const googleStatus = await integrationsService.getConnectionStatus('google');
        const outlookStatus = await integrationsService.getConnectionStatus('outlook');
        setCalendarStatus({ google: googleStatus, outlook: outlookStatus });
      } catch (error) {
        console.error('Failed to load calendar status:', error);
      }
    };
    loadCalendarStatus();
  }, []);

  // Set up real-time subscription for hearings
  useEffect(() => {
    const channelName = selectedCase 
      ? `hearings-case-${selectedCase.id}` 
      : 'hearings-global';
    
    console.log(`[HearingScheduler] Setting up real-time subscription: ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hearings',
          ...(selectedCase ? { filter: `case_id=eq.${selectedCase.id}` } : {})
        },
        (payload) => {
          console.log('[HearingScheduler] Real-time INSERT received:', payload);
          
          const newHearing = payload.new as GlobalHearing;
          
          // Dispatch ADD_HEARING action
          rawDispatch({
            type: 'ADD_HEARING',
            payload: newHearing
          });
          
          toast({
            title: "Hearing Scheduled",
            description: `New hearing has been added to the calendar`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hearings',
          ...(selectedCase ? { filter: `case_id=eq.${selectedCase.id}` } : {})
        },
        (payload) => {
          console.log('[HearingScheduler] Real-time UPDATE received:', payload);
          
          const updatedHearing = payload.new as GlobalHearing;
          
          // Dispatch UPDATE_HEARING action
          rawDispatch({
            type: 'UPDATE_HEARING',
            payload: updatedHearing
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'hearings',
          ...(selectedCase ? { filter: `case_id=eq.${selectedCase.id}` } : {})
        },
        (payload) => {
          console.log('[HearingScheduler] Real-time DELETE received:', payload);
          
          const deletedHearing = payload.old as GlobalHearing;
          
          // Dispatch DELETE_HEARING action
          rawDispatch({
            type: 'DELETE_HEARING',
            payload: deletedHearing.id
          });
          
          toast({
            title: "Hearing Deleted",
            description: `Hearing has been removed`,
            variant: "destructive"
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when case changes
    return () => {
      console.log(`[HearingScheduler] Cleaning up real-time subscription: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [dispatch, selectedCase]);

  // Transform state hearings to local format for compatibility
  const allHearings: Hearing[] = state.hearings.map(h => {
    const hearingDateStr = h.date || (h as any).hearing_date;
    const dateStr = typeof hearingDateStr === 'string' ? hearingDateStr.split('T')[0] : '';
    
    return {
      id: h.id,
      caseId: h.case_id,
      caseNumber: `CASE-${h.case_id}`,
      title: h.agenda || `Hearing for Case ${h.case_id}`,
      date: dateStr,
      time: h.time || h.start_time || '10:00',
      court: (state.courts.find(c => c.id === h.court_id)?.name) || 'Court',
      judge: (state.judges.find(j => h.judge_ids?.includes(j.id))?.name) || 'Judge',
      type: (h.type === 'Preliminary' ? 'Final' : h.type) as 'Adjourned' | 'Final' | 'Argued' || 'Final',
      status: h.status === 'scheduled' ? 'Scheduled' : h.status === 'concluded' ? 'Completed' : 'Postponed',
      reminder: '1 day' as '1 day' | '3 days' | '7 days',
      location: h.courtroom || '',
      notes: h.notes || ''
    };
  });

  // Filter hearings based on view mode
  const hearings = viewMode === 'case' && selectedCase 
    ? allHearings.filter(h => h.caseId === selectedCase.id)
    : allHearings;

  // Detect conflicts across all hearings
  const conflictsMap = React.useMemo(() => {
    return getAllHearingConflicts(state.hearings, state.cases, state.courts);
  }, [state.hearings, state.cases, state.courts]);

  const today = new Date().toISOString().split('T')[0];
  const upcomingHearings = hearings.filter(h => h.status === 'Scheduled' && h.date);
  const todayHearings = upcomingHearings.filter(h => h.date === today);
  const thisWeekHearings = upcomingHearings.filter(h => {
    if (!h.date) return false;
    const hearingDate = new Date(h.date);
    const todayDate = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(todayDate.getDate() + 7);
    return hearingDate >= todayDate && hearingDate <= weekFromNow;
  });
  const completedHearings = hearings.filter(h => h.status === 'Completed');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Final': return 'bg-success text-success-foreground';
      case 'Argued': return 'bg-primary text-primary-foreground';
      case 'Adjourned': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-primary text-primary-foreground';
      case 'Completed': return 'bg-success text-success-foreground';
      case 'Postponed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hearing Scheduler</h2>
          <p className="text-muted-foreground mt-1">
            {viewMode === 'case' && selectedCase
              ? `Hearings for ${selectedCase.caseNumber} (${hearings.length} total)`
              : `Manage legal forum hearings with calendar sync and reminders (${hearings.length} total)`
            }
          </p>
        </div>
        {canCreateHearings && selectedCase?.status !== 'Completed' && (
          <Button 
            className="bg-primary hover:bg-primary-hover"
            onClick={() => setIsScheduleDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Hearing
          </Button>
        )}
        
        <HearingModal
          isOpen={isScheduleDialogOpen}
          onClose={() => setIsScheduleDialogOpen(false)}
          mode="create"
          contextCaseId={selectedCase?.id}
          contextClientId={selectedCase?.clientId}
        />
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Hearings</p>
                <p className="text-2xl font-bold text-foreground">{todayHearings.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-foreground">{thisWeekHearings.length}</p>
              </div>
              <Clock className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-foreground">{upcomingHearings.length}</p>
              </div>
              <Gavel className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={conflictsMap.size > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conflicts</p>
                <p className={`text-2xl font-bold ${conflictsMap.size > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {conflictsMap.size}
                </p>
              </div>
              {conflictsMap.size > 0 ? (
                <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />
              ) : (
                <CheckCircle className="h-8 w-8 text-success" />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Hearings */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Today's Hearings
              </CardTitle>
              <CardDescription>
                Scheduled hearings for today with quick actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayHearings.length > 0 ? (
                todayHearings.map((hearing, index) => (
                  <motion.div
                    key={hearing.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{hearing.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{hearing.caseNumber}</p>
                        {conflictsMap.has(hearing.id) && (
                          <Badge variant="destructive" className="text-xs mt-1 w-fit">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {conflictsMap.get(hearing.id)!.conflicts.length} conflict(s)
                          </Badge>
                        )}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                          <div className="flex items-center shrink-0">
                            <Clock className="mr-1 h-3 w-3" />
                            <span className="truncate">{hearing.time}</span>
                          </div>
                          {hearing.location && (
                            <div className="flex items-center min-w-0">
                              <MapPin className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate">{hearing.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" className={getTypeColor(hearing.type)}>
                            {hearing.type}
                          </Badge>
                          <Badge variant="outline" className="truncate max-w-[200px]">
                            {hearing.judge}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 shrink-0">
                        <QuickEditHearing
                          hearingId={hearing.id}
                          currentDate={hearing.date}
                          currentTime={hearing.time}
                          trigger={
                            <Button size="sm" variant="outline" title="Quick edit time/date">
                              <Clock className="h-3 w-3" />
                            </Button>
                          }
                        />
                        <Button size="sm" variant="outline" title="Notifications">
                          <Bell className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" title="Video conference">
                          <Video className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  {viewMode === 'case' && selectedCase ? (
                    <>
                      <h3 className="text-lg font-semibold mb-2">No Hearings Today</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        No hearings scheduled for today for case: <strong>{selectedCase.caseNumber}</strong>
                      </p>
                      {selectedCase?.status !== 'Completed' && (
                        <Button onClick={() => setIsScheduleDialogOpen(true)}>
                          Schedule Hearing
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No hearings scheduled for today</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Calendar Integration */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5 text-secondary" />
                Calendar Sync & Reminders
              </CardTitle>
              <CardDescription>
                Integrate with external calendars and set reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={calendarStatus.google.connected ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center ${
                    calendarStatus.google.connected ? 'bg-success hover:bg-success/90' : ''
                  }`}
                  onClick={() => {
                    if (calendarStatus.google.connected) {
                      window.open('https://calendar.google.com', '_blank');
                      toast({
                        title: "Opening Google Calendar",
                        description: `Connected as ${calendarStatus.google.userEmail || 'user'}`,
                      });
                    } else {
                      toast({
                        title: "Calendar Not Configured",
                        description: "Please configure Google Calendar integration first",
                        action: (
                          <Button size="sm" onClick={() => navigate('/settings')}>
                            Go to Settings
                          </Button>
                        ),
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    {calendarStatus.google.connected && <Check className="h-4 w-4 text-success-foreground" />}
                  </div>
                  <span className="text-sm">Google Calendar</span>
                  {calendarStatus.google.connected && (
                    <span className="text-xs text-muted-foreground mt-1">Connected</span>
                  )}
                </Button>
                <Button 
                  variant={calendarStatus.outlook.connected ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center ${
                    calendarStatus.outlook.connected ? 'bg-success hover:bg-success/90' : ''
                  }`}
                  onClick={() => {
                    if (calendarStatus.outlook.connected) {
                      window.open('https://outlook.live.com/calendar', '_blank');
                      toast({
                        title: "Opening Outlook Calendar",
                        description: `Connected as ${calendarStatus.outlook.userEmail || 'user'}`,
                      });
                    } else {
                      toast({
                        title: "Calendar Not Configured",
                        description: "Please configure Outlook integration first",
                        action: (
                          <Button size="sm" onClick={() => navigate('/settings')}>
                            Go to Settings
                          </Button>
                        ),
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar className="h-6 w-6 text-secondary" />
                    {calendarStatus.outlook.connected && <Check className="h-4 w-4 text-success-foreground" />}
                  </div>
                  <span className="text-sm">Outlook</span>
                  {calendarStatus.outlook.connected && (
                    <span className="text-xs text-muted-foreground mt-1">Connected</span>
                  )}
                </Button>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Reminder Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">1 Day Before</span>
                    <Badge variant="secondary" className="bg-success text-success-foreground">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">3 Days Before</span>
                    <Badge variant="secondary" className="bg-success text-success-foreground">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">7 Days Before</span>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <Button 
                  className="w-full"
                  onClick={() => setIsNotificationModalOpen(true)}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Configure Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* All Upcoming Hearings */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gavel className="mr-2 h-5 w-5 text-primary" />
              All Upcoming Hearings
            </CardTitle>
            <CardDescription>
              Complete schedule of upcoming court hearings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingHearings.map((hearing, index) => (
                <motion.div
                  key={hearing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="text-center shrink-0">
                      <p className="text-lg font-bold text-primary">{new Date(hearing.date).getDate()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(hearing.date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                    </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{hearing.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{hearing.caseNumber}</p>
                        {conflictsMap.has(hearing.id) && (
                          <Badge variant="destructive" className="text-xs mt-1 w-fit">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {conflictsMap.get(hearing.id)!.conflicts.length} conflict(s)
                          </Badge>
                        )}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="shrink-0">{hearing.time}</span>
                        <span className="shrink-0">•</span>
                        <span className="truncate min-w-0">{hearing.court}</span>
                        <span className="shrink-0">•</span>
                        <span className="truncate min-w-0">{hearing.judge}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={getTypeColor(hearing.type)}>
                      {hearing.type}
                    </Badge>
                    <Badge variant="secondary" className={getStatusColor(hearing.status)}>
                      {hearing.status}
                    </Badge>
                    <QuickEditHearing
                      hearingId={hearing.id}
                      currentDate={hearing.date}
                      currentTime={hearing.time}
                      trigger={
                        <Button variant="ghost" size="sm" title="Quick edit">
                          <Clock className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Edit hearing"
                      onClick={() => setEditingHearing(hearing)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Edit Hearing Modal */}
      {editingHearing && (
        <HearingModal
          isOpen={!!editingHearing}
          onClose={() => setEditingHearing(null)}
          mode="edit"
          hearing={state.hearings.find(h => h.id === editingHearing.id)}
          contextCaseId={editingHearing.caseId}
        />
      )}
      
      {/* Notification Configuration Modal */}
      <NotificationConfigModal
        open={isNotificationModalOpen}
        onOpenChange={setIsNotificationModalOpen}
        caseId="global"
      />
    </div>
  );
};