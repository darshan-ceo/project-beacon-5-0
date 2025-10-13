import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppState, Case } from '@/contexts/AppStateContext';
import { TaskBundleRepository } from '@/data/repositories/TaskBundleRepository';
import { taskBundleTriggerService } from '@/services/taskBundleTriggerService';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskBundleWithItems } from '@/data/repositories/TaskBundleRepository';

interface BundleRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
}

export const BundleRunModal: React.FC<BundleRunModalProps> = ({
  isOpen,
  onClose,
  caseData,
}) => {
  const { dispatch } = useAppState();
  const [bundles, setBundles] = useState<TaskBundleWithItems[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch bundles applicable to current case stage
  useEffect(() => {
    if (!isOpen) return;

    const fetchBundles = async () => {
      setIsFetching(true);
      try {
        const { StorageManager } = await import('@/data/StorageManager');
        await StorageManager.getInstance().initialize();
        const repo = StorageManager.getInstance().getTaskBundleRepository();
        if (!repo) {
          throw new Error('TaskBundleRepository not available');
        }
        const allBundles = await repo.getBundlesByTrigger(
          'manual',
          caseData.currentStage
        );
        setBundles(allBundles);
      } catch (error) {
        console.error('Error fetching bundles:', error);
        toast({
          title: 'Error Loading Bundles',
          description: 'Failed to load task bundles.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchBundles();
  }, [isOpen, caseData.currentStage]);

  const selectedBundle = bundles.find(b => b.id === selectedBundleId);

  const handleExecute = async () => {
    if (!selectedBundle) return;

    setIsLoading(true);
    try {
      let assigneeName = '';
      if (caseData.assignedToId) {
        const { loadAppState } = await import('@/data/storageShim');
        const appState = await loadAppState();
        const emp = appState.employees.find(e => e.id === caseData.assignedToId);
        if (emp && 'full_name' in emp) {
          assigneeName = (emp as any).full_name;
        }
      }

      const result = await taskBundleTriggerService.triggerTaskBundles(
        {
          id: caseData.id,
          caseNumber: caseData.caseNumber,
          currentStage: caseData.currentStage as any,
          clientId: caseData.clientId,
          assignedToId: caseData.assignedToId,
          assignedToName: assigneeName,
        },
        'manual',
        caseData.currentStage as any,
        dispatch
      );

      toast({
        title: 'Bundle Executed Successfully',
        description: `Created ${result.totalTasksCreated} task(s) from bundle "${selectedBundle.name}".`,
      });

      onClose();
      setSelectedBundleId('');
    } catch (error) {
      console.error('Error executing bundle:', error);
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute bundle.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Run Task Bundle</DialogTitle>
          <DialogDescription>
            Execute a task bundle to automatically create tasks for{' '}
            <strong>{caseData.caseNumber}</strong> ({caseData.currentStage})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bundle Selection */}
          <div className="space-y-2">
            <Label htmlFor="bundle-select">Select Bundle</Label>
            {isFetching ? (
              <Skeleton className="h-10 w-full" />
            ) : bundles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No manual task bundles available for <strong>{caseData.currentStage}</strong> stage.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create bundles in Task Automation settings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                <SelectTrigger id="bundle-select">
                  <SelectValue placeholder="Choose a task bundle..." />
                </SelectTrigger>
                <SelectContent>
                  {bundles.map(bundle => (
                    <SelectItem key={bundle.id} value={bundle.id}>
                      <div className="flex items-center gap-2">
                        <span>{bundle.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {bundle.items.length} tasks
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Bundle Preview */}
          {selectedBundle && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <h4 className="font-medium mb-1">Bundle: {selectedBundle.name}</h4>
                  {selectedBundle.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedBundle.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Tasks to be created ({selectedBundle.items.length}):
                  </Label>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {selectedBundle.items
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50"
                        >
                          <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.priority}
                              </Badge>
                              {item.estimated_hours && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.estimated_hours}h
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Tasks will be assigned based on case assignment ({caseData.assignedToId ? 'assigned' : 'unassigned'}) 
                    and linked to this case.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!selectedBundleId || isLoading || isFetching}
          >
            {isLoading ? (
              <>Processing...</>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Execute Bundle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
