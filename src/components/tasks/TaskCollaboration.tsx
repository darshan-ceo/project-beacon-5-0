import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users,
  MessageSquare,
  Eye,
  Edit,
  Bell,
  Clock,
  CheckCircle,
  UserPlus,
  Share,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Task } from '@/contexts/AppStateContext';

interface TaskCollaborationProps {
  tasks: Task[];
}

interface ActivityItem {
  id: string;
  type: 'comment' | 'status_change' | 'assignment' | 'priority_change' | 'deadline_update';
  taskId: string;
  taskTitle: string;
  user: {
    name: string;
    avatar?: string;
    role: string;
  };
  timestamp: string;
  description: string;
  metadata?: any;
}

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  currentTask?: string;
  lastActivity: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  user: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  isEdited?: boolean;
}

export const TaskCollaboration: React.FC<TaskCollaborationProps> = ({ tasks }) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<string>('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      updateActiveUsers();
      updateRecentActivity();
    }, 5000);

    // Initial data
    updateActiveUsers();
    updateRecentActivity();
    loadMockComments();

    return () => clearInterval(interval);
  }, []);

  const updateActiveUsers = () => {
    const mockUsers: ActiveUser[] = [
      {
        id: 'user_1',
        name: 'Sarah Johnson',
        status: 'online',
        currentTask: 'Draft Response to DRC-01',
        lastActivity: 'now'
      },
      {
        id: 'user_2',
        name: 'Mike Wilson',
        status: 'busy',
        currentTask: 'Review Assessment Order',
        lastActivity: '2 minutes ago'
      },
      {
        id: 'user_3',
        name: 'John Smith',
        status: 'online',
        lastActivity: '5 minutes ago'
      },
      {
        id: 'user_4',
        name: 'Emily Davis',
        status: 'away',
        lastActivity: '15 minutes ago'
      }
    ];

    setActiveUsers(mockUsers);
  };

  const updateRecentActivity = () => {
    const mockActivity: ActivityItem[] = [
      {
        id: 'activity_1',
        type: 'status_change',
        taskId: '1',
        taskTitle: 'Draft Response to DRC-01 Notice',
        user: { name: 'Sarah Johnson', role: 'Senior Associate' },
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        description: 'Changed status from In Progress to Review'
      },
      {
        id: 'activity_2',
        type: 'comment',
        taskId: '2',
        taskTitle: 'Prepare GSTAT Filing',
        user: { name: 'Mike Wilson', role: 'Partner' },
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        description: 'Added comment: "Please prioritize this for tomorrow"'
      },
      {
        id: 'activity_3',
        type: 'assignment',
        taskId: '3',
        taskTitle: 'Client Meeting Preparation',
        user: { name: 'John Smith', role: 'Team Lead' },
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        description: 'Assigned task to Emily Davis'
      },
      {
        id: 'activity_4',
        type: 'priority_change',
        taskId: '1',
        taskTitle: 'Draft Response to DRC-01 Notice',
        user: { name: 'Mike Wilson', role: 'Partner' },
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        description: 'Changed priority from Medium to High'
      },
      {
        id: 'activity_5',
        type: 'deadline_update',
        taskId: '4',
        taskTitle: 'File Appeal Documentation',
        user: { name: 'Sarah Johnson', role: 'Senior Associate' },
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        description: 'Extended deadline by 2 days'
      }
    ];

    setRecentActivity(mockActivity);
  };

  const loadMockComments = () => {
    const mockComments: TaskComment[] = [
      {
        id: 'comment_1',
        taskId: '1',
        user: { name: 'Mike Wilson' },
        content: 'This needs to be prioritized for court filing deadline.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 'comment_2',
        taskId: '1',
        user: { name: 'Sarah Johnson' },
        content: 'Working on the draft now. Should be ready for review by EOD.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        id: 'comment_3',
        taskId: '2',
        user: { name: 'John Smith' },
        content: 'Client has provided additional documents. Updating the filing accordingly.',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      }
    ];

    setComments(mockComments);
  };

  const getStatusColor = (status: ActiveUser['status']) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'busy': return 'bg-warning';
      case 'away': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment': return MessageSquare;
      case 'status_change': return CheckCircle;
      case 'assignment': return UserPlus;
      case 'priority_change': return Zap;
      case 'deadline_update': return Clock;
      default: return Activity;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment': return 'text-primary';
      case 'status_change': return 'text-success';
      case 'assignment': return 'text-secondary';
      case 'priority_change': return 'text-warning';
      case 'deadline_update': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const addComment = () => {
    if (!newComment.trim() || !selectedTaskForComments) return;

    const comment: TaskComment = {
      id: `comment_${Date.now()}`,
      taskId: selectedTaskForComments,
      user: { name: 'Current User' },
      content: newComment.trim(),
      timestamp: new Date().toISOString()
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const taskComments = comments.filter(c => c.taskId === selectedTaskForComments);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Users className="mr-2 h-6 w-6" />
            Team Collaboration
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time task collaboration and team activity
          </p>
        </div>
        <Button variant="outline">
          <Share className="mr-2 h-4 w-4" />
          Share Workspace
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Users */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Active Users
              </CardTitle>
              <CardDescription>
                Team members currently online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div 
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      {user.currentTask ? (
                        <p className="text-xs text-primary truncate">{user.currentTask}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{user.lastActivity}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.status}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest task updates and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => {
                    const Icon = getActivityIcon(activity.type);
                    
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className={`p-1 rounded ${getActivityColor(activity.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {activity.user.name}
                          </p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {activity.description}
                          </p>
                          <p className="text-xs text-primary truncate">
                            {activity.taskTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Comments */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Task Comments
              </CardTitle>
              <CardDescription>
                Collaborate on specific tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Task Selector */}
                <select 
                  value={selectedTaskForComments}
                  onChange={(e) => setSelectedTaskForComments(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
                >
                  <option value="">Select a task...</option>
                  {tasks.slice(0, 5).map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>

                {selectedTaskForComments && (
                  <>
                    {/* Comments List */}
                    <ScrollArea className="h-48 border border-border rounded p-2">
                      <div className="space-y-3">
                        {taskComments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No comments yet. Start the conversation!
                          </p>
                        ) : (
                          taskComments.map((comment, index) => (
                            <motion.div
                              key={comment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="p-2 rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground">
                                  {comment.user.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(comment.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{comment.content}</p>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    {/* Add Comment */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addComment()}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={addComment}
                        disabled={!newComment.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Team Performance Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Summary</CardTitle>
            <CardDescription>
              Real-time collaboration metrics and team productivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-primary">4</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-success">12</div>
                <div className="text-sm text-muted-foreground">Comments Today</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-warning">8</div>
                <div className="text-sm text-muted-foreground">Status Updates</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-secondary">95%</div>
                <div className="text-sm text-muted-foreground">Team Sync Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};