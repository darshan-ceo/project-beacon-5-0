import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationSettingsDialog } from './NotificationSettingsDialog';
import { 
  Bell,
  Calendar,
  FileText,
  Scale,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  BellOff,
  Loader2
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  actionRequired?: boolean;
  relatedId?: string;
  relatedType?: string;
}

interface ClientNotificationsProps {
  clientId: string;
}

export const ClientNotifications: React.FC<ClientNotificationsProps> = ({ clientId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Transform database record to Notification interface
  const transformNotification = (record: any): Notification => ({
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    timestamp: record.created_at,
    read: record.read,
    urgent: record.urgent,
    actionRequired: record.action_required,
    relatedId: record.related_entity_id,
    relatedType: record.related_entity_type
  });

  // Fetch notifications from database
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_notifications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        return;
      }

      if (data) {
        setNotifications(data.map(transformNotification));
      }
    } catch (err) {
      console.error('Error in fetchNotifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`client-notifications-${clientId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'client_notifications', 
          filter: `client_id=eq.${clientId}` 
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = transformNotification(payload.new);
            setNotifications(prev => [newNotification, ...prev]);
            toast.info(newNotification.title, {
              description: newNotification.message.slice(0, 100) + (newNotification.message.length > 100 ? '...' : '')
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? transformNotification(payload.new) : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'urgent') return notification.urgent;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.urgent).length;

  const getNotificationIcon = (type: string, urgent: boolean = false) => {
    const iconClass = urgent ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-primary';
    
    switch (type) {
      case 'hearing_reminder':
        return <Calendar className={iconClass} />;
      case 'case_update':
        return <Scale className={iconClass} />;
      case 'document':
        return <FileText className={iconClass} />;
      case 'payment':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to update notification');
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error in markAsRead:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('client_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all as read:', error);
        toast.error('Failed to update notifications');
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">
            Stay updated with your case progress and important reminders
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <NotificationSettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
          className="flex-1"
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('unread')}
          className="flex-1"
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filter === 'urgent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('urgent')}
          className="flex-1"
        >
          Urgent ({urgentCount})
        </Button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {filter === 'unread' ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground text-center">
                  You have no unread notifications.
                </p>
              </>
            ) : filter === 'urgent' ? (
              <>
                <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Urgent Notifications</h3>
                <p className="text-muted-foreground text-center">
                  You have no urgent notifications at the moment.
                </p>
              </>
            ) : (
              <>
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Notifications</h3>
                <p className="text-muted-foreground text-center">
                  You'll see important updates and reminders here.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:shadow-md transition-all ${
                !notification.read 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.urgent)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-medium ${
                              !notification.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                            {notification.urgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {notification.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-4">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {notification.actionRequired && (
                        <div className="mt-3 flex space-x-2">
                          {notification.type === 'hearing_reminder' && (
                            <Button size="sm" variant="outline">
                              View Hearing Details
                            </Button>
                          )}
                          {notification.type === 'document' && (
                            <Button size="sm" variant="outline">
                              View Document
                            </Button>
                          )}
                          {notification.type === 'payment' && (
                            <Button size="sm" variant="outline">
                              Make Payment
                            </Button>
                          )}
                          {notification.type === 'case_update' && (
                            <Button size="sm" variant="outline">
                              View Case Details
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Notification Preferences */}
      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Hearing reminders: Email + SMS (1 day before)</p>
          <p>• Case updates: Email notifications</p>
          <p>• Document uploads: Instant email notifications</p>
          <p>• Payment reminders: Email (5 days before due date)</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setShowSettings(true)}
          >
            Customize Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
