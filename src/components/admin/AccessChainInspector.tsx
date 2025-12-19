import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Users,
  Loader2
} from 'lucide-react';
import { AccessChain } from '@/services/hierarchyService';

interface AccessChainInspectorProps {
  accessChain: AccessChain | null;
  loading?: boolean;
  employeeRole?: string; // Employee Master role
  employeeDataScope?: string; // Employee data_scope setting
}

export const AccessChainInspector: React.FC<AccessChainInspectorProps> = ({
  accessChain,
  loading,
  employeeRole,
  employeeDataScope
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Partner': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'CA': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Advocate': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Manager': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'Staff': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'RM': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Clerk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'manager': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'partner': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'ca': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'advocate': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'staff': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getDataScopeColor = (scope?: string) => {
    switch (scope) {
      case 'All Cases':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Team Cases':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Own Cases':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading access chain...</span>
        </CardContent>
      </Card>
    );
  }

  if (!accessChain) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an employee to view their access chain</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          Access Chain
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete access path for <strong>{accessChain.employeeName}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Employee Role (from Employee Master) */}
        {employeeRole && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <User className="h-4 w-4 mr-1 text-primary" />
              Employee Role
              <span className="text-xs text-muted-foreground ml-2">(from Employee Master)</span>
            </h4>
            <div className="flex items-center gap-2">
              <Badge className={getRoleColor(employeeRole)}>
                {employeeRole}
              </Badge>
              {employeeDataScope && (
                <Badge className={getDataScopeColor(employeeDataScope)}>
                  Data Scope: {employeeDataScope}
                </Badge>
              )}
            </div>
          </div>
        )}

        {employeeRole && <Separator />}

        {/* System RBAC Roles (from user_roles table) */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <Shield className="h-4 w-4 mr-1 text-primary" />
            System RBAC Roles
            <span className="text-xs text-muted-foreground ml-2">(from user_roles table)</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {accessChain.roles.length > 0 ? (
              accessChain.roles.map((role) => (
                <Badge key={role} className={getRoleColor(role)}>
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No RBAC roles assigned</span>
            )}
          </div>
          {employeeRole && accessChain.roles.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: RBAC roles should match Employee Role. If mismatched, use "Sync All Roles" in RBAC Management.
            </p>
          )}
        </div>

        <Separator />

        {/* Reports To (Upward Chain) */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <ArrowUp className="h-4 w-4 mr-1 text-blue-500" />
            Reports To
          </h4>
          {accessChain.reportsTo ? (
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                  {getInitials(accessChain.reportsTo.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{accessChain.reportsTo.name}</p>
                <Badge variant="outline" className="text-xs">
                  {accessChain.reportsTo.role}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No manager assigned (Top-level employee)
            </p>
          )}
        </div>

        <Separator />

        {/* Direct Reports (Downward Chain) */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <ArrowDown className="h-4 w-4 mr-1 text-green-500" />
            Direct Reports
            {accessChain.directReports.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {accessChain.directReports.length}
              </Badge>
            )}
          </h4>
          {accessChain.directReports.length > 0 ? (
            <ScrollArea className="h-[120px]">
              <div className="space-y-2">
                {accessChain.directReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="flex items-center space-x-3 p-2 rounded-md border bg-green-50/50 dark:bg-green-950/20"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-green-100 text-green-800 text-xs">
                        {getInitials(report.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{report.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {report.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No direct reports
            </p>
          )}
        </div>

        {/* All Subordinates */}
        {accessChain.allSubordinates.length > accessChain.directReports.length && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1 text-purple-500" />
                All Subordinates
                <Badge variant="secondary" className="ml-2 text-xs">
                  {accessChain.allSubordinates.length}
                </Badge>
              </h4>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {accessChain.allSubordinates.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted/50"
                      style={{ paddingLeft: `${sub.level * 16}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-sm">{sub.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {sub.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        (Level {sub.level})
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Summary */}
        <Separator />
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {accessChain.visibility.clients.length}
            </p>
            <p className="text-xs text-muted-foreground">Clients</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {accessChain.visibility.cases.length}
            </p>
            <p className="text-xs text-muted-foreground">Cases</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {accessChain.visibility.tasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
