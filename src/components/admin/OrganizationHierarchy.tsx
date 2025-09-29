import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppState } from '@/contexts/AppStateContext';
import { Employee } from '@/contexts/AppStateContext';
import { Users, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HierarchyNode {
  employee: Employee;
  directReports: HierarchyNode[];
  level: number;
}

interface OrganizationHierarchyProps {
  onEmployeeSelect?: (employee: Employee) => void;
  selectedEmployeeId?: string;
}

export const OrganizationHierarchy: React.FC<OrganizationHierarchyProps> = ({
  onEmployeeSelect,
  selectedEmployeeId
}) => {
  const { state } = useAppState();

  // Build hierarchy structure
  const hierarchy = useMemo(() => {
    const employeeMap = new Map<string, Employee>();
    const rootNodes: HierarchyNode[] = [];
    
    // Create employee map
    state.employees
      .filter(emp => emp.status === 'Active')
      .forEach(emp => employeeMap.set(emp.id, emp));

    // Build hierarchy recursively
    const buildNode = (employee: Employee, level: number = 0): HierarchyNode => {
      const directReports = state.employees
        .filter(emp => emp.managerId === employee.id && emp.status === 'Active')
        .map(emp => buildNode(emp, level + 1))
        .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name));

      return {
        employee,
        directReports,
        level
      };
    };

    // Find root employees (no manager)
    const rootEmployees = state.employees
      .filter(emp => !emp.managerId && emp.status === 'Active')
      .sort((a, b) => {
        // Sort by role hierarchy: Partner > CA > Others
        const roleOrder = { 'Partner': 0, 'CA': 1 };
        const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 2;
        const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 2;
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.full_name.localeCompare(b.full_name);
      });

    rootEmployees.forEach(emp => {
      rootNodes.push(buildNode(emp));
    });

    return rootNodes;
  }, [state.employees]);

  const getRoleColor = (role: string) => {
    const colors = {
      'Partner': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'CA': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Advocate': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Manager': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'Staff': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'RM': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Finance': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'Admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderNode = (node: HierarchyNode, isExpanded: boolean = true) => {
    const [expanded, setExpanded] = React.useState(isExpanded);
    const isSelected = selectedEmployeeId === node.employee.id;
    const hasReports = node.directReports.length > 0;

    return (
      <motion.div
        key={node.employee.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="flex items-center space-x-2 mb-2">
          {/* Indentation */}
          <div style={{ width: `${node.level * 24}px` }} />
          
          {/* Expand/Collapse Button */}
          {hasReports && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {!hasReports && <div className="w-6" />}

          {/* Employee Card */}
          <Card 
            className={`flex-1 cursor-pointer transition-colors ${
              isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => onEmployeeSelect?.(node.employee)}
          >
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(node.employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm truncate">
                        {node.employee.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {node.employee.email}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleColor(node.employee.role)} variant="secondary">
                        {node.employee.role}
                      </Badge>
                      {hasReports && (
                        <Badge variant="outline" className="text-xs">
                          {node.directReports.length} reports
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {node.employee.specialization && node.employee.specialization.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground">
                        {node.employee.specialization.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Direct Reports */}
        {hasReports && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-6 border-l border-border pl-2"
          >
            {node.directReports.map(childNode => renderNode(childNode, true))}
          </motion.div>
        )}
      </motion.div>
    );
  };

  const getHierarchyStats = () => {
    const totalEmployees = state.employees.filter(emp => emp.status === 'Active').length;
    const managersCount = state.employees.filter(emp => 
      emp.status === 'Active' && (
        state.employees.some(report => report.managerId === emp.id && report.status === 'Active') ||
        emp.role === 'Manager'
      )
    ).length;
    
    const maxLevel = hierarchy.length > 0 ? Math.max(...hierarchy.map(node => getMaxLevel(node))) : 0;
    
    return { totalEmployees, managersCount, maxLevel };
  };

  const getMaxLevel = (node: HierarchyNode): number => {
    if (node.directReports.length === 0) return node.level;
    return Math.max(node.level, ...node.directReports.map(getMaxLevel));
  };

  const stats = getHierarchyStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-primary" />
            Organization Hierarchy
          </h2>
          <p className="text-muted-foreground">
            Visual representation of reporting relationships
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managersCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hierarchy Levels</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maxLevel + 1}</div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Organizational Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hierarchy.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No organizational hierarchy found</p>
                <p className="text-sm">Add manager relationships to employees to see the hierarchy</p>
              </div>
            ) : (
              hierarchy.map(node => renderNode(node))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};