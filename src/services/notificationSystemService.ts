/**
 * Notification System Service
 * Handles in-app notifications, notification history, and user preferences
 * Migrated to Supabase for persistence (Phase 3)
 */

import { Notification, NotificationLog, NotificationPreferences, NotificationType } from '@/types/notification';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;

const log = (level: 'info' | 'success' | 'error', action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : level === 'error' ? 'color: red' : 'color: blue';
  console.log(`%c[NotificationSystem] ${action} ${level}`, color, details);
};

class NotificationSystemService {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private cachedNotifications: Notification[] = [];
  private currentUserId: string | null = null;

  constructor() {
    // Initialize realtime subscription when service is created
    this.initializeRealtimeSubscription();
  }

  /**
   * Get current user and tenant context
   */
  private async getContext(): Promise<{ userId: string; tenantId: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      return { userId: user.id, tenantId: profile.tenant_id };
    } catch (error) {
      log('error', 'getContext', error);
      return null;
    }
  }

  /**
   * Initialize Supabase Realtime subscription for live updates
   */
  private async initializeRealtimeSubscription(): Promise<void> {
    const context = await this.getContext();
    if (!context) return;

    this.currentUserId = context.userId;

    // Remove existing channel if any
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
    }

    // Subscribe to notifications changes for this user
    this.realtimeChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${context.userId}`
        },
        async (payload) => {
          log('info', 'realtimeUpdate', payload);
          // Refresh notifications and notify listeners
          await this.refreshNotifications();
        }
      )
      .subscribe();

    log('success', 'initializeRealtimeSubscription', { userId: context.userId });
  }

  /**
   * Refresh notifications from database
   */
  private async refreshNotifications(): Promise<void> {
    const context = await this.getContext();
    if (!context) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      this.cachedNotifications = (data || []).map(n => ({
        ...n,
        channels: n.channels as any[],
        type: n.type as NotificationType,
        status: n.status as any,
      }));
      
      this.notifyListeners();
    } catch (error) {
      log('error', 'refreshNotifications', error);
    }
  }

  /**
   * Notify listeners of notification changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.cachedNotifications));
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    
    // Initialize if needed and send current state
    this.refreshNotifications().then(() => {
      listener(this.cachedNotifications);
    });
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Create a new notification
   * 
   * IMPORTANT: Uses insert WITHOUT .select() to avoid RLS SELECT policy blocking
   * cross-user notification creation (e.g., manager creating notification for staff).
   * We generate client-side UUID to maintain object consistency.
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
  ): Promise<Notification | null> {
    try {
      const context = await this.getContext();
      if (!context) {
        log('error', 'createNotification', 'No auth context available');
        return null;
      }

      // Dev logging: context and recipient info
      log('info', 'createNotification:context', { 
        contextUserId: context.userId, 
        tenantId: context.tenantId,
        recipientUserId: userId,
        type,
        title
      });

      // Generate client-side UUID to avoid dependency on RETURNING/SELECT
      const notificationId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const notificationData = {
        id: notificationId,
        tenant_id: context.tenantId,
        user_id: userId,
        type,
        title,
        message,
        related_entity_type: options?.relatedEntityType || null,
        related_entity_id: options?.relatedEntityId || null,
        channels: options?.channels || ['in_app'],
        status: 'pending',
        read: false,
        metadata: options?.metadata || null,
        created_at: createdAt,
      };

      // Insert WITHOUT .select() to avoid RLS SELECT policy blocking cross-user inserts
      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) {
        // Log specific error details for debugging
        log('error', 'createNotification:insertFailed', { 
          code: error.code, 
          message: error.message,
          hint: error.hint,
          details: error.details,
          recipientUserId: userId,
          contextUserId: context.userId
        });
        return null;
      }

      // Build notification object from our known data (since we can't SELECT it back)
      const notification: Notification = {
        id: notificationId,
        tenant_id: context.tenantId,
        user_id: userId,
        type,
        title,
        message,
        related_entity_type: options?.relatedEntityType || null,
        related_entity_id: options?.relatedEntityId || null,
        channels: options?.channels || ['in_app'],
        status: 'pending' as any,
        read: false,
        metadata: options?.metadata || null,
        created_at: createdAt,
      };

      log('success', 'createNotification', { 
        notificationId, 
        type, 
        title,
        recipientUserId: userId 
      });

      // Show toast for in-app notifications (only to the creator, not recipient)
      // Toast is shown locally; recipient will see via realtime/fetch
      if (notification.channels.includes('in_app')) {
        toast({
          title: `Notification sent`,
          description: `"${notification.title}" sent to assignee.`,
        });
      }

      return notification;
    } catch (error) {
      const err = error as any;
      log('error', 'createNotification:exception', { 
        message: err?.message, 
        code: err?.code,
        stack: err?.stack?.slice(0, 200)
      });
      return null;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(n => ({
        ...n,
        channels: n.channels as any[],
        type: n.type as NotificationType,
        status: n.status as any,
      }));
    } catch (error) {
      log('error', 'getNotifications', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      log('error', 'getUnreadCount', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString(), status: 'read' })
        .eq('id', notificationId);

      if (error) throw error;

      log('success', 'markAsRead', { notificationId });
    } catch (error) {
      log('error', 'markAsRead', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString(), status: 'read' })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      log('success', 'markAllAsRead', { userId });
    } catch (error) {
      log('error', 'markAllAsRead', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      log('success', 'deleteNotification', { notificationId });
    } catch (error) {
      log('error', 'deleteNotification', error);
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearAll(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      log('success', 'clearAll', { userId });
    } catch (error) {
      log('error', 'clearAll', error);
    }
  }

  /**
   * Log a notification attempt
   */
  async logNotification(logData: Omit<NotificationLog, 'id' | 'tenant_id' | 'created_at'>): Promise<NotificationLog | null> {
    try {
      const context = await this.getContext();
      if (!context) return null;

      const { data, error } = await supabase
        .from('notification_logs')
        .insert({
          tenant_id: context.tenantId,
          ...logData,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        channels: data.channels as any[],
        type: data.type as NotificationType,
      };
    } catch (error) {
      log('error', 'logNotification', error);
      return null;
    }
  }

  /**
   * Get notification logs
   */
  async getNotificationLogs(filters?: {
    hearingId?: string;
    caseId?: string;
    type?: NotificationType;
    limit?: number;
  }): Promise<NotificationLog[]> {
    try {
      const context = await this.getContext();
      if (!context) return [];

      let query = supabase
        .from('notification_logs')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: false });

      if (filters?.hearingId) {
        query = query.eq('hearing_id', filters.hearingId);
      }

      if (filters?.caseId) {
        query = query.eq('case_id', filters.caseId);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(l => ({
        ...l,
        channels: l.channels as any[],
        type: l.type as NotificationType,
      }));
    } catch (error) {
      log('error', 'getNotificationLogs', error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const context = await this.getContext();
      if (!context) {
        return this.getDefaultPreferences(userId);
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return {
          ...data,
          reminder_days: data.reminder_days || [1, 0],
        };
      }

      return this.getDefaultPreferences(userId);
    } catch (error) {
      log('error', 'getUserPreferences', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
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
      reminder_days: [1, 0],
    };
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      const context = await this.getContext();
      if (!context) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          tenant_id: context.tenantId,
          user_id: preferences.user_id,
          email_enabled: preferences.email_enabled,
          sms_enabled: preferences.sms_enabled,
          whatsapp_enabled: preferences.whatsapp_enabled,
          in_app_enabled: preferences.in_app_enabled,
          hearing_reminders: preferences.hearing_reminders,
          task_reminders: preferences.task_reminders,
          case_updates: preferences.case_updates,
          document_shares: preferences.document_shares,
          reminder_days: preferences.reminder_days,
          quiet_hours_start: preferences.quiet_hours_start,
          quiet_hours_end: preferences.quiet_hours_end,
        }, { onConflict: 'tenant_id,user_id' });

      if (error) throw error;

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

  /**
   * Cleanup on service destroy
   */
  async destroy(): Promise<void> {
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
  }
}

export const notificationSystemService = new NotificationSystemService();
