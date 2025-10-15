import React from 'react';
import { MessageSquare, Clock, CheckCircle, Calendar } from 'lucide-react';
import { TaskNote } from '@/contexts/AppStateContext';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TaskTimelineProps {
  notes: TaskNote[];
}

const noteIcons = {
  comment: MessageSquare,
  status_change: CheckCircle,
  time_log: Clock,
  follow_up: Calendar
};

const noteColors = {
  comment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  status_change: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  time_log: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  follow_up: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
};

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ notes }) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity yet. Add a note to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note, index) => {
        const Icon = noteIcons[note.type];
        const initials = note.createdByName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase();

        return (
          <Card key={note.id} className="border-l-4 border-l-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{note.createdByName}</span>
                      <Badge variant="outline" className={`text-xs ${noteColors[note.type]}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {note.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Note content */}
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {note.note}
                  </p>

                  {/* Metadata badges */}
                  {note.metadata && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {note.metadata.oldStatus && note.metadata.newStatus && (
                        <Badge variant="secondary" className="text-xs">
                          {note.metadata.oldStatus} → {note.metadata.newStatus}
                        </Badge>
                      )}
                      {note.metadata.hours !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {note.metadata.hours}h logged
                        </Badge>
                      )}
                      {note.metadata.followUpDate && (
                        <Badge variant="secondary" className="text-xs">
                          Follow-up: {new Date(note.metadata.followUpDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
