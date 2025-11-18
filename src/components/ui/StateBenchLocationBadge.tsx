import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { Case } from '@/contexts/AppStateContext';

interface StateBenchLocationBadgeProps {
  caseData: Case | null | undefined;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

/**
 * StateBenchLocationBadge Component
 * 
 * Displays the state and city location for Tribunal State Bench cases.
 * Shows only when case is at Tribunal stage with State Bench matter type.
 * 
 * Usage:
 * <StateBenchLocationBadge caseData={case} variant="outline" />
 */
export const StateBenchLocationBadge: React.FC<StateBenchLocationBadgeProps> = ({
  caseData,
  variant = 'outline',
  className = ''
}) => {
  // Only display for Tribunal State Bench cases with location data
  if (!caseData) return null;
  
  const isStateBenchCase = 
    caseData.currentStage === 'Tribunal' && 
    (caseData as any).matterType === 'state_bench';
  
  const hasLocationData = 
    caseData.stateBenchState && 
    caseData.stateBenchCity;

  if (!isStateBenchCase || !hasLocationData) return null;

  return (
    <Badge 
      variant={variant} 
      className={`flex items-center gap-1 ${className}`}
    >
      <MapPin className="h-3 w-3" />
      {caseData.stateBenchState} - {caseData.stateBenchCity}
    </Badge>
  );
};
