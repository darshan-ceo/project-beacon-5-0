import React from 'react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { Label } from '@/components/ui/label';

interface FieldTooltipWrapperProps {
  formId: string;
  fieldId: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const FieldTooltipWrapper: React.FC<FieldTooltipWrapperProps> = ({
  formId,
  fieldId,
  label,
  children,
  required = false,
  className = ""
}) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-1 mb-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <FieldTooltip formId={formId} fieldId={fieldId} />
      </div>
      {children}
    </div>
  );
};