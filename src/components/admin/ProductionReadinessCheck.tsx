import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Shield,
  Users,
  Database,
  FileText,
  Building2,
  Gavel,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  category: 'critical' | 'recommended' | 'optional';
  details?: string;
}

export const ProductionReadinessCheck: React.FC = () => {
  const { state } = useAppState();

  const checks = useMemo((): CheckItem[] => {
    const items: CheckItem[] = [];

    // Critical Checks
    // 1. No sample cases
    const sampleCases = state.cases.filter(c => c.caseNumber?.startsWith('SAMPLE/'));
    items.push({
      id: 'no-sample-cases',
      label: 'No Sample Cases',
      description: 'All sample/test cases have been removed',
      status: sampleCases.length === 0 ? 'pass' : 'fail',
      category: 'critical',
      details: sampleCases.length > 0 ? `${sampleCases.length} sample case(s) found` : undefined
    });

    // 2. At least one admin user (Partner or Admin role)
    const adminUsers = state.employees.filter(e => e.role === 'Partner' || e.role === 'Admin');
    items.push({
      id: 'admin-exists',
      label: 'Admin User Exists',
      description: 'At least one Partner/Admin is configured',
      status: adminUsers.length > 0 ? 'pass' : 'fail',
      category: 'critical',
      details: adminUsers.length > 0 ? `${adminUsers.length} admin(s) configured` : 'No admin users found'
    });

    // 3. All employees have valid roles
    const employeesWithoutRole = state.employees.filter(e => !e.role);
    items.push({
      id: 'employees-have-roles',
      label: 'All Employees Have Roles',
      description: 'Every employee has an assigned role',
      status: employeesWithoutRole.length === 0 ? 'pass' : 'fail',
      category: 'critical',
      details: employeesWithoutRole.length > 0 ? `${employeesWithoutRole.length} employee(s) without roles` : undefined
    });

    // Recommended Checks
    // 4. Courts/Forums configured
    const activeCourts = state.courts.filter(c => c.status === 'Active');
    items.push({
      id: 'courts-configured',
      label: 'Courts/Forums Configured',
      description: 'Legal forums are set up for case filing',
      status: activeCourts.length >= 5 ? 'pass' : activeCourts.length > 0 ? 'warning' : 'fail',
      category: 'recommended',
      details: `${activeCourts.length} active court(s) configured`
    });

    // 5. Judges configured
    const activeJudges = state.judges.filter(j => j.status === 'Active');
    items.push({
      id: 'judges-configured',
      label: 'Judges Configured',
      description: 'Judge master data is populated',
      status: activeJudges.length >= 5 ? 'pass' : activeJudges.length > 0 ? 'warning' : 'fail',
      category: 'recommended',
      details: `${activeJudges.length} active judge(s) configured`
    });

    // 6. Test clients removed
    const testClients = state.clients.filter(c => 
      /test|sample|demo|dummy|new client/i.test(c.name)
    );
    items.push({
      id: 'no-test-clients',
      label: 'No Test Clients',
      description: 'Test/dummy client entries have been removed',
      status: testClients.length === 0 ? 'pass' : 'warning',
      category: 'recommended',
      details: testClients.length > 0 ? `${testClients.length} potential test client(s)` : undefined
    });

    // 7. Employees have managers assigned (hierarchy)
    const employeesWithoutManager = state.employees.filter(e => 
      !e.reportingTo && e.role !== 'Partner' && e.role !== 'Admin'
    );
    items.push({
      id: 'hierarchy-configured',
      label: 'Team Hierarchy Set',
      description: 'Employees have reporting managers assigned',
      status: employeesWithoutManager.length === 0 ? 'pass' : 
              employeesWithoutManager.length <= 3 ? 'warning' : 'fail',
      category: 'recommended',
      details: employeesWithoutManager.length > 0 ? 
        `${employeesWithoutManager.length} employee(s) without manager` : undefined
    });

    // Optional Checks
    // 8. At least 5 courts configured (instead of task bundles - not in AppState)
    items.push({
      id: 'courts-count',
      label: 'Sufficient Courts/Forums',
      description: 'At least 5 legal forums configured for case variety',
      status: activeCourts.length >= 10 ? 'pass' : activeCourts.length >= 5 ? 'warning' : 'fail',
      category: 'optional',
      details: `${activeCourts.length} active court(s) configured`
    });

    // 9. At least 5 active clients
    const activeClients = state.clients.filter(c => c.status === 'Active');
    items.push({
      id: 'clients-configured',
      label: 'Active Clients',
      description: 'Client master data is populated',
      status: activeClients.length >= 5 ? 'pass' : activeClients.length > 0 ? 'warning' : 'fail',
      category: 'optional',
      details: `${activeClients.length} active client(s) configured`
    });

    return items;
  }, [state]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const criticalFails = checks.filter(c => c.category === 'critical' && c.status === 'fail');
  const score = Math.round((passCount / checks.length) * 100);

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getCategoryIcon = (category: CheckItem['category']) => {
    switch (category) {
      case 'critical':
        return <Shield className="h-4 w-4" />;
      case 'recommended':
        return <Database className="h-4 w-4" />;
      case 'optional':
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Production Readiness Check
            </CardTitle>
            <CardDescription>
              Verify your system is ready for live operations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recheck
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Readiness Score</span>
            <span className={`text-lg font-bold ${
              score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-destructive'
            }`}>
              {score}%
            </span>
          </div>
          <Progress value={score} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{passCount} of {checks.length} checks passed</span>
            {criticalFails.length > 0 && (
              <span className="text-destructive font-medium">
                {criticalFails.length} critical issue(s)
              </span>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="text-2xl font-bold text-green-600">
              {checks.filter(c => c.status === 'pass').length}
            </div>
            <div className="text-xs text-green-600">Passed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <div className="text-2xl font-bold text-yellow-600">
              {checks.filter(c => c.status === 'warning').length}
            </div>
            <div className="text-xs text-yellow-600">Warnings</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="text-2xl font-bold text-destructive">
              {checks.filter(c => c.status === 'fail').length}
            </div>
            <div className="text-xs text-destructive">Failed</div>
          </div>
        </div>

        {/* Check List by Category */}
        {(['critical', 'recommended', 'optional'] as const).map(category => {
          const categoryChecks = checks.filter(c => c.category === category);
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <h4 className="font-medium capitalize">{category} Checks</h4>
                <Badge variant={
                  category === 'critical' ? 'destructive' : 
                  category === 'recommended' ? 'secondary' : 'outline'
                } className="text-xs">
                  {categoryChecks.filter(c => c.status === 'pass').length}/{categoryChecks.length}
                </Badge>
              </div>
              
              <div className="space-y-2 pl-6">
                {categoryChecks.map(check => (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      check.status === 'pass' ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200' :
                      check.status === 'warning' ? 'bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200' :
                      'bg-red-50/50 dark:bg-red-950/10 border-red-200'
                    }`}
                  >
                    {getStatusIcon(check.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.description}</div>
                      {check.details && (
                        <div className={`text-xs mt-1 ${
                          check.status === 'pass' ? 'text-green-600' :
                          check.status === 'warning' ? 'text-yellow-600' :
                          'text-destructive'
                        }`}>
                          {check.details}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Ready to Go Message */}
        {criticalFails.length === 0 && score >= 70 && (
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-950/30 border border-green-300 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-green-700 dark:text-green-400">Ready for Production!</h4>
            <p className="text-sm text-green-600 dark:text-green-500">
              All critical checks passed. You can start entering live data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
