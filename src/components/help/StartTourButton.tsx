import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { tourService } from '@/services/tourService';
import { featureFlagService } from '@/services/featureFlagService';

interface StartTourButtonProps {
  tourId: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  text?: string;
}

export const StartTourButton: React.FC<StartTourButtonProps> = ({
  tourId,
  className,
  variant = "outline",
  size = "sm",
  text = "Start Tour"
}) => {
  // Only show if tours are enabled
  if (!featureFlagService.isEnabled('help_tours_v1')) {
    return null;
  }

  const handleStartTour = () => {
    tourService.startTour(tourId);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartTour}
      className={`flex items-center gap-2 ${className}`}
    >
      <HelpCircle className="w-4 h-4" />
      {text}
    </Button>
  );
};