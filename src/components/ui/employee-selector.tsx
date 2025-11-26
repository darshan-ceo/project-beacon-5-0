import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, User } from 'lucide-react';
import { Employee, useAppState } from '@/contexts/AppStateContext';
import { ContextBadge } from '@/components/ui/context-badge';

interface EmployeeSelectorProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  roleFilter?: Employee['role'][];
  showAsContext?: boolean;
  contextValue?: string;
  onViewContext?: () => void;
  onClearContext?: () => void;
  departmentFilter?: string[];
  statusFilter?: Employee['status'][];
  showWorkload?: boolean;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  label = "Assigned To",
  value,
  onValueChange,
  placeholder = "Select employee...",
  disabled = false,
  required = false,
  roleFilter,
  showAsContext = false,
  contextValue,
  onViewContext,
  onClearContext,
  departmentFilter,
  statusFilter = ['Active'],
  showWorkload = false
}) => {
  const { state } = useAppState();

  // Filter employees based on criteria
  const filteredEmployees = state.employees.filter(employee => {
    if (statusFilter && !statusFilter.includes(employee.status)) return false;
    if (roleFilter && !roleFilter.includes(employee.role)) return false;
    if (departmentFilter && !departmentFilter.includes(employee.department)) return false;
    return true;
  });

  // Get selected employee details
  const selectedEmployee = state.employees.find(emp => emp.id === value);

  if (showAsContext && contextValue) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <ContextBadge
          label={label}
          value={contextValue}
          variant="outline"
          onView={onViewContext}
          onRemove={onClearContext}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={placeholder} />
          </div>
        </SelectTrigger>
        <SelectContent className="z-[200] bg-background border border-border shadow-lg">
          {filteredEmployees.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              No employees available
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{employee.full_name}</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {employee.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {employee.department}
                      </span>
                      {showWorkload && (
                        <span className="text-xs text-muted-foreground">
                          Capacity: {employee.workloadCapacity}h
                        </span>
                      )}
                    </div>
                  </div>
                  {employee.status !== 'Active' && (
                    <Badge variant="outline" className="text-xs">
                      {employee.status}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      
      {selectedEmployee && (
        <div className="text-xs text-muted-foreground">
          {selectedEmployee.email} • {selectedEmployee.department}
          {selectedEmployee.specialization && selectedEmployee.specialization.length > 0 && (
            <span> • {selectedEmployee.specialization.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Specialized selectors for different use cases
export const CASelector: React.FC<Omit<EmployeeSelectorProps, 'roleFilter' | 'label'>> = (props) => (
  <EmployeeSelector
    {...props}
    label="Assigned CA"
    roleFilter={['CA', 'Partner']}
    placeholder="Select CA..."
  />
);

export const PartnerSelector: React.FC<Omit<EmployeeSelectorProps, 'roleFilter' | 'label'>> = (props) => (
  <EmployeeSelector
    {...props}
    label="Partner"
    roleFilter={['Partner']}
    placeholder="Select partner..."
  />
);

export const LawyerSelector: React.FC<Omit<EmployeeSelectorProps, 'roleFilter' | 'label'>> = (props) => (
  <EmployeeSelector
    {...props}
    label="Assigned Lawyer"
    roleFilter={['Partner', 'Advocate']}
    placeholder="Select lawyer..."
  />
);

export const TeamMemberSelector: React.FC<Omit<EmployeeSelectorProps, 'label'>> = (props) => (
  <EmployeeSelector
    {...props}
    label="Team Member"
    placeholder="Select team member..."
  />
);