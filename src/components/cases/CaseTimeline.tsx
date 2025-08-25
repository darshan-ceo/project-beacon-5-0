import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  FileText, 
  Calendar,
  MessageSquare,
  Upload,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Edit,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
}

interface TimelineEvent {
  id: string;
  type: 'stage_change' | 'document_upload' | 'hearing_scheduled' | 'comment' | 'deadline' | 'approval';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  metadata?: {
    stage?: string;
    documentName?: string;
    hearingDate?: string;
    court?: string;
    deadline?: string;
    status?: string;
  };
}

interface CaseTimelineProps {
  selectedCase?: Case | null;
}

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'stage_change',
    title: 'Stage Advanced to Adjudication',
    description: 'Case moved from Demand stage to Adjudication following response submission',
    timestamp: '2024-01-20T10:30:00',
    user: {
      name: 'John Smith',
      role: 'Senior Associate',
      avatar: undefined
    },
    metadata: {
      stage: 'Adjudication'
    }
  },
  {
    id: '2',
    type: 'document_upload',
    title: 'Response to Demand Notice Uploaded',
    description: 'Comprehensive response with supporting evidence and legal precedents',
    timestamp: '2024-01-19T15:45:00',
    user: {
      name: 'Sarah Johnson',
      role: 'Junior Associate',
      avatar: undefined
    },
    metadata: {
      documentName: 'Response_DRC01_AcmeCorp.pdf'
    }
  },
  {
    id: '3',
    type: 'hearing_scheduled',
    title: 'Hearing Scheduled',
    description: 'Final hearing scheduled before Income Tax Appellate Tribunal',
    timestamp: '2024-01-18T11:20:00',
    user: {
      name: 'Mike Wilson',
      role: 'Partner',
      avatar: undefined
    },
    metadata: {
      hearingDate: '2024-02-15',
      court: 'Income Tax Appellate Tribunal'
    }
  },
  {
    id: '4',
    type: 'deadline',
    title: 'SLA Alert - Response Due',
    description: 'Automated reminder for DRC-01 response deadline approaching',
    timestamp: '2024-01-17T09:00:00',
    user: {
      name: 'System',
      role: 'Automated Alert',
      avatar: undefined
    },
    metadata: {
      deadline: '2024-01-20T17:00:00',
      status: 'Warning'
    }
  },
  {
    id: '5',
    type: 'comment',
    title: 'Case Discussion',
    description: 'Client consultation completed. Strategy finalized for response preparation.',
    timestamp: '2024-01-16T14:30:00',
    user: {
      name: 'John Smith',
      role: 'Senior Associate',
      avatar: undefined
    }
  },
  {
    id: '6',
    type: 'document_upload',
    title: 'Demand Notice Received',
    description: 'Original demand notice from tax department uploaded to case file',
    timestamp: '2024-01-15T16:20:00',
    user: {
      name: 'Reception',
      role: 'Administrative',
      avatar: undefined
    },
    metadata: {
      documentName: 'Demand_Notice_Original.pdf'
    }
  },
  {
    id: '7',
    type: 'stage_change',
    title: 'Case Initiated',
    description: 'New case created and assigned to legal team for initial review',
    timestamp: '2024-01-10T09:15:00',
    user: {
      name: 'Mike Wilson',
      role: 'Partner',
      avatar: undefined
    },
    metadata: {
      stage: 'Scrutiny'
    }
  }
];

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ selectedCase }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'stage_change': return Scale;
      case 'document_upload': return Upload;
      case 'hearing_scheduled': return Calendar;
      case 'comment': return MessageSquare;
      case 'deadline': return Clock;
      case 'approval': return CheckCircle;
      default: return FileText;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'stage_change': return 'bg-primary text-primary-foreground';
      case 'document_upload': return 'bg-secondary text-secondary-foreground';
      case 'hearing_scheduled': return 'bg-warning text-warning-foreground';
      case 'comment': return 'bg-muted text-muted-foreground';
      case 'deadline': return 'bg-destructive text-destructive-foreground';
      case 'approval': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              Case Timeline & Audit Trail
            </CardTitle>
            <CardDescription>
              {selectedCase ? 
                `Complete chronological history for ${selectedCase.caseNumber} - ${selectedCase.title}` :
                'Select a case to view its detailed timeline and audit trail'
              }
            </CardDescription>
          </CardHeader>
          {selectedCase && (
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.caseNumber}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Timeline
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            {selectedCase ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
                
                <div className="space-y-8">
                  {mockTimelineEvents.map((event, index) => {
                    const EventIcon = getEventIcon(event.type);
                    const formatted = formatTimestamp(event.timestamp);
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="relative flex items-start space-x-6"
                      >
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                          <EventIcon className="h-6 w-6" />
                        </div>
                        
                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-foreground mb-1">
                                {event.title}
                              </h4>
                              <p className="text-muted-foreground mb-3">
                                {event.description}
                              </p>
                              
                              {/* Metadata */}
                              {event.metadata && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {event.metadata.stage && (
                                    <Badge variant="secondary">
                                      Stage: {event.metadata.stage}
                                    </Badge>
                                  )}
                                  {event.metadata.documentName && (
                                    <Badge variant="outline" className="flex items-center">
                                      <FileText className="mr-1 h-3 w-3" />
                                      {event.metadata.documentName}
                                    </Badge>
                                  )}
                                  {event.metadata.hearingDate && (
                                    <Badge variant="outline" className="flex items-center">
                                      <Calendar className="mr-1 h-3 w-3" />
                                      {event.metadata.hearingDate}
                                    </Badge>
                                  )}
                                  {event.metadata.court && (
                                    <Badge variant="outline">
                                      {event.metadata.court}
                                    </Badge>
                                  )}
                                  {event.metadata.status && (
                                    <Badge variant="secondary" className={
                                      event.metadata.status === 'Warning' 
                                        ? 'bg-warning text-warning-foreground'
                                        : 'bg-success text-success-foreground'
                                    }>
                                      {event.metadata.status}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* User info */}
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={event.user.avatar} alt={event.user.name} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {event.user.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {event.user.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {event.user.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Timestamp and actions */}
                            <div className="text-right ml-4">
                              <p className="text-sm font-medium text-foreground">
                                {formatted.date}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {formatted.time}
                              </p>
                              
                              {/* Action buttons */}
                              <div className="flex space-x-1">
                                {event.metadata?.documentName && (
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                                {event.type === 'comment' && (
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Separator */}
                          {index < mockTimelineEvents.length - 1 && (
                            <Separator className="mt-6" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Scale className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Case Selected
                </h3>
                <p className="text-muted-foreground">
                  Select a case from the overview tab to view its detailed timeline
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};