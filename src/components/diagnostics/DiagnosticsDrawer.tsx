import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/AppStateContext';
import { useDataPersistenceContext } from '@/components/providers/DataPersistenceProvider';
import { Bug, CheckCircle, XCircle, AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DiagnosticLog {
  id: string;
  timestamp: string;
  operation: string;
  entity: string;
  status: 'success' | 'error' | 'warning';
  details: string;
  payload?: any;
}

// Global diagnostics store
let diagnosticLogs: DiagnosticLog[] = [];

export const addDiagnosticLog = (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => {
  const newLog: DiagnosticLog = {
    ...log,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  diagnosticLogs.unshift(newLog);
  
  // Keep only last 100 logs
  if (diagnosticLogs.length > 100) {
    diagnosticLogs = diagnosticLogs.slice(0, 100);
  }
  
  // Also log to console with color coding
  const emoji = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⚠️';
  console.log(`${emoji} [${log.entity.toUpperCase()}] ${log.operation}: ${log.details}`);
};

export const DiagnosticsDrawer: React.FC = () => {
  const { state } = useAppState();
  const { dataService } = useDataPersistenceContext();
  const [isOpen, setIsOpen] = useState(false);

  const generateSystemReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      dataState: {
        clients: state.clients.length,
        cases: state.cases.length,
        tasks: state.tasks.length,
        hearings: state.hearings.length,
        courts: state.courts.length,
        judges: state.judges.length,
        documents: state.documents.length,
        employees: state.employees.length,
        signatories: state.signatories.length,
      },
      persistence: {
        hasLocalStorage: typeof localStorage !== 'undefined',
        dataServiceInitialized: !!dataService,
      },
      recentLogs: diagnosticLogs.slice(0, 10),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast({
      title: "System Report Copied",
      description: "Diagnostics report copied to clipboard",
    });
  };

  const clearLogs = () => {
    diagnosticLogs = [];
    toast({
      title: "Logs Cleared",
      description: "All diagnostic logs have been cleared",
    });
  };

  const getStatusIcon = (status: DiagnosticLog['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusColor = (status: DiagnosticLog['status']) => {
    switch (status) {
      case 'success': return 'bg-success text-success-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            System Diagnostics
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-4">
          {/* System Overview */}
          <div className="space-y-2">
            <h3 className="font-semibold">System Overview</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.clients.length}</div>
                <div className="text-muted-foreground">Clients</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.cases.length}</div>
                <div className="text-muted-foreground">Cases</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.tasks.length}</div>
                <div className="text-muted-foreground">Tasks</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.hearings.length}</div>
                <div className="text-muted-foreground">Hearings</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.courts.length}</div>
                <div className="text-muted-foreground">Courts</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">{state.judges.length}</div>
                <div className="text-muted-foreground">Judges</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={generateSystemReport} size="sm" variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy Report
            </Button>
            <Button onClick={clearLogs} size="sm" variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
          </div>

          {/* Operation Logs */}
          <div className="space-y-2">
            <h3 className="font-semibold">Recent Operations</h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {diagnosticLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No operations logged yet</p>
                ) : (
                  diagnosticLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 border rounded-md space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge variant="secondary" className={getStatusColor(log.status)}>
                            {log.entity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{log.operation}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      {log.payload && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            View payload
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
