import { toast } from '@/hooks/use-toast';

export interface TimelineEntry {
  id: string;
  caseId: string;
  type: 'doc_saved' | 'ai_draft_generated' | 'case_created' | 'hearing_scheduled' | 'task_completed';
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  metadata?: {
    templateCode?: string;
    version?: number;
    fileName?: string;
    [key: string]: any;
  };
}

class TimelineService {
  private mockTimeline: TimelineEntry[] = [];

  /**
   * Add a new timeline entry
   */
  async addEntry(entry: Omit<TimelineEntry, 'id' | 'createdAt'>): Promise<TimelineEntry> {
    const newEntry: TimelineEntry = {
      ...entry,
      id: `timeline-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.mockTimeline.push(newEntry);
    
    console.log(`[Timeline] Added entry for case ${entry.caseId}:`, newEntry);
    
    return newEntry;
  }

  /**
   * Get timeline entries for a case
   */
  async getEntriesForCase(caseId: string): Promise<TimelineEntry[]> {
    return this.mockTimeline
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
    return this.mockTimeline
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Clear timeline entries (for testing)
   */
  async clearTimeline(): Promise<void> {
    this.mockTimeline = [];
    console.log('[Timeline] Timeline cleared');
  }
}

export const timelineService = new TimelineService();