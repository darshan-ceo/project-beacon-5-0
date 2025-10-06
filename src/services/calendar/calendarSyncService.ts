import { calendarService } from './calendarService';
import { integrationsService } from '../integrationsService';
import { loadAppState } from '@/data/storageShim';
import { saveAppState } from '@/data/storageShim';

class CalendarSyncService {
  private pollIntervalId: number | null = null;
  private isRunning = false;
  private syncInProgress = false;

  /**
   * Start automatic background sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Auto-sync already running');
      return;
    }

    console.log(`Starting calendar auto-sync (every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately on start
    this.performSync();

    // Then run periodically
    this.pollIntervalId = window.setInterval(() => {
      this.performSync();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic background sync
   */
  stopAutoSync(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.isRunning = false;
    console.log('Calendar auto-sync stopped');
  }

  /**
   * Perform sync operation
   */
  private async performSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncInProgress = true;

      // Load calendar settings
      const settings = integrationsService.loadCalendarSettings('default');
      if (!settings || settings.provider === 'none' || !settings.autoSync) {
        return;
      }

      // Check connection status
      const connectionStatus = integrationsService.getConnectionStatus('default', settings.provider);
      if (!connectionStatus.connected) {
        console.log('Calendar not connected, skipping sync');
        return;
      }

      // Load hearings
      const appState = await loadAppState();
      const unsyncedHearings = appState.hearings.filter(
        (h: any) => h.syncStatus === 'not_synced' || h.syncStatus === 'sync_failed'
      ) as any[];

      if (unsyncedHearings.length === 0) {
        console.log('No hearings to sync');
        return;
      }

      console.log(`Found ${unsyncedHearings.length} hearings to sync`);

      // Create lookup functions for related data
      const getCaseData = (caseId: string) => appState.cases.find(c => c.id === caseId) as any;
      const getCourtData = (courtId: string) => appState.courts.find(c => c.id === courtId) as any;
      const getJudgeData = (judgeId: string) => appState.judges.find(j => j.id === judgeId) as any;

      // Attempt to sync each hearing
      const bulkResult = await calendarService.bulkSync(
        unsyncedHearings,
        settings,
        getCaseData,
        getCourtData,
        getJudgeData
      );

      // Update sync status in state
      const updatedHearings = appState.hearings.map((hearing: any) => {
        const result = bulkResult.results.find((r: any) => r.hearingId === hearing.id);
        if (result) {
          return {
            ...hearing,
            syncStatus: result.success ? ('synced' as const) : ('sync_failed' as const),
            externalEventId: result.success && !hearing.externalEventId ? result.hearingId : hearing.externalEventId,
          };
        }
        return hearing;
      });

      await saveAppState({ ...appState, hearings: updatedHearings });

      const successCount = bulkResult.results.filter((r: any) => r.success).length;
      const failCount = bulkResult.results.filter((r: any) => !r.success).length;

      console.log(`Background sync completed: ${successCount} synced, ${failCount} failed`);

    } catch (error) {
      console.error('Background sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow(): Promise<void> {
    console.log('Force sync triggered');
    await this.performSync();
  }

  /**
   * Get sync service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInProgress: this.syncInProgress,
    };
  }
}

export const calendarSyncService = new CalendarSyncService();
