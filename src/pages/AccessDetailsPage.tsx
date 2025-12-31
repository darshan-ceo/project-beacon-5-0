/**
 * Access Details Page
 * Shows comprehensive data access information for the logged-in user
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { hierarchyService } from '@/services/hierarchyService';
import { 
  Briefcase, Users, UserCheck, Building2, ArrowLeft, Eye, 
  FileText, FolderOpen, Info, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export const AccessDetailsPage: React.FC = () => {
  const { state } = useAppState();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Find current employee and calculate visibility
  const accessData = useMemo(() => {
    if (!user?.email) return null;
    
    const currentEmployee = state.employees.find(e => 
      e.email?.toLowerCase() === user.email?.toLowerCase() || 
      e.officialEmail?.toLowerCase() === user.email?.toLowerCase()
    );
    
    if (!currentEmployee) return null;

    // CRITICAL FIX: Handle both camelCase (mapped) and snake_case (raw) field names
    const managerId = currentEmployee.managerId || 
                      currentEmployee.reportingTo ||
                      (currentEmployee as any).reporting_to;
    
    const manager = managerId 
      ? state.employees.find(e => e.id === managerId)
      : null;

    // Get direct reports - check both field naming conventions
    const directReports = state.employees.filter(e => 
      e.managerId === currentEmployee.id || 
      e.reportingTo === currentEmployee.id ||
      (e as any).reporting_to === currentEmployee.id
    );

    // CRITICAL FIX: Use hierarchyService to get normalized dataScope
    const normalizedDataScope = hierarchyService.getEmployeeDataScope(currentEmployee);

    // CRITICAL FIX: Use actual state counts (already RLS-filtered by database)
    const actualCounts = {
      cases: state.cases.length,
      tasks: state.tasks.length,
      clients: state.clients.length,
    };

    // CRITICAL FIX: Calculate breakdown from actual RLS-filtered cases
    // Instead of relying on frontend visibility calculation that may not match RLS
    const breakdown = {
      direct: 0,
      viaManager: 0,
      team: 0,
      orgWide: 0,
    };

    // Categorize each case based on how the user can access it
    state.cases.forEach(caseItem => {
      const assignedToId = (caseItem as any).assignedToId || (caseItem as any).assigned_to;
      const ownerId = (caseItem as any).ownerId || (caseItem as any).owner_id;
      
      // Direct: assigned to or owned by current user
      if (assignedToId === currentEmployee.id || ownerId === currentEmployee.id) {
        breakdown.direct++;
      } 
      // Via Manager: assigned to or owned by manager
      else if (managerId && (assignedToId === managerId || ownerId === managerId)) {
        breakdown.viaManager++;
      }
      // Team: assigned to or owned by someone with same manager
      else if (managerId) {
        const caseOwnerOrAssignee = state.employees.find(e => 
          e.id === assignedToId || e.id === ownerId
        );
        const caseEmployeeManagerId = caseOwnerOrAssignee?.managerId || 
                                       caseOwnerOrAssignee?.reportingTo ||
                                       (caseOwnerOrAssignee as any)?.reporting_to;
        
        if (caseEmployeeManagerId === managerId) {
          breakdown.team++;
        } else {
          // Org-wide: visible due to data scope permissions
          breakdown.orgWide++;
        }
      } else {
        // If no manager, treat as org-wide
        breakdown.orgWide++;
      }
    });

    return {
      employee: currentEmployee,
      manager,
      directReports,
      dataScope: normalizedDataScope,
      actualCounts,
      breakdown,
    };
  }, [user, state.employees, state.clients, state.cases, state.tasks]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case 'All Cases':
        return 'You can view all cases, clients, and documents across the organization.';
      case 'Team Cases':
        return 'You can view cases assigned to you and your team members (those who report to you or share the same manager).';
      case 'Own Cases':
      default:
        return 'You can view only cases that are directly assigned to you or where you are the owner.';
    }
  };

  if (!accessData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Unable to load access details. Please try again.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, manager, directReports, dataScope, breakdown } = accessData;

  const accessItems = [
    { 
      label: 'Direct', 
      count: breakdown.direct, 
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      description: 'Cases assigned directly to you as the assignee or owner'
    },
    { 
      label: 'Via Manager', 
      count: breakdown.viaManager, 
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      description: 'Cases assigned to your manager that you can view'
    },
    { 
      label: 'Team', 
      count: breakdown.team, 
      icon: Building2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      description: 'Cases from team members who report to the same manager'
    },
    { 
      label: 'Org-wide', 
      count: breakdown.orgWide, 
      icon: Briefcase,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
      description: 'Organization-wide cases visible based on your scope'
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6 text-muted-foreground" />
              My Data Access
            </h1>
            <p className="text-muted-foreground text-sm">
              View your data visibility scope and accessible records
            </p>
          </div>
        </div>
        <Badge variant={dataScope === 'All Cases' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {dataScope}
        </Badge>
      </motion.div>

      {/* Scope Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Your Data Scope: {dataScope}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getScopeDescription(dataScope)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hierarchy Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Position in Hierarchy</CardTitle>
            <CardDescription>Your reporting structure affects your data visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Manager */}
            {manager && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getInitials(manager.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{manager.full_name}</p>
                  <p className="text-xs text-muted-foreground">{manager.role} • {manager.department}</p>
                </div>
                <Badge variant="outline" className="text-xs">Your Manager</Badge>
              </div>
            )}

            {/* Current User */}
            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{employee.full_name}</p>
                <p className="text-xs text-muted-foreground">{employee.role} • {employee.department}</p>
              </div>
              <Badge className="text-xs">You</Badge>
            </div>

            {/* Direct Reports */}
            {directReports.length > 0 && (
              <div className="pl-8 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Your Direct Reports ({directReports.length})</p>
                {directReports.slice(0, 3).map(report => (
                  <div key={report.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(report.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{report.full_name}</p>
                      <p className="text-xs text-muted-foreground">{report.role}</p>
                    </div>
                  </div>
                ))}
                {directReports.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-7">
                    +{directReports.length - 3} more reports
                  </p>
                )}
              </div>
            )}

            {!manager && directReports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reporting hierarchy configured
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Access Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Access Breakdown</CardTitle>
            <CardDescription>How your case visibility is distributed</CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {accessItems.map((item) => (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <div className={`p-4 rounded-lg border ${item.bgColor} ${item.borderColor} cursor-help transition-all hover:scale-105`}>
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <div className={`text-3xl font-bold ${item.color}`}>
                          {item.count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">cases</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Totals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Accessible Records</CardTitle>
            <CardDescription>Summary of all records you can access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div 
                className="text-center p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate('/cases?accessFilter=my')}
              >
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold text-foreground">
                  {accessData.actualCounts.cases}
                </div>
                <div className="text-sm text-muted-foreground">Cases</div>
              </div>
              <div 
                className="text-center p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate('/tasks')}
              >
                <FileText className="h-8 w-8 mx-auto mb-2 text-warning" />
                <div className="text-3xl font-bold text-foreground">
                  {accessData.actualCounts.tasks}
                </div>
                <div className="text-sm text-muted-foreground">Tasks</div>
              </div>
              <div 
                className="text-center p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate('/clients')}
              >
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-success" />
                <div className="text-3xl font-bold text-foreground">
                  {accessData.actualCounts.clients}
                </div>
                <div className="text-sm text-muted-foreground">Clients</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate('/cases?accessFilter=my')}>
                View My Cases
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Visibility Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Understanding Data Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Badge variant="outline" className="shrink-0">Own Cases</Badge>
              <p className="text-muted-foreground">
                Access only to cases where you are the assignee or owner. Most restrictive scope.
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Badge variant="outline" className="shrink-0">Team Cases</Badge>
              <p className="text-muted-foreground">
                Access to your own cases plus cases of your direct reports and team members who share your manager.
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Badge variant="outline" className="shrink-0">All Cases</Badge>
              <p className="text-muted-foreground">
                Full access to all cases in your organization. Typically for admins and partners.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AccessDetailsPage;
