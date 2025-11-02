import { NotificationChannel, NotificationConfig } from '@/types/automation';
import { renderTemplate } from '@/config/notificationTemplates';

export interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  emailAddress?: string;
  phoneNumber?: string;
}

export interface Notification {
  id: string;
  type: string;
  recipientId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  sentAt: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  error?: string;
}

class NotificationService {
  private notificationQueue: Notification[] = [];
  private preferences: Map<string, NotificationPreferences> = new Map();

  async send(config: NotificationConfig): Promise<void> {
    console.log('[NotificationService] Sending notification:', config);

    try {
      const template = renderTemplate(config.template, config.context);
      const notifications: Notification[] = [];

      for (const recipientId of config.recipients) {
        const userPrefs = await this.getUserPreferences(recipientId);
        const enabledChannels = config.channels.filter(ch => 
          userPrefs.enabledChannels.includes(ch)
        );

        for (const channel of enabledChannels) {
          const notification: Notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: config.type,
            recipientId,
            channel,
            title: template.title,
            body: template.body,
            sentAt: new Date().toISOString(),
            deliveryStatus: 'pending'
          };

          notifications.push(notification);
        }
      }

      await this.sendBulk(notifications);
    } catch (error) {
      console.error('[NotificationService] Send error:', error);
      throw error;
    }
  }

  async sendBulk(notifications: Notification[]): Promise<void> {
    console.log(`[NotificationService] Sending ${notifications.length} notifications in bulk`);

    for (const notification of notifications) {
      try {
        await this.deliverNotification(notification);
        notification.deliveryStatus = 'sent';
      } catch (error) {
        console.error(`[NotificationService] Delivery failed for ${notification.id}:`, error);
        notification.deliveryStatus = 'failed';
        notification.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Store in queue for audit trail
    this.notificationQueue.push(...notifications);
    
    // Keep only last 1000 notifications
    if (this.notificationQueue.length > 1000) {
      this.notificationQueue = this.notificationQueue.slice(-1000);
    }
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case 'in_app':
        // Store in local storage or state for in-app notifications
        this.storeInAppNotification(notification);
        break;
      
      case 'email':
        // In a real implementation, this would call an email service
        console.log(`[NotificationService] Email sent to ${notification.recipientId}:`, notification.title);
        break;
      
      case 'sms':
        // In a real implementation, this would call an SMS service
        console.log(`[NotificationService] SMS sent to ${notification.recipientId}:`, notification.title);
        break;
      
      case 'whatsapp':
        // In a real implementation, this would call WhatsApp Business API
        console.log(`[NotificationService] WhatsApp sent to ${notification.recipientId}:`, notification.title);
        break;
    }
  }

  private storeInAppNotification(notification: Notification): void {
    try {
      const stored = localStorage.getItem('in_app_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      notifications.push(notification);
      
      // Keep only last 100 in-app notifications
      const trimmed = notifications.slice(-100);
      localStorage.setItem('in_app_notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('[NotificationService] Failed to store in-app notification:', error);
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    if (this.preferences.has(userId)) {
      return this.preferences.get(userId)!;
    }

    // Default preferences - all channels enabled
    const defaultPrefs: NotificationPreferences = {
      userId,
      enabledChannels: ['in_app', 'email'],
      quietHoursStart: undefined,
      quietHoursEnd: undefined
    };

    this.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...prefs };
    this.preferences.set(userId, updated);
    console.log(`[NotificationService] Updated preferences for ${userId}:`, updated);
  }

  async getDeliveryStatus(notificationId: string): Promise<Notification | null> {
    return this.notificationQueue.find(n => n.id === notificationId) || null;
  }

  getRecentNotifications(userId?: string, limit: number = 50): Notification[] {
    let notifications = this.notificationQueue;
    
    if (userId) {
      notifications = notifications.filter(n => n.recipientId === userId);
    }
    
    return notifications
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  clearQueue(): void {
    this.notificationQueue = [];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
