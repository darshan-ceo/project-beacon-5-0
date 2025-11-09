import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
        <SelectTrigger className="bg-background">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
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
  showAddNew?: boolean;
  onAddNew?: () => void;
}> = ({ clients, showAddNew, onAddNew, ...props }) => {
  const options = clients.map(client => ({
    id: client.id,
    label: client.name,
    subtitle: `${client.type} • ${client.email}`
  }));

  if (showAddNew) {
    return (
      <div className="space-y-2">
        <Label>
          Client
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={props.value} onValueChange={props.onValueChange} disabled={props.disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddNew}
            disabled={props.disabled}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

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
          label="Legal Forum"
          options={options}
          placeholder="Select Legal Forum"
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
      label="Judge (Optional)"
      options={options}
      placeholder="Select judge (optional)"
      required={false}
      {...props}
    />
  );
};

// Authority Selector - Shows only Courts with authorityLevel
export const AuthoritySelector: React.FC<{
  courts: Court[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  filterByLevel?: string;
}> = ({ courts, filterByLevel, required = true, ...props }) => {
  // Filter courts to only show those with authorityLevel defined and Active status
  const authorityCourts = courts.filter(court => 
    court.authorityLevel && 
    (!filterByLevel || court.authorityLevel === filterByLevel)
  );

  const options = authorityCourts.map(court => ({
    id: court.id,
    label: court.name,
    subtitle: `${court.authorityLevel} • ${court.city || court.jurisdiction}`
  }));

  return (
    <RelationshipSelector
      label="Authority"
      options={options}
      placeholder="Select GST Authority"
      required={required}
      {...props}
    />
  );
};

// Legal Forum Selector - Shows all Courts (Forums)
export const LegalForumSelector: React.FC<{
  courts: Court[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  filterByStatus?: 'Active' | 'Inactive';
}> = ({ courts, filterByStatus, required = true, ...props }) => {
  // Filter courts by status if specified (default to all)
  const forumCourts = filterByStatus 
    ? courts.filter(court => court.status === filterByStatus)
    : courts;

  const options = forumCourts.map(court => ({
    id: court.id,
    label: court.name,
    subtitle: `${court.type} • ${court.city || court.jurisdiction}`
  }));

  return (
    <RelationshipSelector
      label="Legal Forum"
      options={options}
      placeholder="Select Legal Forum"
      required={required}
      {...props}
    />
  );
};