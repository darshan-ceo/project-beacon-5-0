import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { hearingsService } from '@/services/hearingsService';
import { Hearing as GlobalHearing } from '@/types/hearings';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { integrationsService, CalendarConnectionStatus } from '@/services/integrationsService';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NotificationConfigModal } from '@/components/modals/NotificationConfigModal';

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
  cases: Case[];
}

export const HearingScheduler: React.FC<HearingSchedulerProps> = ({ cases }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [globalHearings, setGlobalHearings] = useState<GlobalHearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<{
    google: CalendarConnectionStatus;
    outlook: CalendarConnectionStatus;
  }>({
    google: { connected: false },
    outlook: { connected: false }
  });

  useEffect(() => {
    const fetchHearings = async () => {
      try {
        const fetchedHearings = await hearingsService.getHearings();
        setGlobalHearings(fetchedHearings);
      } catch (error) {
        console.error('Error fetching hearings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHearings();
  }, []);

  useEffect(() => {
    const loadCalendarStatus = () => {
      try {
        const googleStatus = integrationsService.getConnectionStatus('default', 'google');
        const outlookStatus = integrationsService.getConnectionStatus('default', 'outlook');
        setCalendarStatus({ google: googleStatus, outlook: outlookStatus });
      } catch (error) {
        console.error('Failed to load calendar status:', error);
      }
    };
    loadCalendarStatus();
  }, []);

  // Transform global hearings to local format for compatibility
  const hearings: Hearing[] = globalHearings.map(h => ({
    id: h.id,
    caseId: h.clientId || h.case_id,
    caseNumber: `CASE-${h.case_id}`,
    title: h.agenda || `Hearing for Case ${h.case_id}`,
    date: h.date,
    time: h.time || h.start_time,
    court: (h as any).court || 'Court',
    judge: (h as any).judge || 'Judge',
    type: (h.type === 'Preliminary' ? 'Final' : h.type) as 'Adjourned' | 'Final' | 'Argued' || 'Final',
    status: h.status === 'scheduled' ? 'Scheduled' : h.status === 'concluded' ? 'Completed' : 'Postponed',
    reminder: ((h as any).reminder || '1 day') as '1 day' | '3 days' | '7 days',
    location: (h as any).location || h.courtroom,
    notes: h.notes
  }));

  const today = new Date().toISOString().split('T')[0];
  const upcomingHearings = hearings.filter(h => h.status === 'Scheduled');
  const todayHearings = upcomingHearings.filter(h => h.date === today);
  const thisWeekHearings = upcomingHearings.filter(h => {
    const hearingDate = new Date(h.date);
    const todayDate = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(todayDate.getDate() + 7);
    return hearingDate >= todayDate && hearingDate <= weekFromNow;
  });

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
            Manage court hearings with calendar sync and reminders
          </p>
        </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Hearing
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Schedule New Hearing</DialogTitle>
              <DialogDescription>
                Add a new hearing date with court and judge details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Case</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((case_) => (
                        <SelectItem key={case_.id} value={case_.id}>
                          {case_.caseNumber} - {case_.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Hearing Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="argued">Argued</SelectItem>
                      <SelectItem value="adjourned">Adjourned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" id="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input type="time" id="time" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="court">Court</Label>
                  <Input id="court" placeholder="Court name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="judge">Judge</Label>
                  <Input id="judge" placeholder="Judge name" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Court room and address" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminder">Reminder</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Set reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-day">1 day before</SelectItem>
                    <SelectItem value="3-days">3 days before</SelectItem>
                    <SelectItem value="7-days">7 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Hearing Scheduled",
                    description: "Hearing has been scheduled successfully",
                  });
                  setIsScheduleDialogOpen(false);
                }}
              >
                Schedule Hearing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">45</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{hearing.title}</h4>
                        <p className="text-sm text-muted-foreground">{hearing.caseNumber}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {hearing.time}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {hearing.location}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary" className={getTypeColor(hearing.type)}>
                            {hearing.type}
                          </Badge>
                          <Badge variant="outline">
                            {hearing.judge}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button size="sm" variant="outline">
                          <Bell className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Video className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hearings scheduled for today</p>
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
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{new Date(hearing.date).getDate()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(hearing.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{hearing.title}</h4>
                        <p className="text-sm text-muted-foreground">{hearing.caseNumber}</p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span>{hearing.time}</span>
                          <span>•</span>
                          <span>{hearing.court}</span>
                          <span>•</span>
                          <span>{hearing.judge}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getTypeColor(hearing.type)}>
                      {hearing.type}
                    </Badge>
                    <Badge variant="secondary" className={getStatusColor(hearing.status)}>
                      {hearing.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Notification Configuration Modal */}
      <NotificationConfigModal
        open={isNotificationModalOpen}
        onOpenChange={setIsNotificationModalOpen}
        caseId="global"
      />
    </div>
  );
};