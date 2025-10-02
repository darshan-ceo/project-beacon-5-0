import React, { useState } from 'react';
import { Calendar, Trash2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

interface HearingsBulkActionsProps {
  selectedCount: number;
  onSyncToCalendar: () => Promise<{ success: number; failed: number }>;
  onRemoveFromCalendar: () => Promise<{ success: number; failed: number }>;
  onUpdateCalendarEvents: () => Promise<{ success: number; failed: number }>;
  onClearSelection: () => void;
}

export const HearingsBulkActions: React.FC<HearingsBulkActionsProps> = ({
  selectedCount,
  onSyncToCalendar,
  onRemoveFromCalendar,
  onUpdateCalendarEvents,
  onClearSelection
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const handleBulkAction = async (
    action: () => Promise<{ success: number; failed: number }>,
    actionName: string
  ) => {
    setIsProcessing(true);
    setShowProgress(true);
    setProgress(0);
    setResults(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await action();
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(result);
    } catch (error) {
      console.error(`Bulk ${actionName} failed:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setShowProgress(false);
    setProgress(0);
    setResults(null);
    if (results && results.success > 0) {
      onClearSelection();
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction(onSyncToCalendar, 'sync')}
              disabled={isProcessing}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Sync to Calendar
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction(onUpdateCalendarEvents, 'update')}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Events
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction(onRemoveFromCalendar, 'remove')}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Calendar
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showProgress} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Bulk Calendar Sync</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {!results ? (
              <>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {isProcessing ? 'Processing hearings...' : 'Complete!'}
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-800">Successful</span>
                  <Badge className="bg-green-600">{results.success}</Badge>
                </div>
                
                {results.failed > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm font-medium text-red-800">Failed</span>
                    <Badge variant="destructive">{results.failed}</Badge>
                  </div>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  {results.success} of {selectedCount} hearings synced successfully
                  {results.failed > 0 && ` (${results.failed} failed)`}
                </p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button onClick={handleClose} disabled={isProcessing}>
              {results ? 'Close' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
