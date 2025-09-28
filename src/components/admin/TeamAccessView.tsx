import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAppState } from '@/contexts/AppStateContext';
import { Employee } from '@/contexts/AppStateContext';
import { type RoleEntity } from '@/persistence/unifiedStore';
import { secureDataService } from '@/services/secureDataService';
import { Users, Eye, Building, Globe, ChevronRight } from 'lucide-react';

interface TeamAccessViewProps {
  role: RoleEntity;
  selectedEmployee?: Employee;
}

interface AccessibleEmployee {
  employee: Employee;
  accessReason: 'self' | 'direct_report' | 'department' | 'organization';
  level: number;
}

export const TeamAccessView: React.FC<TeamAccessViewProps> = ({
  role,
  selectedEmployee
}) => {
  const { state } = useAppState();

  // Calculate what employees this role can access
  const accessibleEmployees = useMemo(() => {
    if (!selectedEmployee) return [];

    const employees: AccessibleEmployee[] = [];
    
    // Always can access self
    employees.push({
      employee: selectedEmployee,
      accessReason: 'self',
      level: 0
    });

    // Simplified scope logic - in a real implementation this would check permissions
    const activeEmployees = state.employees.filter(emp => emp.status === 'Active');
    
    // Add direct reports if employee has them
    const directReports = secureDataService.getDirectReports(selectedEmployee.id, activeEmployees);
    directReports.forEach(emp => {
      employees.push({
        employee: emp,
        accessReason: 'direct_report',
        level: 1
      });
    });
    
    // Add department colleagues  
    const departmentColleagues = activeEmployees.filter(emp => 
      emp.department === selectedEmployee.department && 
      emp.id !== selectedEmployee.id &&
      !employees.some(e => e.employee.id === emp.id)
    );
    
    departmentColleagues.forEach(emp => {
      employees.push({
        employee: emp,
        accessReason: 'department',
        level: 1
      });
    });

    return employees.sort((a, b) => {
      // Sort by access reason priority, then by name
      const reasonOrder = { 'self': 0, 'direct_report': 1, 'department': 2, 'organization': 3 };
      const reasonDiff = reasonOrder[a.accessReason] - reasonOrder[b.accessReason];
      if (reasonDiff !== 0) return reasonDiff;
      
      return a.employee.full_name.localeCompare(b.employee.full_name);
    });
  }, [role, selectedEmployee, state.employees]);

  const getAccessReasonInfo = (reason: AccessibleEmployee['accessReason']) => {
    switch (reason) {
      case 'self':
        return {
          label: 'Self',
          icon: Eye,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          description: 'Own records and data'
        };
      case 'direct_report':
        return {
          label: 'Team Member',
          icon: Users,
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          description: 'Direct or indirect report'
        };
      case 'department':
        return {
          label: 'Department',
          icon: Building,
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
          description: 'Same department colleague'
        };
      case 'organization':
        return {
          label: 'Organization',
          icon: Globe,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          description: 'Organization-wide access'
        };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, AccessibleEmployee[]> = {};
    
    accessibleEmployees.forEach(emp => {
      const key = emp.accessReason;
      if (!groups[key]) groups[key] = [];
      groups[key].push(emp);
    });
    
    return groups;
  }, [accessibleEmployees]);

  if (!selectedEmployee) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an employee to preview team access</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Team Access Preview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Employees that <strong>{selectedEmployee.full_name}</strong> with role <strong>{role.name}</strong> can access
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedEmployees).map(([reason, employees]) => {
              const reasonInfo = getAccessReasonInfo(reason as AccessibleEmployee['accessReason']);
              const ReasonIcon = reasonInfo.icon;
              
              return (
                <div key={reason}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge className={reasonInfo.color} variant="secondary">
                      <ReasonIcon className="h-3 w-3 mr-1" />
                      {reasonInfo.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {employees.length} employee{employees.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {reasonInfo.description}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    {employees.map((emp) => (
                      <div
                        key={emp.employee.id}
                        className="flex items-center space-x-3 p-2 rounded border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(emp.employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm truncate">
                                {emp.employee.full_name}
                                {emp.level > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Level {emp.level})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {emp.employee.role} • {emp.employee.department}
                              </p>
                            </div>
                            
                            {emp.employee.id === selectedEmployee.id && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {emp.level > 0 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {reason !== 'organization' && <Separator />}
                </div>
              );
            })}
            
            {accessibleEmployees.length === 1 && (
              <div className="text-center py-4 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Only self-access with current permissions</p>
                <p className="text-xs">Add team, department, or organization scope to expand access</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total accessible employees:</span>
            <Badge variant="outline">
              {accessibleEmployees.length} of {state.employees.filter(e => e.status === 'Active').length}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};