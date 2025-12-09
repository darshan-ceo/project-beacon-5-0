import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  Eye, 
  ArrowRight,
  Building2,
  GitBranch
} from 'lucide-react';
import { EmployeeVisibility, AccessPath } from '@/services/hierarchyService';

interface VisibilityMatrixProps {
  visibility: EmployeeVisibility | null;
  employeeName: string;
  loading?: boolean;
}

export const VisibilityMatrix: React.FC<VisibilityMatrixProps> = ({
  visibility,
  employeeName,
  loading
}) => {
  const getAccessTypeIcon = (type: AccessPath['type']) => {
    switch (type) {
      case 'direct':
        return <Eye className="h-3 w-3" />;
      case 'ownership':
        return <Users className="h-3 w-3" />;
      case 'team':
        return <GitBranch className="h-3 w-3" />;
      case 'hierarchy':
        return <Building2 className="h-3 w-3" />;
      case 'department':
        return <Building2 className="h-3 w-3" />;
      default:
        return <ArrowRight className="h-3 w-3" />;
    }
  };

  const getAccessTypeColor = (type: AccessPath['type']) => {
    switch (type) {
      case 'direct':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'ownership':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'team':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'hierarchy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'department':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const accessTypeCounts = useMemo(() => {
    if (!visibility) return {};
    
    const counts: Record<string, number> = {};
    [...visibility.clients, ...visibility.cases, ...visibility.tasks].forEach(item => {
      const type = item.accessPath.type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [visibility]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!visibility) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an employee to view their data visibility</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Eye className="h-5 w-5 mr-2 text-primary" />
          Data Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          What <strong>{employeeName}</strong> can access
        </p>
      </CardHeader>
      <CardContent>
        {/* Access Type Legend */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
          {Object.entries(accessTypeCounts).map(([type, count]) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className={getAccessTypeColor(type as AccessPath['type'])}
            >
              {getAccessTypeIcon(type as AccessPath['type'])}
              <span className="ml-1 capitalize">{type}</span>
              <span className="ml-1">({count})</span>
            </Badge>
          ))}
        </div>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {visibility.clients.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Cases</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {visibility.cases.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {visibility.tasks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-4">
            <ScrollArea className="h-[300px]">
              {visibility.clients.length > 0 ? (
                <div className="space-y-2">
                  {visibility.clients.slice(0, 50).map((client, idx) => (
                    <div 
                      key={client.id || idx}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium truncate flex-1">
                        {client.name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-xs ${getAccessTypeColor(client.accessPath.type)}`}
                      >
                        {getAccessTypeIcon(client.accessPath.type)}
                        <span className="ml-1 capitalize">{client.accessPath.type}</span>
                      </Badge>
                    </div>
                  ))}
                  {visibility.clients.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {visibility.clients.length - 50} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No client access</p>
                </div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {visibility.clients.length} of {visibility.totalClients} total clients
            </div>
          </TabsContent>

          <TabsContent value="cases" className="mt-4">
            <ScrollArea className="h-[300px]">
              {visibility.cases.length > 0 ? (
                <div className="space-y-2">
                  {visibility.cases.slice(0, 50).map((caseItem, idx) => (
                    <div 
                      key={caseItem.id || idx}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium truncate flex-1">
                        {caseItem.name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-xs ${getAccessTypeColor(caseItem.accessPath.type)}`}
                      >
                        {getAccessTypeIcon(caseItem.accessPath.type)}
                        <span className="ml-1 capitalize">{caseItem.accessPath.type}</span>
                      </Badge>
                    </div>
                  ))}
                  {visibility.cases.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {visibility.cases.length - 50} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No case access</p>
                </div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {visibility.cases.length} of {visibility.totalCases} total cases
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ScrollArea className="h-[300px]">
              {visibility.tasks.length > 0 ? (
                <div className="space-y-2">
                  {visibility.tasks.slice(0, 50).map((task, idx) => (
                    <div 
                      key={task.id || idx}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium truncate flex-1">
                        {task.name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-xs ${getAccessTypeColor(task.accessPath.type)}`}
                      >
                        {getAccessTypeIcon(task.accessPath.type)}
                        <span className="ml-1 capitalize">{task.accessPath.type}</span>
                      </Badge>
                    </div>
                  ))}
                  {visibility.tasks.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {visibility.tasks.length - 50} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No task access</p>
                </div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {visibility.tasks.length} of {visibility.totalTasks} total tasks
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
