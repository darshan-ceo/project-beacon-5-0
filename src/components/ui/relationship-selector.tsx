import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ContextBadge } from './context-badge';
import { Client, Case, Court, Judge } from '@/contexts/AppStateContext';

interface RelationshipSelectorProps {
  label: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; label: string; subtitle?: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
}

export const RelationshipSelector: React.FC<RelationshipSelectorProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = `Select ${label.toLowerCase()}`,
  disabled = false,
  required = false,
  showAsContext = false,
  contextValue,
  onViewContext,
  onClearContext
}) => {
  if (showAsContext && contextValue) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <ContextBadge
          label={label}
          value={contextValue}
          onView={onViewContext}
          onRemove={onClearContext}
          variant="outline"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(' ', '-')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.subtitle && (
                  <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Specialized selectors for common use cases
export const ClientSelector: React.FC<{
  clients: Client[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
}> = ({ clients, ...props }) => {
  const options = clients.map(client => ({
    id: client.id,
    label: client.name,
    subtitle: `${client.type} • ${client.email}`
  }));

  return (
    <RelationshipSelector
      label="Client"
      options={options}
      placeholder="Select client"
      required
      {...props}
    />
  );
};

export const CaseSelector: React.FC<{
  cases: Case[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
}> = ({ cases, ...props }) => {
  const options = cases.map(case_ => ({
    id: case_.id,
    label: case_.caseNumber,
    subtitle: case_.title
  }));

  return (
    <RelationshipSelector
      label="Case"
      options={options}
      placeholder="Select case"
      required
      {...props}
    />
  );
};

export const CourtSelector: React.FC<{
  courts: Court[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
}> = ({ courts, ...props }) => {
  const options = courts.map(court => ({
    id: court.id,
    label: court.name,
    subtitle: `${court.type} • ${court.jurisdiction}`
  }));

  return (
    <RelationshipSelector
      label="Court"
      options={options}
      placeholder="Select court"
      required
      {...props}
    />
  );
};

export const JudgeSelector: React.FC<{
  judges: Judge[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
}> = ({ judges, ...props }) => {
  const options = judges.map(judge => ({
    id: judge.id,
    label: judge.name,
    subtitle: `${judge.designation} • ${judge.specialization.join(', ')}`
  }));

  return (
    <RelationshipSelector
      label="Judge"
      options={options}
      placeholder="Select judge"
      required
      {...props}
    />
  );
};