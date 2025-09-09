import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Phone, Mail, Scale, Clock, Calendar } from 'lucide-react';
import { Judge, useAppState } from '@/contexts/AppStateContext';

interface JudgeInfoCardProps {
  judge: Judge;
  className?: string;
}

export const JudgeInfoCard: React.FC<JudgeInfoCardProps> = ({ judge, className }) => {
  const { state } = useAppState();
  
  const court = state.courts.find(c => c.id === judge.courtId);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Retired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'Transferred': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const calculateYearsOfService = () => {
    if (!judge.appointmentDate) return 0;
    const now = new Date();
    const appointment = new Date(judge.appointmentDate);
    return Math.floor((now.getTime() - appointment.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          Judge Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <div className="font-semibold text-foreground">{judge.name}</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {judge.designation}
            </Badge>
            <Badge className={`text-xs ${getStatusColor(judge.status)}`}>
              {judge.status}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Court Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-3 w-3" />
            Court Assignment
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>{court?.name || 'Unknown Court'}</div>
            {judge.bench && <div>Bench: {judge.bench}</div>}
            {judge.jurisdiction && <div>Jurisdiction: {judge.jurisdiction}</div>}
          </div>
        </div>

        {/* Location */}
        {(judge.city || judge.state) && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-3 w-3" />
                Location
              </div>
              <div className="text-sm text-muted-foreground">
                {[judge.city, judge.state].filter(Boolean).join(', ')}
              </div>
            </div>
          </>
        )}

        {/* Contact Information */}
        {(judge.email || judge.phone || judge.chambers) && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-3 w-3" />
                Contact
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {judge.chambers && <div>Chambers: {judge.chambers}</div>}
                {judge.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {judge.email}
                  </div>
                )}
                {judge.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {judge.phone}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Experience */}
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-3 w-3" />
            Experience
          </div>
          <div className="text-sm text-muted-foreground">
            {calculateYearsOfService()} years of service
          </div>
        </div>

        {/* Specializations */}
        {judge.specialization && judge.specialization.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium">Specializations</div>
              <div className="flex flex-wrap gap-1">
                {judge.specialization.slice(0, 3).map((spec) => (
                  <Badge 
                    key={spec} 
                    variant="secondary" 
                    className={`text-xs ${spec === 'GST/Indirect Tax' ? 'border-primary text-primary' : ''}`}
                  >
                    {spec}
                  </Badge>
                ))}
                {judge.specialization.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{judge.specialization.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Availability */}
        {judge.availability && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-3 w-3" />
                Availability
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {judge.availability.days && judge.availability.days.length > 0 && (
                  <div>Days: {judge.availability.days.join(', ')}</div>
                )}
                {judge.availability.startTime && judge.availability.endTime && (
                  <div>Hours: {judge.availability.startTime} - {judge.availability.endTime}</div>
                )}
                {judge.availability.notes && (
                  <div className="text-xs italic">{judge.availability.notes}</div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};