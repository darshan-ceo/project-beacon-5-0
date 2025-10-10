import { toast } from '@/hooks/use-toast';
import { storageManager } from '@/data/StorageManager';

export interface TimelineEntry {
  id: string;
  caseId: string;
  type: 'doc_saved' | 'ai_draft_generated' | 'case_created' | 'hearing_scheduled' | 'task_completed' | 'stage_change' | 'comment' | 'deadline' | 'case_assigned';
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  metadata?: {
    templateCode?: string;
    version?: number;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    folderId?: string;
    stage?: string;
    tags?: string[];
    noticeType?: string;
    source?: string;
    hearingDate?: string;
    court?: string;
    deadline?: string;
    status?: string;
    [key: string]: any;
  };
}

class TimelineService {
  private storage = storageManager.getStorage();
  private readonly STORAGE_KEY = 'timeline_entries';

  /**
   * Initialize and load timeline entries from storage
   */
  private async loadTimeline(): Promise<TimelineEntry[]> {
    try {
      const stored = await this.storage.getAll(this.STORAGE_KEY);
      return (stored as TimelineEntry[]) || [];
    } catch (error) {
      console.error('[Timeline] Failed to load from storage:', error);
      return [];
    }
  }

  /**
   * Save timeline entries to storage
   */
  private async saveTimeline(entries: TimelineEntry[]): Promise<void> {
    try {
      // Clear existing entries
      const existing = await this.storage.getAll(this.STORAGE_KEY);
      for (const entry of existing) {
        const entryWithId = entry as TimelineEntry;
        await this.storage.delete(this.STORAGE_KEY, entryWithId.id);
      }
      
      // Save new entries
      for (const entry of entries) {
        await this.storage.create(this.STORAGE_KEY, entry);
      }
    } catch (error) {
      console.error('[Timeline] Failed to save to storage:', error);
    }
  }

  /**
   * Add a new timeline entry
   */
  async addEntry(entry: Omit<TimelineEntry, 'id' | 'createdAt'>): Promise<TimelineEntry> {
    const newEntry: TimelineEntry = {
      ...entry,
      id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    // Load current timeline
    const timeline = await this.loadTimeline();
    timeline.push(newEntry);
    
    // Save to storage
    await this.saveTimeline(timeline);
    
    console.log(`[Timeline] Added entry for case ${entry.caseId}:`, newEntry);
    
    return newEntry;
  }

  /**
   * Get timeline entries for a case
   */
  async getEntriesForCase(caseId: string): Promise<TimelineEntry[]> {
    const timeline = await this.loadTimeline();
    return timeline
      .filter(entry => entry.caseId === caseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Log AI draft events specifically
   */
  async logAIDraftEvent(
    caseId: string,
    type: 'ai_draft_generated' | 'doc_saved',
    details: {
      templateCode: string;
      version?: number;
      fileName?: string;
      createdBy: string;
    }
  ): Promise<TimelineEntry> {
    const titles = {
      ai_draft_generated: 'AI Draft Generated',
      doc_saved: 'Document Saved from AI Draft'
    };

    const descriptions = {
      ai_draft_generated: `AI draft generated for ${details.templateCode}`,
      doc_saved: `Document saved from template ${details.templateCode}${details.version ? ` (v${details.version})` : ''}`
    };

    return this.addEntry({
      caseId,
      type,
      title: titles[type],
      description: descriptions[type],
      createdBy: details.createdBy,
      metadata: {
        templateCode: details.templateCode,
        version: details.version,
        fileName: details.fileName
      }
    });
  }

  /**
   * Get recent timeline entries across all cases (for dashboard)
   */
  async getRecentEntries(limit: number = 10): Promise<TimelineEntry[]> {
    const timeline = await this.loadTimeline();
    return timeline
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Clear timeline entries (for testing)
   */
  async clearTimeline(): Promise<void> {
    try {
      const entries = await this.loadTimeline();
      for (const entry of entries) {
        await this.storage.delete(this.STORAGE_KEY, entry.id);
      }
      console.log('[Timeline] Timeline cleared');
    } catch (error) {
      console.error('[Timeline] Failed to clear timeline:', error);
    }
  }
}

export const timelineService = new TimelineService();