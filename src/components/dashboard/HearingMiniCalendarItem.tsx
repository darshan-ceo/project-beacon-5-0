import React from 'react';
import { Hearing } from '@/types/hearings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { formatDateForDisplay, formatTimeForDisplay } from '@/utils/dateFormatters';
import { useAppState } from '@/contexts/AppStateContext';
import { HEARING_STATUS_COLORS } from '@/config/hearingMiniCalendar';
import { useNavigate } from 'react-router-dom';

interface HearingMiniCalendarItemProps {
  hearing: Hearing;
  showClient?: boolean;
  showAssignee?: boolean;
}

export const HearingMiniCalendarItem: React.FC<HearingMiniCalendarItemProps> = ({
  hearing,
  showClient = true,
}) => {
  const { state } = useAppState();
  const navigate = useNavigate();

  // Get related data
  const caseData = state.cases.find(c => c.id === hearing.case_id);
  const court = state.courts.find(c => c.id === hearing.court_id);
  const client = caseData ? state.clients.find(cl => cl.id === caseData.clientId) : null;
  
  const statusConfig = HEARING_STATUS_COLORS[hearing.status] || HEARING_STATUS_COLORS.scheduled;

  const handleOpenCase = (e: React.MouseEvent) => {
    e.preventDefault();
    if (caseData) {
      navigate(`/case/${caseData.id}`);
    }
  };

  // Truncate middle of long titles
  const truncateMiddle = (str: string, maxLength = 40) => {
    if (str.length <= maxLength) return str;
    const start = str.substring(0, maxLength / 2 - 2);
    const end = str.substring(str.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

  const caseTitle = caseData?.title || 'Unknown Case';

  return (
    <TooltipProvider>
      <div 
        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group cursor-pointer"
        onClick={handleOpenCase}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenCase(e as any);
          }
        }}
        aria-label={`Open ${caseTitle}`}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Primary: Case Title */}
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium text-foreground truncate cursor-default">
                {truncateMiddle(caseTitle)}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{caseTitle}</p>
            </TooltipContent>
          </Tooltip>

          {/* Meta Row: Date • Time • Court • Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateForDisplay(hearing.date)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeForDisplay(hearing.start_time)}
            </span>
            {court && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {court.name}
                </span>
              </>
            )}
          </div>

          {/* Status Badge & Client */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={`${statusConfig.bg} ${statusConfig.text} border-0`}
            >
              {statusConfig.label}
            </Badge>
            
            {/* Optional: Client tag */}
            {showClient && client && (
              <span className="text-xs text-muted-foreground">
                {client.name}
              </span>
            )}
          </div>
        </div>

        {/* Quick Action: Open Case */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenCase}
          className="opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
          aria-label={`Open case ${caseData?.caseNumber || ''}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </TooltipProvider>
  );
};
