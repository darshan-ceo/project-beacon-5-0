import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scale, Calendar, FileText, CheckCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'hearing' | 'document' | 'status_change';
  title: string;
  description: string;
  date: string;
  status?: string;
}

interface ClientCaseTimelineProps {
  caseId: string;
  caseNumber: string;
}

export const ClientCaseTimeline: React.FC<ClientCaseTimelineProps> = ({ caseId, caseNumber }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setLoading(true);
        const timelineEvents: TimelineEvent[] = [];

        // Fetch hearings for this case
        const { data: hearings } = await portalSupabase
          .from('hearings')
          .select('id, hearing_date, status, notes, outcome')
          .eq('case_id', caseId)
          .order('hearing_date', { ascending: false });

        if (hearings) {
          hearings.forEach(h => {
            timelineEvents.push({
              id: `hearing-${h.id}`,
              type: 'hearing',
              title: `Hearing ${h.status === 'Completed' ? 'Completed' : 'Scheduled'}`,
              description: h.notes || h.outcome || 'No details available',
              date: h.hearing_date,
              status: h.status
            });
          });
        }

        // Fetch documents for this case
        const { data: documents } = await portalSupabase
          .from('documents')
          .select('id, file_name, created_at, category')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false });

        if (documents) {
          documents.forEach(d => {
            timelineEvents.push({
              id: `doc-${d.id}`,
              type: 'document',
              title: 'Document Added',
              description: d.file_name,
              date: d.created_at || new Date().toISOString(),
              status: d.category
            });
          });
        }

        // Sort all events by date descending
        timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(timelineEvents);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [caseId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'hearing':
        return <Calendar className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Scale className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'hearing':
        return 'bg-warning text-warning-foreground';
      case 'document':
        return 'bg-secondary text-secondary-foreground';
      case 'status_change':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Timeline Events</h3>
        <p className="text-muted-foreground">
          No activity recorded for case {caseNumber} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Timeline for case: <span className="font-medium text-foreground">{caseNumber}</span>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Events */}
        <div className="space-y-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-10"
            >
              {/* Event dot */}
              <div className={`absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>

              {/* Event content */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">{event.title}</h4>
                  <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                {event.status && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {event.status}
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
