/**
 * Help Button Component
 * Button wrapper with integrated three-layer help system
 */

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';

interface HelpButtonProps extends ButtonProps {
  helpId: string;
  showExplanation?: boolean;
  wrapperClassName?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  helpId,
  showExplanation = false,
  wrapperClassName = "",
  children,
  ...buttonProps
}) => {
  return (
    <div className={`inline-flex flex-col gap-1 ${wrapperClassName}`}>
      <ThreeLayerHelp 
        helpId={helpId} 
        showExplanation={false}
        showTooltipIcon={true}
      >
        <Button {...buttonProps}>
          {children}
        </Button>
      </ThreeLayerHelp>
      
      {/* Optional: Show explanation below button */}
      {showExplanation && (
        <ThreeLayerHelp 
          helpId={helpId} 
          showExplanation={true}
          showTooltipIcon={false}
        />
      )}
    </div>
  );
};
