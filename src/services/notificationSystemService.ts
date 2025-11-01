/**
 * Notification System Service
 * Handles in-app notifications, notification history, and user preferences
 */

import { Notification, NotificationLog, NotificationPreferences, NotificationType } from '@/types/notification';
import { toast } from '@/hooks/use-toast';

const isDev = import.meta.env.DEV;

const log = (level: 'info' | 'success' | 'error', action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : level === 'error' ? 'color: red' : 'color: blue';
  console.log(`%c[NotificationSystem] ${action} ${level}`, color, details);
};

class NotificationSystemService {
  private notifications: Notification[] = [];
  private notificationLogs: NotificationLog[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load notifications from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('beacon_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        log('success', 'loadNotifications', { count: this.notifications.length });
      }

      const storedLogs = localStorage.getItem('beacon_notification_logs');
      if (storedLogs) {
        this.notificationLogs = JSON.parse(storedLogs);
        log('success', 'loadNotificationLogs', { count: this.notificationLogs.length });
      }
    } catch (error) {
      log('error', 'loadFromStorage', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('beacon_notifications', JSON.stringify(this.notifications));
      localStorage.setItem('beacon_notification_logs', JSON.stringify(this.notificationLogs));
      log('success', 'saveToStorage', { count: this.notifications.length });
    } catch (error) {
      log('error', 'saveToStorage', error);
    }
  }

  /**
   * Notify listeners of notification changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.notifications); // Immediately send current state
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Create a new notification
   */
  async createNotification(
    type: NotificationType,
    title: string,
    message: string,
    userId: string,
    options?: {
      relatedEntityType?: 'hearing' | 'case' | 'task' | 'document';
      relatedEntityId?: string;
      channels?: ('email' | 'sms' | 'whatsapp' | 'in_app')[];
      metadata?: Record<string, any>;
    }
  ): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      user_id: userId,
      related_entity_type: options?.relatedEntityType,
      related_entity_id: options?.relatedEntityId,
      channels: options?.channels || ['in_app'],
      status: 'pending',
      read: false,
      created_at: new Date().toISOString(),
      metadata: options?.metadata,
    };

    this.notifications.unshift(notification); // Add to beginning
    this.saveToStorage();
    this.notifyListeners();

    log('success', 'createNotification', { type, title });

    // Show toast for in-app notifications
    if (notification.channels.includes('in_app')) {
      toast({
        title: notification.title,
        description: notification.message,
      });
    }

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  getNotifications(userId: string, limit: number = 50): Notification[] {
    return this.notifications
      .filter(n => n.user_id === userId)
      .slice(0, limit);
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    return this.notifications.filter(n => n.user_id === userId && !n.read).length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      notification.read_at = new Date().toISOString();
      this.saveToStorage();
      this.notifyListeners();
      log('success', 'markAsRead', { notificationId });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    let updated = 0;
    this.notifications.forEach(n => {
      if (n.user_id === userId && !n.read) {
        n.read = true;
        n.read_at = new Date().toISOString();
        updated++;
      }
    });

    if (updated > 0) {
      this.saveToStorage();
      this.notifyListeners();
      log('success', 'markAllAsRead', { userId, count: updated });
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
      log('success', 'deleteNotification', { notificationId });
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearAll(userId: string): Promise<void> {
    const before = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.user_id !== userId);
    const removed = before - this.notifications.length;

    if (removed > 0) {
      this.saveToStorage();
      this.notifyListeners();
      log('success', 'clearAll', { userId, removed });
    }
  }

  /**
   * Log a notification attempt
   */
  async logNotification(log: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    const notificationLog: NotificationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...log,
    };

    this.notificationLogs.unshift(notificationLog);
    
    // Keep only last 1000 logs
    if (this.notificationLogs.length > 1000) {
      this.notificationLogs = this.notificationLogs.slice(0, 1000);
    }

    this.saveToStorage();
    return notificationLog;
  }

  /**
   * Get notification logs
   */
  getNotificationLogs(filters?: {
    hearingId?: string;
    caseId?: string;
    type?: NotificationType;
    limit?: number;
  }): NotificationLog[] {
    let logs = this.notificationLogs;

    if (filters?.hearingId) {
      logs = logs.filter(l => l.hearing_id === filters.hearingId);
    }

    if (filters?.caseId) {
      logs = logs.filter(l => l.case_id === filters.caseId);
    }

    if (filters?.type) {
      logs = logs.filter(l => l.type === filters.type);
    }

    return logs.slice(0, filters?.limit || 100);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const stored = localStorage.getItem(`notification_prefs_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      log('error', 'getUserPreferences', error);
    }

    // Default preferences
    return {
      user_id: userId,
      email_enabled: true,
      sms_enabled: false,
      whatsapp_enabled: true,
      in_app_enabled: true,
      hearing_reminders: true,
      task_reminders: true,
      case_updates: true,
      document_shares: true,
      reminder_days: [1, 0], // T-1 day and same-day
    };
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      localStorage.setItem(`notification_prefs_${preferences.user_id}`, JSON.stringify(preferences));
      log('success', 'saveUserPreferences', { userId: preferences.user_id });
      
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      log('error', 'saveUserPreferences', error);
      throw error;
    }
  }
}

export const notificationSystemService = new NotificationSystemService();
