import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Blocks, Phone, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskFollowUp } from '@/contexts/AppStateContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface FollowUpCardProps {
  followUp: TaskFollowUp;
}

const outcomeStyles = {
  'Progressing': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  'Blocked': { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  'Completed': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  'Need Support': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  'Pending Input': { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/20' },
};

export const FollowUpCard: React.FC<FollowUpCardProps> = ({ followUp }) => {
  const outcomeStyle = followUp.outcome ? outcomeStyles[followUp.outcome] : null;
  const OutcomeIcon = outcomeStyle?.icon;

  return (
    <Card className={cn("transition-all hover:shadow-md", followUp.escalationRequested && "border-destructive")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {followUp.createdByName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{followUp.createdByName}</p>
              <CardDescription className="text-xs">
                {formatDistanceToNow(new Date(followUp.createdAt), { addSuffix: true })}
                {' • '}
                {new Date(followUp.workDate).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex gap-2">
            {followUp.outcome && outcomeStyle && (
              <Badge variant="outline" className={outcomeStyle.bg}>
                {OutcomeIcon && <OutcomeIcon className={cn("h-3 w-3 mr-1", outcomeStyle.color)} />}
                {followUp.outcome}
              </Badge>
            )}
            <Badge variant="secondary">{followUp.status}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Remarks */}
        <div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{followUp.remarks}</p>
        </div>

        {/* Time Logged */}
        {followUp.hoursLogged && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{followUp.hoursLogged}h logged</span>
          </div>
        )}

        {/* Next Follow-Up */}
        {followUp.nextFollowUpDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              Next follow-up: {new Date(followUp.nextFollowUpDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
        )}

        {/* Next Actions */}
        {followUp.nextActions && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Next Actions</p>
            <p className="text-sm">{followUp.nextActions}</p>
          </div>
        )}

        {/* Blockers */}
        {followUp.blockers && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Blocks className="h-4 w-4 text-destructive" />
              <p className="text-xs font-medium text-destructive">Blockers/Issues</p>
            </div>
            <p className="text-sm">{followUp.blockers}</p>
          </div>
        )}

        {/* Flags */}
        <div className="flex flex-wrap gap-2">
          {followUp.supportNeeded && (
            <Badge variant="outline" className="text-xs">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Support Needed
            </Badge>
          )}
          {followUp.escalationRequested && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Escalation Requested
            </Badge>
          )}
          {followUp.clientInteraction && (
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
              <Phone className="h-3 w-3 mr-1" />
              Client Communication
            </Badge>
          )}
          {followUp.internalReview && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Reviewed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
