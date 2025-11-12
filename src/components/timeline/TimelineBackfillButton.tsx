import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { timelineBackfillService } from '@/services/timelineBackfillService';
import { toast } from '@/hooks/use-toast';

export function TimelineBackfillButton() {
  const [isBackfilling, setIsBackfilling] = useState(false);

  const handleBackfill = async () => {
    setIsBackfilling(true);
    
    try {
      const result = await timelineBackfillService.backfillTimeline();
      
      const totalCreated = result.tasksCreated + result.tasksCompleted + result.casesCreated + result.casesAssigned;
      
      if (result.errors.length > 0) {
        toast({
          title: 'Backfill Completed with Errors',
          description: `Created ${totalCreated} entries. ${result.errors.length} errors occurred.`,
          variant: 'destructive',
        });
        console.error('[TimelineBackfill] Errors:', result.errors);
      } else if (totalCreated === 0) {
        toast({
          title: 'No Missing Entries',
          description: 'All historical data already has timeline entries.',
        });
      } else {
        toast({
          title: 'Timeline Backfill Complete',
          description: `✅ Created ${result.tasksCreated} task entries, ${result.tasksCompleted} completion entries, ${result.casesCreated} case entries, ${result.casesAssigned} assignment entries`,
        });
      }
      
      // Reload page to show new entries
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: 'Backfill Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Button
      onClick={handleBackfill}
      disabled={isBackfilling}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isBackfilling ? 'animate-spin' : ''}`} />
      {isBackfilling ? 'Backfilling...' : 'Backfill Timeline'}
    </Button>
  );
}
