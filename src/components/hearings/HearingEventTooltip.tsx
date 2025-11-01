import React from 'react';
import { Hearing } from '@/contexts/AppStateContext';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Briefcase, Clock } from 'lucide-react';

interface HearingEventTooltipProps {
  hearing: Hearing;
  children: React.ReactNode;
}

export const HearingEventTooltip: React.FC<HearingEventTooltipProps> = ({ hearing, children }) => {
  const { state } = useAppState();
  
  const caseData = state.cases.find(c => c.id === hearing.case_id);
  const client = caseData ? state.clients.find(cl => cl.id === caseData.clientId) : null;
  const forum = state.courts.find(c => c.id === hearing.forum_id || hearing.court_id);
  const authority = hearing.authority_id ? state.courts.find(c => c.id === hearing.authority_id) : null;
  const advocate = caseData ? state.employees.find(e => e.id === caseData.assignedToId) : null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="w-80 p-0 shadow-xl border-2"
          sideOffset={10}
        >
          <div className="p-4 space-y-3">
            {/* Case Title */}
            <div>
              <h4 className="font-semibold text-base mb-1">
                {caseData?.title || 'Unknown Case'}
              </h4>
              <Badge variant="outline" className="text-xs">
                {caseData?.caseNumber || 'N/A'}
              </Badge>
            </div>

            {/* Details Grid */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <span className="ml-1 font-medium">{client?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground">Forum:</span>
                  <span className="ml-1 font-medium">{forum?.name || 'N/A'}</span>
                </div>
              </div>

              {authority && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Authority:</span>
                    <span className="ml-1 font-medium">{authority.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground">Advocate:</span>
                  <span className="ml-1 font-medium">{advocate?.full_name || 'Not Assigned'}</span>
                </div>
              </div>

              {hearing.outcome && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Outcome:</span>
                    <Badge className="ml-2" variant="secondary">
                      {hearing.outcome}
                    </Badge>
                  </div>
                </div>
              )}

              {hearing.next_hearing_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Next Hearing:</span>
                    <span className="ml-1 font-medium">{hearing.next_hearing_date}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Purpose */}
            {hearing.purpose && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Purpose:</span> {hearing.purpose}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
