import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Download,
  RefreshCw,
  Lock,
  FileText
} from 'lucide-react';
import { useAppState, Task } from '@/contexts/AppStateContext';
import { StorageManager } from '@/data/StorageManager';
import { useToast } from '@/hooks/use-toast';

interface MigrationStats {
  totalTasks: number;
  lockedTasks: number;
  unlockedTasks: number;
  totalFollowUps: number;
  legacyFollowUpNotes: number;
  tasksWithFollowUps: number;
  orphanedFollowUps: number;
  migrationComplete: boolean;
  inconsistencies: string[];
}

export const FollowUpMigrationReport: React.FC = () => {
  const { state } = useAppState();
  const { toast } = useToast();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [state.tasks, state.taskFollowUps, state.taskNotes]);

  const calculateStats = async () => {
    setLoading(true);
    try {
      // Get fresh data from storage
      const storage = StorageManager.getInstance().getStorage();
      const [tasks, taskFollowUps, taskNotes] = await Promise.all([
        storage.getAll('tasks'),
        storage.getAll('task_followups'),
        storage.getAll('task_notes')
      ]);

      const lockedTasks = tasks.filter((t: any) => t.isLocked);
      const legacyFollowUpNotes = taskNotes.filter((n: any) => n.type === 'follow_up');
      
      // Find inconsistencies
      const inconsistencies: string[] = [];
      
      // Check: Locked tasks should have follow-ups
      const lockedWithoutFollowUps = lockedTasks.filter((t: any) => 
        !taskFollowUps.some((f: any) => f.taskId === t.id)
      );
      if (lockedWithoutFollowUps.length > 0) {
        inconsistencies.push(`${lockedWithoutFollowUps.length} locked tasks have no follow-up records`);
      }
      
      // Check: Tasks with follow-ups should be locked
      const tasksWithFollowUps = tasks.filter((t: any) => 
        taskFollowUps.some((f: any) => f.taskId === t.id)
      );
      const unlockedWithFollowUps = tasksWithFollowUps.filter((t: any) => !t.isLocked);
      if (unlockedWithFollowUps.length > 0) {
        inconsistencies.push(`${unlockedWithFollowUps.length} tasks have follow-ups but are not locked`);
      }
      
      // Check: Orphaned follow-ups
      const orphanedFollowUps = taskFollowUps.filter((f: any) => 
        !tasks.some((t: any) => t.id === f.taskId)
      );
      
      // Check: Locked tasks missing metadata
      const lockedMissingMeta = lockedTasks.filter((t: any) => !t.lockedAt || !t.lockedBy);
      if (lockedMissingMeta.length > 0) {
        inconsistencies.push(`${lockedMissingMeta.length} locked tasks missing lock metadata`);
      }

      const migrationComplete = 
        legacyFollowUpNotes.length === 0 || 
        (taskFollowUps.length > 0 && inconsistencies.length === 0);

      setStats({
        totalTasks: tasks.length,
        lockedTasks: lockedTasks.length,
        unlockedTasks: tasks.length - lockedTasks.length,
        totalFollowUps: taskFollowUps.length,
        legacyFollowUpNotes: legacyFollowUpNotes.length,
        tasksWithFollowUps: tasksWithFollowUps.length,
        orphanedFollowUps: orphanedFollowUps.length,
        migrationComplete,
        inconsistencies
      });
    } catch (error) {
      toast({
        title: 'Error Loading Stats',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!stats) return;
    
    const report = {
      generatedAt: new Date().toISOString(),
      ...stats,
      tasks: state.tasks.filter(t => t.isLocked).map(t => ({
        id: t.id,
        title: t.title,
        isLocked: t.isLocked,
        lockedAt: t.lockedAt,
        lockedBy: t.lockedBy,
        followUpCount: state.taskFollowUps.filter(f => f.taskId === t.id).length
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `follow-up-migration-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Report Exported',
      description: 'Migration report downloaded successfully'
    });
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Migration Report...</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={50} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Follow-Up Migration Status
            </CardTitle>
            <CardDescription>
              Comprehensive report on the new follow-up system migration
            </CardDescription>
          </div>
          <Badge variant={stats.migrationComplete ? "default" : "secondary"}>
            {stats.migrationComplete ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        {stats.migrationComplete ? (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">Migration Complete</AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              All follow-up records have been successfully migrated. The system is operating normally.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Migration Status</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {stats.legacyFollowUpNotes > 0 && 
                `${stats.legacyFollowUpNotes} legacy follow-up notes detected. `
              }
              {stats.inconsistencies.length > 0 && 
                `${stats.inconsistencies.length} inconsistencies found.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Total Tasks
            </div>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Lock className="h-4 w-4" />
              Locked Tasks
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.lockedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTasks > 0 ? Math.round((stats.lockedTasks / stats.totalTasks) * 100) : 0}% of total
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Follow-Ups
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.totalFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats.tasksWithFollowUps} tasks
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Info className="h-4 w-4" />
              Legacy Notes
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.legacyFollowUpNotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Old format
            </p>
          </div>
        </div>

        {/* Inconsistencies */}
        {stats.inconsistencies.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Inconsistencies Detected
            </h3>
            <div className="space-y-1">
              {stats.inconsistencies.map((issue, idx) => (
                <Alert key={idx} variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={calculateStats}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={exportReport}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
