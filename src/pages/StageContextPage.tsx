/**
 * Full-Page Stage Context View
 * Shows Tasks, Hearings, Documents, and Contacts for a specific stage instance
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
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
import { useAppState } from '@/contexts/AppStateContext';
import { AdminLayout } from '@/components/layout/AdminLayout';

const StageContextPage: React.FC = () => {
  const { caseId, instanceId } = useParams<{ caseId: string; instanceId: string }>();
  const navigate = useNavigate();
  const { state } = useAppState();
  
  const [contextData, setContextData] = useState<StageContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current case details
  const currentCase = state.cases?.find(c => c.id === caseId);
  const currentUser = { name: "Current User", role: "Admin" as const };

  useEffect(() => {
    if (caseId && instanceId) {
      loadContextData();
    }
  }, [caseId, instanceId]);

  const loadContextData = async () => {
    if (!caseId || !instanceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await contextService.getStageContextSummary(caseId, instanceId);
      setContextData(data);
    } catch (err) {
      console.error('Failed to load stage context:', err);
      setError('Failed to load context data');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToWorkspace = (workspace: string, params?: any) => {
    switch (workspace) {
      case 'tasks':
        // Build URL with query parameters for proper task highlighting
        const taskParams = new URLSearchParams();
        if (params?.taskId) {
          taskParams.set('highlight', params.taskId);
        }
        if (caseId) {
          taskParams.set('caseId', caseId);
        }
        if (instanceId) {
          taskParams.set('stageInstanceId', instanceId);
        }
        navigate(`/tasks?${taskParams.toString()}`);
        break;
      case 'hearings':
        navigate('/hearings/calendar', { state: { caseId, ...params } });
        break;
      case 'documents':
        navigate('/documents', { state: { caseId, ...params } });
        break;
      default:
        console.warn('Unknown workspace:', workspace);
    }
  };

  if (!caseId || !instanceId) {
    return (
      <AdminLayout currentUser={{ name: "Current User", role: "Admin" }}>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Invalid Parameters</h1>
            <p className="text-muted-foreground mt-2">Case ID and Instance ID are required.</p>
            <Button onClick={() => navigate('/cases')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentUser={currentUser}>
      <div className="p-6 space-y-6">
        {/* Header with breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/cases" className="hover:text-foreground">Cases</Link>
              <span>/</span>
              <Link to="/cases" state={{ highlightCaseId: caseId }} className="hover:text-foreground">
                {currentCase?.title || 'Case Details'}
              </Link>
              <span>/</span>
              <span>Stage Context</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Stage Context</h1>
              <Badge variant="outline" className="text-sm">
                Instance: {instanceId}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/cases', { state: { highlightCaseId: caseId } })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Case
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contextData ? (
          <div className="space-y-6">
            {/* Tasks Section */}
            <Card id="tasks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Tasks
                  <Badge variant="secondary">{contextData.tasks.open + contextData.tasks.done + contextData.tasks.overdue}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{contextData.tasks.done}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{contextData.tasks.open}</div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{contextData.tasks.overdue}</div>
                    <div className="text-sm text-muted-foreground">Overdue</div>
                  </div>
                </div>
                
                {contextData.tasks.top.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Priority Tasks</h4>
                      <div className="space-y-2">
                        {contextData.tasks.top.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                {task.priority}
                              </Badge>
                              <span className="font-medium">{task.title}</span>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => navigateToWorkspace('tasks', { taskId: task.id })}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                <Button onClick={() => navigateToWorkspace('tasks')} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Task Workspace
                </Button>
              </CardContent>
            </Card>

            {/* Hearings Section */}
            <Card id="hearings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Hearings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contextData.hearings.next ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Next Hearing</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {new Date(contextData.hearings.next.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">{contextData.hearings.next.courtName}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {contextData.hearings.next.type}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No upcoming hearings scheduled
                  </div>
                )}
                
                {contextData.hearings.last && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg border">
                    <h4 className="font-medium mb-2">Last Hearing</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(contextData.hearings.last.date).toLocaleDateString()} - {contextData.hearings.last.outcome}
                    </p>
                  </div>
                )}
                
                <Button onClick={() => navigateToWorkspace('hearings')} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Hearings Calendar
                </Button>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card id="documents">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents
                  <Badge variant="secondary">{contextData.docs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contextData.docs.length > 0 ? (
                  <div className="space-y-2">
                    {contextData.docs.slice(0, 5).map((doc, index) => (
                      <div key={`${doc.key}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{doc.name || doc.key}</span>
                          <Badge variant={doc.status === 'Present' ? 'default' : 'secondary'}>
                            {doc.status}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigateToWorkspace('documents', { documentId: doc.key })}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {contextData.docs.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        And {contextData.docs.length - 5} more documents...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No documents found for this stage
                  </div>
                )}
                
                <Button onClick={() => navigateToWorkspace('documents')} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Document Workspace
                </Button>
              </CardContent>
            </Card>

            {/* Contacts Section */}
            <Card id="contacts">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Key Contacts
                  <Badge variant="secondary">{contextData.contacts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contextData.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contextData.contacts.map((contact, index) => (
                      <div key={`${contact.name}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">{contact.role}</div>
                          <div className="flex items-center gap-4 mt-1">
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No key contacts identified for this stage
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default StageContextPage;