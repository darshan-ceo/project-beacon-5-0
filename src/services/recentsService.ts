import { Document } from '@/contexts/AppStateContext';

export interface RecentActivity {
  documentId: string;
  viewedAt?: string;
  modifiedAt?: string;
  action: 'viewed' | 'modified' | 'uploaded';
}

class RecentsService {
  private activities: RecentActivity[] = [];

  async markViewed(documentId: string): Promise<void> {
    const existingIndex = this.activities.findIndex(a => a.documentId === documentId);
    const activity: RecentActivity = {
      documentId,
      viewedAt: new Date().toISOString(),
      action: 'viewed'
    };

    if (existingIndex >= 0) {
      this.activities[existingIndex] = { ...this.activities[existingIndex], ...activity };
    } else {
      this.activities.push(activity);
    }
  }

  async markModified(documentId: string): Promise<void> {
    const existingIndex = this.activities.findIndex(a => a.documentId === documentId);
    const activity: RecentActivity = {
      documentId,
      modifiedAt: new Date().toISOString(),
      action: 'modified'
    };

    if (existingIndex >= 0) {
      this.activities[existingIndex] = { ...this.activities[existingIndex], ...activity };
    } else {
      this.activities.push(activity);
    }
  }

  async getRecentDocuments(documents: Document[], limit: number = 50): Promise<Document[]> {
    // Sort activities by most recent timestamp
    const sortedActivities = this.activities
      .map(activity => ({
        ...activity,
        lastActivity: Math.max(
          activity.viewedAt ? new Date(activity.viewedAt).getTime() : 0,
          activity.modifiedAt ? new Date(activity.modifiedAt).getTime() : 0
        )
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, limit);

    // Map to documents and filter out any that don't exist
    return sortedActivities
      .map(activity => documents.find(doc => doc.id === activity.documentId))
      .filter(doc => doc !== undefined) as Document[];
  }

  async getActivity(documentId: string): Promise<RecentActivity | null> {
    return this.activities.find(a => a.documentId === documentId) || null;
  }
}

export const recentsService = new RecentsService();