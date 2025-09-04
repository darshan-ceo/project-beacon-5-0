/**
 * Context Panel for Stage Management Dialog
 * Provides situational awareness of Tasks, Hearings, Documents, and Contacts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  FileText,
  Users,
  Phone,
  Mail,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { contextService } from '@/services/contextService';
import { StageContextSummary } from '@/types/lifecycle';

interface ContextPanelProps {
  caseId: string;
  stageInstanceId: string;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  caseId,
  stageInstanceId
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('stage-context-expanded');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [contextData, setContextData] = useState<StageContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist expanded state
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem('stage-context-expanded', JSON.stringify(newExpanded));
  };

  // Load context data when expanded
  useEffect(() => {
    console.log('ContextPanel useEffect:', { 
      isExpanded, 
      hasContextData: !!contextData, 
      isLoading, 
      caseId, 
      stageInstanceId 
    });
    
    if (isExpanded && !contextData && !isLoading) {
      loadContextData();
    }
  }, [isExpanded, caseId, stageInstanceId]);

  const loadContextData = async () => {
    console.log('Loading context data for:', { caseId, stageInstanceId });
    
    if (!caseId || !stageInstanceId) {
      console.warn('Missing required parameters for context data');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await contextService.getStageContextSummary(caseId, stageInstanceId);
      console.log('Context data loaded successfully:', data);
      setContextData(data);
    } catch (err) {
      setError('Failed to load context data');
      console.error('Context data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'overdue': return 'destructive';
      case 'in progress': return 'secondary';
      case 'open': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Navigation handlers
  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks?highlight=${taskId}&caseId=${caseId}`);
  };

  const handleHearingClick = () => {
    navigate(`/cases?caseId=${caseId}&tab=hearings`);
  };

  const handleDocumentClick = (docKey: string) => {
    navigate(`/documents?search=${docKey}&caseId=${caseId}`);
  };

  return (
    <TooltipProvider>
      <div className="border-l border-border pl-4 ml-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            onClick={toggleExpanded}
          >
            <span className="flex items-center gap-2">
              Context
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 mt-3">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading context...</span>
            </div>
          )}

          {contextData && !isLoading && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Tasks Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tasks
                    <div className="flex gap-1 ml-auto">
                      <Badge variant="outline" className="text-xs">
                        {contextData.tasks.open} Open
                      </Badge>
                      {contextData.tasks.overdue > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {contextData.tasks.overdue} Overdue
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {contextData.tasks.done} Done
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {contextData.tasks.top.slice(0, 3).map((task, index) => (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{task.title}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Badge variant={getTaskStatusColor(task.status)} className="text-xs">
                            {task.status}
                          </Badge>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2"
                            onClick={() => handleTaskClick(task.id)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View task details</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Hearings Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Hearings
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {contextData.hearings.next && (
                    <div className="text-sm">
                      <div className="font-medium flex items-center justify-between">
                        Next: {contextData.hearings.next.type}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={handleHearingClick}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View hearing details</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contextData.hearings.next.date} • {contextData.hearings.next.courtName}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {contextData.hearings.next.status}
                      </Badge>
                    </div>
                  )}
                  
                  {contextData.hearings.last && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <div className="font-medium">Last Outcome</div>
                        <div className="text-xs text-muted-foreground">
                          {contextData.hearings.last.date}
                        </div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {contextData.hearings.last.outcome}
                        </Badge>
                        {contextData.hearings.last.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {contextData.hearings.last.notes}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Documents Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {contextData.docs.map((doc, index) => (
                    <div key={doc.key} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.name}</div>
                        <div className="text-xs text-muted-foreground">{doc.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={doc.status === 'Present' ? 'default' : 'destructive'} 
                          className="text-xs"
                        >
                          {doc.status}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDocumentClick(doc.key)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Find document</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contacts Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Key Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {contextData.contacts.map((contact, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {contact.role}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          {contact.email && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`mailto:${contact.email}`}>
                                <Mail className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {contact.phone && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`tel:${contact.phone}`}>
                                <Phone className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
    </TooltipProvider>
  );
};