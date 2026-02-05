/**
 * Stage Hearings Panel Component
 * Shows all hearings for the current stage instance
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { Hearing } from '@/types/hearings';
import { format, parseISO, isValid, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface StageHearingsPanelProps {
  hearings: Hearing[];
  stageInstanceId: string | null;
  caseId: string;
  onScheduleHearing: () => void;
  onViewHearing: (hearing: Hearing) => void;
  onRecordOutcome: (hearing: Hearing) => void;
  onAdjournHearing: (hearing: Hearing) => void;
  isLoading?: boolean;
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'completed':
      return 'bg-success/20 text-success';
    case 'adjourned':
      return 'bg-warning/20 text-warning-foreground';
    case 'cancelled':
      return 'bg-destructive/20 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getOutcomeIcon(outcome: string | null | undefined) {
  switch (outcome?.toLowerCase()) {
    case 'favorable':
    case 'allowed':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'dismissed':
    case 'rejected':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'adjourned':
      return <RotateCcw className="h-4 w-4 text-warning" />;
    case 'reserved':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  // Handle both HH:mm and full datetime strings
  if (timeStr.includes('T')) {
    try {
      const date = parseISO(timeStr);
      return isValid(date) ? format(date, 'h:mm a') : timeStr;
    } catch {
      return timeStr;
    }
  }
  // Simple time string like "10:00"
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export const StageHearingsPanel: React.FC<StageHearingsPanelProps> = ({
  hearings,
  stageInstanceId,
  caseId,
  onScheduleHearing,
  onViewHearing,
  onRecordOutcome,
  onAdjournHearing,
  isLoading = false
}) => {
  // Sort hearings: upcoming first, then past
  const sortedHearings = [...hearings].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    const isPastA = isPast(dateA);
    const isPastB = isPast(dateB);
    
    if (isPastA !== isPastB) {
      return isPastA ? 1 : -1; // Upcoming first
    }
    return dateB.getTime() - dateA.getTime(); // Most recent first within each group
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Hearing(s)
            {hearings.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {hearings.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={onScheduleHearing} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-1" />
            Schedule Hearing
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {sortedHearings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hearings scheduled for this stage</p>
            <p className="text-xs mt-1">Click "Schedule Hearing" to add one</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedHearings.map((hearing, index) => {
              const hearingDate = hearing.date ? parseISO(hearing.date) : null;
              const isUpcoming = hearingDate && isFuture(hearingDate);
              const isPastHearing = hearingDate && isPast(hearingDate);
              const needsOutcome = isPastHearing && !hearing.outcome && hearing.status !== 'withdrawn';
              
              return (
                <motion.div
                  key={hearing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div 
                    className={cn(
                      "border rounded-lg p-3 transition-all duration-200 hover:border-primary/50",
                      isUpcoming && "bg-primary/5 border-primary/20",
                      needsOutcome && "border-warning/50 bg-warning/5"
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {formatDate(hearing.date)}
                            {hearing.start_time && (
                              <span className="text-muted-foreground">
                                @ {formatTime(hearing.start_time)}
                              </span>
                            )}
                          </span>
                          <Badge className={cn("text-[10px]", getStatusColor(hearing.status || 'scheduled'))}>
                            {hearing.status || 'Scheduled'}
                          </Badge>
                          {isUpcoming && (
                            <Badge variant="outline" className="text-[10px] text-primary">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        
                        {/* Details Row */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {(hearing.authority_name || hearing.forum_name || hearing.court_id) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {hearing.authority_name || hearing.forum_name || hearing.court_id}
                            </span>
                          )}
                          {hearing.judge_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {hearing.judge_name}
                            </span>
                          )}
                        </div>
                        
                        {/* Outcome Display */}
                        {hearing.outcome && (
                          <div className="flex items-center gap-2 mt-2">
                            {getOutcomeIcon(hearing.outcome)}
                            <span className="text-xs font-medium">
                              Outcome: {hearing.outcome}
                            </span>
                          </div>
                        )}
                        
                        {/* Notes */}
                        {hearing.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {hearing.notes}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {needsOutcome && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onRecordOutcome(hearing)}
                            className="h-7 text-xs border-warning text-warning-foreground"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Add Outcome
                          </Button>
                        )}
                        {isUpcoming && hearing.status !== 'adjourned' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onAdjournHearing(hearing)}
                            className="h-7 text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Adjourn
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => onViewHearing(hearing)}
                          className="h-7 w-7"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};
