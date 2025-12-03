import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentBreach } from '@/services/complianceDashboardService';

interface RecentBreachesCardProps {
  data: RecentBreach[];
}

export const RecentBreachesCard: React.FC<RecentBreachesCardProps> = ({ data }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Recent Breaches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No breaches found</p>
            <p className="text-sm">Great job maintaining compliance!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((breach) => (
              <div
                key={breach.id}
                className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{breach.caseNumber}</span>
                    <Badge variant="destructive" className="text-xs">
                      {breach.daysOverdue}d overdue
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {breach.clientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Breach: {new Date(breach.breachDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/cases?id=${breach.caseId}`)}
                  className="ml-2 flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
