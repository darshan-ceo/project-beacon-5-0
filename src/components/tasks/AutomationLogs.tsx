import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AutomationLog, AutomationStats } from '@/types/automation';
import { automationRuleEngine } from '@/services/automationRuleEngine';
import { RefreshCw, Search, Filter, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Zap, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export const AutomationLogs: React.FC = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  const loadLogs = async () => {
    try {
      await automationRuleEngine.initialize();
      const loadedLogs = await automationRuleEngine.getExecutionLogs();
      setLogs(loadedLogs);
    } catch (error) {
      console.error('Failed to load automation logs:', error);
      toast({
        title: "Error",
        description: "Failed to load automation logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      await automationRuleEngine.initialize();
      const loadedStats = await automationRuleEngine.getExecutionStats();
      setStats(loadedStats);
    } catch (error) {
      console.error('Failed to load automation stats:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadLogs();
    loadStats();
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.trigger.event.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Logs</h2>
          <p className="text-muted-foreground">
            Monitor automation rule executions and troubleshoot issues
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                </div>
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.successRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Execution</p>
                  <p className="text-2xl font-bold">
                    {stats.averageExecutionTime.toFixed(0)}ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.activeRules}</p>
                </div>
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by rule name or event type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Logs Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Automation logs will appear here once rules start executing'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <Collapsible
                  open={expandedLogs.has(log.id)}
                  onOpenChange={() => toggleLogExpansion(log.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 text-left">
                          {getStatusIcon(log.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{log.ruleName}</CardTitle>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${getStatusColor(log.status)}`}
                              >
                                {log.status}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-2">
                              <span>{log.trigger.event.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        {expandedLogs.has(log.id) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Trigger Details */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-semibold">Trigger Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event:</span>
                            <span className="font-medium">{log.trigger.event}</span>
                          </div>
                          {log.metadata.caseId && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Case ID:</span>
                              <span className="font-mono text-xs">{log.metadata.caseId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Executed */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Actions ({log.actions.length})</h4>
                        <div className="space-y-2">
                          {log.actions.map((action, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-2 bg-muted/30 rounded border"
                            >
                              {action.status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                              ) : action.status === 'failed' ? (
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {action.type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {action.duration_ms}ms
                                  </span>
                                </div>
                                {action.error && (
                                  <p className="text-xs text-red-600 mt-1">{action.error}</p>
                                )}
                                {action.result && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {JSON.stringify(action.result).substring(0, 100)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metadata */}
                      {(log.metadata.taskIds && log.metadata.taskIds.length > 0) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Created Tasks</h4>
                          <div className="flex flex-wrap gap-1">
                            {log.metadata.taskIds.map((taskId) => (
                              <Badge key={taskId} variant="outline" className="text-xs font-mono">
                                {taskId.substring(0, 8)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
