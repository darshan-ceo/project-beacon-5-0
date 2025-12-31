/**
 * Access Summary Widget
 * Shows user's accessible cases/tasks summary based on their data scope
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { hierarchyService } from '@/services/hierarchyService';
import { Briefcase, Users, UserCheck, Building2, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AccessSummaryWidgetProps {
  compact?: boolean;
}

export const AccessSummaryWidget: React.FC<AccessSummaryWidgetProps> = ({ compact = false }) => {
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

    const visibility = hierarchyService.calculateVisibility(
      currentEmployee,
      state.employees,
      state.clients,
      state.cases,
      state.tasks
    );

    const summary = hierarchyService.getVisibilitySummary(visibility);
    const manager = state.employees.find(e => 
      e.id === currentEmployee.managerId || e.id === currentEmployee.reportingTo
    );

    // CRITICAL FIX: Use hierarchyService to get normalized dataScope
    const normalizedDataScope = hierarchyService.getEmployeeDataScope(currentEmployee);

    return {
      employee: currentEmployee,
      manager,
      visibility,
      summary,
      dataScope: normalizedDataScope,
    };
  }, [user, state.employees, state.clients, state.cases, state.tasks]);

  if (!accessData) {
    return null;
  }

  const { summary, dataScope, manager } = accessData;

  const accessItems = [
    { 
      label: 'Direct', 
      count: summary.directCases, 
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Cases assigned directly to you'
    },
    { 
      label: 'Via Manager', 
      count: summary.managerCases, 
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Cases assigned to your manager'
    },
    { 
      label: 'Team', 
      count: summary.teamCases, 
      icon: Building2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      description: 'Cases from team members (same manager)'
    },
    { 
      label: 'Org-wide', 
      count: summary.hierarchyCases, 
      icon: Briefcase,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      description: 'Organization-wide visibility'
    },
  ].filter(item => item.count > 0);

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            My Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Data Scope</span>
            <Badge variant="outline" className="text-xs">{dataScope}</Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{summary.totalAccessibleCases}</div>
              <div className="text-[10px] text-muted-foreground">Cases</div>
            </div>
            <div>
              <div className="text-lg font-bold">{summary.totalAccessibleTasks}</div>
              <div className="text-[10px] text-muted-foreground">Tasks</div>
            </div>
            <div>
              <div className="text-lg font-bold">{summary.totalAccessibleClients}</div>
              <div className="text-[10px] text-muted-foreground">Clients</div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => navigate('/admin/access')}
          >
            View Access Details
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              My Access Summary
            </CardTitle>
            <Badge variant={dataScope === 'All Cases' ? 'default' : 'secondary'}>
              {dataScope}
            </Badge>
          </div>
          {manager && (
            <p className="text-xs text-muted-foreground mt-1">
              Reporting to: <span className="font-medium">{manager.full_name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Access Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TooltipProvider>
              {accessItems.map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div className={`p-3 rounded-lg ${item.bgColor} cursor-help`}>
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <div className={`text-xl font-bold ${item.color}`}>
                        {item.count}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* Totals Row */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {summary.totalAccessibleCases}
                </div>
                <div className="text-xs text-muted-foreground">Total Cases</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {summary.totalAccessibleTasks}
                </div>
                <div className="text-xs text-muted-foreground">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {summary.totalAccessibleClients}
                </div>
                <div className="text-xs text-muted-foreground">Total Clients</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/cases?accessFilter=my')}
            >
              View My Cases
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
