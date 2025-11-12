import React, { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { timelineService, TimelineEntry } from '@/services/timelineService';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  FileText, 
  Calendar,
  MessageSquare,
  Upload,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Edit,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
}

interface TimelineEvent {
  id: string;
  type: 'stage_change' | 'document_upload' | 'hearing_scheduled' | 'comment' | 'deadline' | 'approval';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  metadata?: {
    stage?: string;
    documentName?: string;
    hearingDate?: string;
    court?: string;
    deadline?: string;
    status?: string;
  };
}

interface CaseTimelineProps {
  selectedCase?: Case | null;
}


export const CaseTimeline: React.FC<CaseTimelineProps> = ({ selectedCase }) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch timeline entries when case changes
  useEffect(() => {
    const loadTimeline = async () => {
      if (!selectedCase) {
        setTimelineEvents([]);
        return;
      }

      setIsLoading(true);
      try {
        const entries = await timelineService.getEntriesForCase(selectedCase.id);
        
        // Map timeline service entries to UI format
        const mappedEvents: TimelineEvent[] = entries.map(entry => ({
          id: entry.id,
          type: mapServiceTypeToUIType(entry.type),
          title: entry.title,
          description: entry.description,
          timestamp: entry.createdAt,
          user: {
            name: entry.createdBy,
            role: entry.createdBy === 'System' ? 'Automated' : 'User',
            avatar: undefined
          },
          metadata: {
            stage: entry.metadata?.stage,
            documentName: entry.metadata?.fileName,
            hearingDate: entry.metadata?.hearingDate,
            court: entry.metadata?.court,
            deadline: entry.metadata?.deadline,
            status: entry.metadata?.status
          }
        }));

        setTimelineEvents(mappedEvents);
        console.log(`[Timeline] Loaded ${mappedEvents.length} events for case ${selectedCase.id}`);
      } catch (error) {
        console.error('[Timeline] Failed to load timeline:', error);
        toast({
          title: "Timeline Load Error",
          description: "Failed to load case timeline. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeline();
  }, [selectedCase]);

  // Set up real-time subscription for timeline updates
  useEffect(() => {
    if (!selectedCase) return;

    console.log(`[Timeline] Setting up real-time subscription for case ${selectedCase.id}`);

    const channel = supabase
      .channel(`timeline-${selectedCase.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'timeline_entries',
          filter: `case_id=eq.${selectedCase.id}`
        },
        (payload) => {
          console.log('[Timeline] Real-time INSERT received:', payload);
          
          const newEntry = payload.new as TimelineEntry;
          
          // Map the new entry to UI format
          const newEvent: TimelineEvent = {
            id: newEntry.id,
            type: mapServiceTypeToUIType(newEntry.type),
            title: newEntry.title,
            description: newEntry.description,
            timestamp: newEntry.createdAt,
            user: {
              name: newEntry.createdByName || newEntry.createdBy,
              role: newEntry.createdBy === 'System' ? 'Automated' : 'User',
              avatar: undefined
            },
            metadata: {
              stage: newEntry.metadata?.stage,
              documentName: newEntry.metadata?.fileName,
              hearingDate: newEntry.metadata?.hearingDate,
              court: newEntry.metadata?.court,
              deadline: newEntry.metadata?.deadline,
              status: newEntry.metadata?.status
            }
          };

          // Add new event to the beginning of the timeline
          setTimelineEvents(prev => [newEvent, ...prev]);
          
          toast({
            title: "Timeline Updated",
            description: `New event: ${newEntry.title}`,
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when case changes
    return () => {
      console.log(`[Timeline] Cleaning up real-time subscription for case ${selectedCase.id}`);
      supabase.removeChannel(channel);
    };
  }, [selectedCase]);

  // Map timeline service types to UI types
  const mapServiceTypeToUIType = (serviceType: string): TimelineEvent['type'] => {
    switch (serviceType) {
      case 'doc_saved':
      case 'ai_draft_generated':
        return 'document_upload';
      case 'case_created':
        return 'stage_change';
      case 'hearing_scheduled':
        return 'hearing_scheduled';
      case 'task_completed':
        return 'approval';
      default:
        return 'comment';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'stage_change': return Scale;
      case 'document_upload': return Upload;
      case 'hearing_scheduled': return Calendar;
      case 'comment': return MessageSquare;
      case 'deadline': return Clock;
      case 'approval': return CheckCircle;
      default: return FileText;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'stage_change': return 'bg-primary text-primary-foreground';
      case 'document_upload': return 'bg-secondary text-secondary-foreground';
      case 'hearing_scheduled': return 'bg-warning text-warning-foreground';
      case 'comment': return 'bg-muted text-muted-foreground';
      case 'deadline': return 'bg-destructive text-destructive-foreground';
      case 'approval': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              Case Timeline & Audit Trail
            </CardTitle>
            <CardDescription>
              {selectedCase ? 
                `Complete chronological history for ${selectedCase.caseNumber} - ${selectedCase.title}` :
                'Select a case to view its detailed timeline and audit trail'
              }
            </CardDescription>
          </CardHeader>
          {selectedCase && (
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.caseNumber}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Export Timeline",
                        description: "Timeline data exported successfully",
                      });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Timeline
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Generate Report",
                        description: "Case timeline report generated",
                      });
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            {selectedCase ? (
              <div className="relative">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading timeline...</p>
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Timeline Events Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Timeline events will appear here as you work on this case
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
                    
                    <div className="space-y-8">
                      {timelineEvents.map((event, index) => {
                    const EventIcon = getEventIcon(event.type);
                    const formatted = formatTimestamp(event.timestamp);
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="relative flex items-start space-x-6"
                      >
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                          <EventIcon className="h-6 w-6" />
                        </div>
                        
                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-foreground mb-1">
                                {event.title}
                              </h4>
                              <p className="text-muted-foreground mb-3">
                                {event.description}
                              </p>
                              
                              {/* Metadata */}
                              {event.metadata && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {event.metadata.stage && (
                                    <Badge variant="secondary">
                                      Stage: {event.metadata.stage}
                                    </Badge>
                                  )}
                                  {event.metadata.documentName && (
                                    <Badge variant="outline" className="flex items-center">
                                      <FileText className="mr-1 h-3 w-3" />
                                      {event.metadata.documentName}
                                    </Badge>
                                  )}
                                  {event.metadata.hearingDate && (
                                    <Badge variant="outline" className="flex items-center">
                                      <Calendar className="mr-1 h-3 w-3" />
                                      {event.metadata.hearingDate}
                                    </Badge>
                                  )}
                                  {event.metadata.court && (
                                    <Badge variant="outline">
                                      {event.metadata.court}
                                    </Badge>
                                  )}
                                  {event.metadata.status && (
                                    <Badge variant="secondary" className={
                                      event.metadata.status === 'Warning' 
                                        ? 'bg-warning text-warning-foreground'
                                        : 'bg-success text-success-foreground'
                                    }>
                                      {event.metadata.status}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* User info */}
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={event.user.avatar} alt={event.user.name} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {event.user.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {event.user.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {event.user.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Timestamp and actions */}
                            <div className="text-right ml-4">
                              <p className="text-sm font-medium text-foreground">
                                {formatted.date}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {formatted.time}
                              </p>
                              
                              {/* Action buttons */}
                              <div className="flex space-x-1">
                                {event.metadata?.documentName && (
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                                {event.type === 'comment' && (
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Separator */}
                          {index < timelineEvents.length - 1 && (
                            <Separator className="mt-6" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
            ) : (
              <div className="text-center py-12">
                <Scale className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Case Selected
                </h3>
                <p className="text-muted-foreground">
                  Select a case from the overview tab to view its detailed timeline
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};