import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Database, 
  TestTube, 
  Search, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { searchService, SearchProvider } from '@/services/searchService';
import { envConfig } from '@/utils/envConfig';
import { toast } from '@/hooks/use-toast';

interface IndexStats {
  documentsCount: number;
  updatedAt: string;
}

interface QueryHistoryItem {
  query: string;
  provider: SearchProvider;
  scope: string;
  duration: number;
  resultCount: number;
  timestamp: number;
}

export const DebugSearchInspector: React.FC = () => {
  const [provider, setProvider] = useState<SearchProvider | null>(null);
  const [indexStats, setIndexStats] = useState<IndexStats>({ documentsCount: 0, updatedAt: '' });
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reindexDocId, setReindexDocId] = useState('');

  // Check if UAT mode is enabled
  const isUATEnabled = envConfig.QA_ON;

  useEffect(() => {
    if (!isUATEnabled) return;

    // Subscribe to provider changes
    const unsubscribe = searchService.subscribeProvider?.(setProvider);
    
    // Load initial data
    loadData();
    
    return unsubscribe;
  }, [isUATEnabled]);

  const loadData = async () => {
    try {
      const currentProvider = searchService.getProvider?.();
      if (currentProvider) {
        setProvider(currentProvider);
      }

      const stats = await searchService.getIndexStats?.();
      if (stats) {
        setIndexStats(stats);
      }

      const history = searchService.getQueryHistory?.() || [];
      setQueryHistory(history);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    }
  };

  const handleReindexAll = async () => {
    setIsLoading(true);
    try {
      await searchService.rebuildIndex?.('documents');
      toast({
        title: "Reindex Started",
        description: "Document index rebuild has been initiated.",
      });
      
      // Refresh stats after a delay
      setTimeout(loadData, 2000);
    } catch (error) {
      console.error('Reindex failed:', error);
      toast({
        title: "Reindex Failed",
        description: error.message || "Failed to rebuild index.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReindexDocument = async () => {
    if (!reindexDocId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a document ID.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await searchService.reindexDocument?.(reindexDocId.trim());
      toast({
        title: "Document Reindexed",
        description: `Document ${reindexDocId} has been reindexed.`,
      });
      setReindexDocId('');
      
      // Refresh stats after a delay
      setTimeout(loadData, 1000);
    } catch (error) {
      console.error('Document reindex failed:', error);
      toast({
        title: "Reindex Failed",
        description: error.message || "Failed to reindex document.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    searchService.clearCache?.();
    toast({
      title: "Cache Cleared",
      description: "Search cache has been cleared.",
    });
    loadData();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isUATEnabled) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              UAT Only
            </CardTitle>
            <CardDescription>
              This debug inspector is only available in UAT mode. Enable QA mode to use this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Search Inspector</h1>
          <p className="text-muted-foreground">Debug and manage search functionality</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {provider === 'API' ? (
              <Database className="h-5 w-5 text-primary" />
            ) : (
              <TestTube className="h-5 w-5 text-secondary" />
            )}
            Search Provider
          </CardTitle>
          <CardDescription>Current search backend configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge 
              variant={provider === 'API' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {provider === 'API' ? (
                <Database className="h-3 w-3" />
              ) : (
                <TestTube className="h-3 w-3" />
              )}
              {provider || 'Initializing...'}
            </Badge>
            
            {provider === 'API' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                API Connected
              </div>
            )}
            
            {provider === 'DEMO' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-blue-500" />
                Local Mode
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Index Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Index Statistics
          </CardTitle>
          <CardDescription>Current search index status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{indexStats.documentsCount}</div>
              <div className="text-sm text-muted-foreground">Documents Indexed</div>
            </div>
            <div>
              <div className="text-sm font-medium">
                {indexStats.updatedAt ? 
                  new Date(indexStats.updatedAt).toLocaleString() : 
                  'Not available'
                }
              </div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recent Queries
          </CardTitle>
          <CardDescription>Last 10 search queries with performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {queryHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent queries
            </div>
          ) : (
            <div className="space-y-2">
              {queryHistory.map((query, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {query.scope}
                    </Badge>
                    <span className="font-mono text-sm">"{query.query}"</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(query.duration)}
                    </div>
                    <div>{query.resultCount} results</div>
                    <div>{formatTimestamp(query.timestamp)}</div>
                    <Badge 
                      variant={query.provider === 'API' ? 'default' : 'secondary'}
                    >
                      {query.provider}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Index Management */}
      <Card>
        <CardHeader>
          <CardTitle>Index Management</CardTitle>
          <CardDescription>Rebuild or refresh search indexes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleReindexAll} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reindex All Documents
            </Button>
            
            <Button 
              onClick={handleClearCache} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear Cache
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Document ID or filename"
              value={reindexDocId}
              onChange={(e) => setReindexDocId(e.target.value)}
              className="max-w-xs"
            />
            <Button 
              onClick={handleReindexDocument}
              disabled={isLoading || !reindexDocId.trim()}
              variant="outline"
              size="sm"
            >
              Reindex This
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Reindexing operations may take some time to complete. 
              {provider === 'DEMO' ? 
                ' In DEMO mode, changes are applied to local storage.' :
                ' In API mode, changes are processed server-side.'
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};