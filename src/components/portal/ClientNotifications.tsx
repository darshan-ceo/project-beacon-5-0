import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  BellOff
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'hearing_reminder' | 'case_update' | 'document' | 'payment' | 'general';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  actionRequired?: boolean;
  relatedId?: string; // Case ID, Document ID, etc.
}

interface ClientNotificationsProps {
  clientId: string;
}

export const ClientNotifications: React.FC<ClientNotificationsProps> = ({ clientId }) => {
  // Mock notifications - in real app would come from API/state
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'hearing_reminder',
      title: 'Hearing Reminder',
      message: 'Your hearing for Case #2024-001 is scheduled for tomorrow at 10:00 AM at Supreme Court.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      read: false,
      urgent: true,
      actionRequired: true,
      relatedId: 'case-1'
    },
    {
      id: '2',
      type: 'case_update',
      title: 'Case Status Update',
      message: 'Your case #2024-001 has progressed to the Adjudication stage. Next steps are being prepared.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: false,
      urgent: false,
      actionRequired: false,
      relatedId: 'case-1'
    },
    {
      id: '3',
      type: 'document',
      title: 'New Document Available',
      message: 'A new court order has been uploaded to your case documents. Please review at your earliest convenience.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      read: true,
      urgent: false,
      actionRequired: true,
      relatedId: 'doc-1'
    },
    {
      id: '4',
      type: 'payment',
      title: 'Payment Reminder',
      message: 'Your monthly retainer payment of ₹50,000 is due in 5 days. Please ensure timely payment to avoid service interruption.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      read: true,
      urgent: false,
      actionRequired: true
    },
    {
      id: '5',
      type: 'general',
      title: 'Welcome to Client Portal',
      message: 'Welcome to your new client portal! You can now view case updates, documents, and hearing schedules in one place.',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      read: true,
      urgent: false,
      actionRequired: false
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

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

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / (24 * 60))} days ago`;
    }
  };

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
          <Button variant="outline" size="sm">
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
                <CheckCircle className="h-12 w-12 text-success mb-4" />
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
              <Card className={`hover-lift transition-all ${
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
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            ×
                          </Button>
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
          <Button variant="outline" size="sm" className="mt-3">
            Customize Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};