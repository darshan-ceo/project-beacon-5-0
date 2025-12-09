import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppState } from '@/contexts/AppStateContext';
import { Employee } from '@/contexts/AppStateContext';
import { 
  Users, 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  Layers,
  BarChart3,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hierarchyService, HierarchyNode, AccessChain, TeamStatistics } from '@/services/hierarchyService';
import { AccessChainInspector } from './AccessChainInspector';
import { VisibilityMatrix } from './VisibilityMatrix';

export const TeamHierarchyView: React.FC = () => {
  const { state } = useAppState();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [accessChain, setAccessChain] = useState<AccessChain | null>(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build hierarchy from employees
  const hierarchy = useMemo(() => {
    return hierarchyService.buildHierarchy(state.employees);
  }, [state.employees]);

  // Calculate statistics
  const stats: TeamStatistics = useMemo(() => {
    return hierarchyService.getTeamStatistics(state.employees, hierarchy);
  }, [state.employees, hierarchy]);

  // Handle employee selection
  const handleEmployeeSelect = useCallback(async (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setLoadingChain(true);
    
    try {
      const chain = await hierarchyService.getAccessChain(
        employee.id,
        state.employees,
        state.clients,
        state.cases,
        state.tasks
      );
      setAccessChain(chain);
    } catch (error) {
      console.error('Failed to load access chain:', error);
      setAccessChain(null);
    } finally {
      setLoadingChain(false);
    }
  }, [state.employees, state.clients, state.cases, state.tasks]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.employee.id);
        collectIds(node.directReports);
      });
    };
    collectIds(hierarchy);
    setExpandedNodes(allIds);
  }, [hierarchy]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

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
      'Finance': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'Admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Clerk': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  // Render a single node in the hierarchy tree
  const renderNode = (node: HierarchyNode) => {
    const isExpanded = expandedNodes.has(node.employee.id);
    const isSelected = selectedEmployeeId === node.employee.id;
    const hasReports = node.directReports.length > 0;

    return (
      <div key={node.employee.id} className="relative">
        <div className="flex items-center space-x-2 mb-2">
          {/* Indentation */}
          <div style={{ width: `${node.level * 24}px` }} />
          
          {/* Expand/Collapse Button */}
          {hasReports ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.employee.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}

          {/* Employee Card */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${
              isSelected 
                ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                : 'hover:bg-muted/50 hover:border-primary/50'
            }`}
            onClick={() => handleEmployeeSelect(node.employee)}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(node.employee.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {node.employee.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {node.employee.email}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge className={`${getRoleColor(node.employee.role)} text-xs`}>
                      {node.employee.role}
                    </Badge>
                    {hasReports && (
                      <Badge variant="outline" className="text-xs">
                        {node.totalReports} {node.totalReports === 1 ? 'report' : 'reports'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Direct Reports */}
        <AnimatePresence>
          {hasReports && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-6 border-l-2 border-dashed border-muted pl-2"
            >
              {node.directReports.map(childNode => renderNode(childNode))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maxLevels}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTeamSize}</div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.roleDistribution).map(([role, count]) => (
              <Badge 
                key={role} 
                variant="secondary" 
                className={getRoleColor(role)}
              >
                {role}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Hierarchy + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hierarchy Tree */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-primary" />
                Reporting Structure
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Click an employee to view their access details
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
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

        {/* Access Details Panel */}
        <div className="space-y-6">
          {loadingChain ? (
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading access details...</span>
              </CardContent>
            </Card>
          ) : (
            <>
              <AccessChainInspector accessChain={accessChain} />
              <VisibilityMatrix 
                visibility={accessChain?.visibility || null} 
                employeeName={accessChain?.employeeName || ''}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
