import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { StageManagementModal } from '@/components/modals/StageManagementModal';
import { UnifiedStageDialog } from '@/components/lifecycle/UnifiedStageDialog';
import { EnhancedCycleTimeline } from '@/components/lifecycle/EnhancedCycleTimeline';
import { StageTransitionHistory } from '@/components/lifecycle/StageTransitionHistory';
import { ContextSplitButton } from '@/components/lifecycle/ContextSplitButton';
import { featureFlagService } from '@/services/featureFlagService';
import { HearingModal } from '@/components/modals/HearingModal';
import { FormRenderModal } from '@/components/documents/FormRenderModal';
import { FormChip } from './FormChip';
import { useAppState, Case, GeneratedForm } from '@/contexts/AppStateContext';
import { casesService } from '@/services/casesService';
import { dmsService } from '@/services/dmsService';
import { formTemplatesService } from '@/services/formTemplatesService';
import { normalizeStage } from '@/utils/stageUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, parseISO, isValid, differenceInDays, isPast } from 'date-fns';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Upload,
  Calendar,
  Users,
  Scale,
  Gavel,
  Building,
  Flag,
  BookOpen,
  ChevronDown,
  PlusCircle,
  ListTodo,
  Info,
  ExternalLink,
  ClipboardCheck,
  AlertCircle,
  Activity
} from 'lucide-react';
import { HelpButton } from '@/components/ui/help-button';
import { supabase } from '@/integrations/supabase/client';

// Stage Workflow Components
import { StageWorkflowTimeline } from '@/components/lifecycle/StageWorkflowTimeline';
import { StageNoticesPanel } from '@/components/lifecycle/StageNoticesPanel';
import { StageHearingsPanel } from '@/components/lifecycle/StageHearingsPanel';
import { StageClosurePanel } from '@/components/lifecycle/StageClosurePanel';
import { AddNoticeModal } from '@/components/modals/AddNoticeModal';
import { FileReplyModal } from '@/components/modals/FileReplyModal';
import { NoticeClosureModal } from '@/components/modals/NoticeClosureModal';
import { useStageWorkflow } from '@/hooks/useStageWorkflow';
import { StageNotice, WorkflowStepKey, StageClosureDetails, CreateStageNoticeInput, CreateStageReplyInput, UpdateStageNoticeInput } from '@/types/stageWorkflow';

interface CaseLifecycleFlowProps {
  selectedCase?: Case | null;
  onCaseUpdated?: (updatedCase: Case) => void;
  onNavigateToOverview?: () => void;
}

const lifecycleStages = [
  {
    id: 'Assessment',
    name: 'Assessment',
    description: 'Initial case review and documentation',
    icon: FileText,
    forms: ['ASMT-10', 'ASMT-11'],
    slaHours: 72
  },
  {
    id: 'Adjudication',
    name: 'Adjudication',
    description: 'Adjudicating authority proceedings',
    icon: Scale,
    forms: ['DRC-1', 'DRC-5', 'DRC-6', 'DRC-7', 'DRC-8'],
    slaHours: 720
  },
  {
    id: 'First Appeal',
    name: 'First Appeal',
    description: 'First appellate authority',
    icon: ArrowRight,
    forms: ['Appeal Form'],
    slaHours: 1440
  },
  {
    id: 'Tribunal',
    name: 'Tribunal',
    description: 'GST Appellate Tribunal',
    icon: Building,
    forms: ['GSTAT Form'],
    slaHours: 2160
  },
  {
    id: 'High Court',
    name: 'High Court',
    description: 'High Court proceedings',
    icon: Gavel,
    forms: ['HC Petition'],
    slaHours: 4320
  },
  {
    id: 'Supreme Court',
    name: 'Supreme Court',
    description: 'Supreme Court of India',
    icon: Gavel,
    forms: ['SLP/Appeal'],
    slaHours: 8760
  }
];

export const CaseLifecycleFlow: React.FC<CaseLifecycleFlowProps> = ({ selectedCase, onCaseUpdated, onNavigateToOverview }) => {
  const { toast } = useToast();
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [showStageModal, setShowStageModal] = useState(false);
  const [showHearingModal, setShowHearingModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormCode, setSelectedFormCode] = useState<string>('');
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isStageDetailsOpen, setIsStageDetailsOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  
  // Stage Workflow state
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [showFileReplyModal, setShowFileReplyModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<StageNotice | null>(null);
  const [editingNotice, setEditingNotice] = useState<StageNotice | null>(null);
  const [viewingNotice, setViewingNotice] = useState<StageNotice | null>(null);
  const [closingNotice, setClosingNotice] = useState<StageNotice | null>(null);
  const [stageInstanceId, setStageInstanceId] = useState<string | null>(null);
  const [isClosingStage, setIsClosingStage] = useState(false);

  // Helper function to format dates safely
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
    } catch {
      return dateStr;
    }
  };

  // Get current stage instance ID (for context panel)
  const currentStageInstanceId = useMemo(() => {
    // This would typically come from stage_instances table
    // For now, generate a placeholder based on case and stage
    return selectedCase ? `${selectedCase.id}-${selectedCase.currentStage}` : '';
  }, [selectedCase?.id, selectedCase?.currentStage]);

  // Calculate stage metrics for Lovable recommendations
  const stageMetrics = useMemo(() => {
    if (!selectedCase) return null;
    
    // Get tasks for this case
    const caseTasks = state.tasks?.filter(t => t.caseId === selectedCase.id) || [];
    const openTasks = caseTasks.filter(t => !['Completed', 'Cancelled'].includes(t.status || ''));
    const overdueTasks = openTasks.filter(t => t.dueDate && isPast(parseISO(t.dueDate)));
    
    // Get recent activity (last 3 updates from tasks/documents)
    // Use audit_trail.updated_at for tasks
    const recentTasks = [...caseTasks]
      .sort((a, b) => new Date(b.audit_trail?.updated_at || b.createdDate || 0).getTime() - new Date(a.audit_trail?.updated_at || a.createdDate || 0).getTime())
      .slice(0, 2);
    
    const caseDocuments = state.documents?.filter(d => d.caseId === selectedCase.id) || [];
    const recentDocs = [...caseDocuments]
      .sort((a, b) => new Date(b.createdAt || b.uploadedAt || 0).getTime() - new Date(a.createdAt || a.uploadedAt || 0).getTime())
      .slice(0, 1);
    
    // Upcoming deadlines
    const upcomingDeadlines: Array<{ label: string; date: string; daysUntil: number }> = [];
    if (selectedCase.replyDueDate || selectedCase.reply_due_date) {
      const dueDate = selectedCase.replyDueDate || selectedCase.reply_due_date;
      const dueDateParsed = parseISO(dueDate!);
      if (isValid(dueDateParsed)) {
        const daysUntil = differenceInDays(dueDateParsed, new Date());
        if (daysUntil <= 7 && daysUntil >= 0) {
          upcomingDeadlines.push({ label: 'Reply Due', date: dueDate!, daysUntil });
        } else if (daysUntil < 0) {
          upcomingDeadlines.push({ label: 'Reply Overdue', date: dueDate!, daysUntil });
        }
      }
    }
    
    // Next hearing
    const caseHearings = state.hearings?.filter(h => h.caseId === selectedCase.id) || [];
    const nextHearing = caseHearings
      .filter(h => h.date && new Date(h.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    
    if (nextHearing) {
      const daysUntil = differenceInDays(parseISO(nextHearing.date), new Date());
      if (daysUntil <= 7) {
        upcomingDeadlines.push({ label: 'Next Hearing', date: nextHearing.date, daysUntil });
      }
    }
    
    return {
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      completedTasks: caseTasks.filter(t => t.status === 'Completed').length,
      totalTasks: caseTasks.length,
      recentActivity: [
        ...recentTasks.map(t => ({ type: 'task' as const, title: t.title, date: t.audit_trail?.updated_at || t.createdDate })),
        ...recentDocs.map(d => ({ type: 'document' as const, title: d.name, date: d.createdAt || d.uploadedAt }))
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 3),
      upcomingDeadlines,
      documentsCount: caseDocuments.length
    };
  }, [selectedCase, state.tasks, state.documents, state.hearings]);

  // Fetch active stage instance ID for workflow
  useEffect(() => {
    async function fetchStageInstance() {
      if (!selectedCase?.id) {
        setStageInstanceId(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('stage_instances')
          .select('id')
          .eq('case_id', selectedCase.id)
          .eq('status', 'Active')
          .maybeSingle();
        
        if (error) {
          console.error('[CaseLifecycleFlow] Error fetching stage instance:', error);
          setStageInstanceId(null);
        } else {
          setStageInstanceId(data?.id || null);
        }
      } catch (err) {
        console.error('[CaseLifecycleFlow] Exception fetching stage instance:', err);
        setStageInstanceId(null);
      }
    }
    
    fetchStageInstance();
  }, [selectedCase?.id, selectedCase?.currentStage]);

  // Stage Workflow hook
  const {
    workflowState,
    activeStep,
    setActiveStep,
    noticeReplies,
    refresh: refreshWorkflow,
    addNotice,
    updateNotice,
    deleteNotice,
    loadRepliesForNotice,
    addReply,
    completeStep,
    skipStep,
    isFeatureEnabled: isStageWorkflowEnabled
  } = useStageWorkflow({
    stageInstanceId,
    caseId: selectedCase?.id || '',
    stageKey: selectedCase?.currentStage || '',
    enabled: !!selectedCase
  });

  // Stage Workflow handlers
  const handleAddNotice = useCallback(() => {
    setEditingNotice(null);
    setShowAddNoticeModal(true);
  }, []);

  const handleEditNotice = useCallback((notice: StageNotice) => {
    setEditingNotice(notice);
    setShowAddNoticeModal(true);
  }, []);

  const handleDeleteNotice = useCallback(async (noticeId: string) => {
    const success = await deleteNotice(noticeId);
    if (success) {
      toast({
        title: "Notice Deleted",
        description: "The notice has been removed.",
      });
    }
  }, [deleteNotice, toast]);

  const handleViewNotice = useCallback((notice: StageNotice) => {
    setViewingNotice(notice);
    setShowAddNoticeModal(true);
  }, []);

  const handleFileReply = useCallback((notice: StageNotice) => {
    const stageIndex = lifecycleStages.findIndex(
      s => s.id === normalizeStage(selectedCase?.currentStage)
    );
    if (stageIndex >= 2 && selectedCase) {
      // Appeal stage: navigate to full-page structured reply
      navigate(`/cases/${selectedCase.id}/reply/edit?noticeId=${notice.id}&stageInstanceId=${stageInstanceId}`);
    } else {
      // Pre-appeal: use existing modal
      setSelectedNotice(notice);
      setShowFileReplyModal(true);
    }
  }, [selectedCase, stageInstanceId, navigate]);

  const handleCloseNotice = useCallback((notice: StageNotice) => {
    setClosingNotice(notice);
  }, []);

  const handleSaveNoticeClosure = useCallback(async (noticeId: string, data: UpdateStageNoticeInput) => {
    await updateNotice(noticeId, data);
    toast({
      title: "Notice Closed",
      description: "The notice has been closed.",
    });
    setClosingNotice(null);
  }, [updateNotice, toast]);

  const handleSaveNotice = useCallback(async (data: CreateStageNoticeInput) => {
    if (editingNotice) {
      await updateNotice(editingNotice.id, data);
      toast({
        title: "Notice Updated",
        description: "The notice has been updated.",
      });
    } else {
      await addNotice(data);
      toast({
        title: "Notice Added",
        description: "A new notice has been recorded.",
      });
    }
    setShowAddNoticeModal(false);
    setEditingNotice(null);
  }, [editingNotice, updateNotice, addNotice, toast]);

  const handleSaveReply = useCallback(async (data: CreateStageReplyInput) => {
    await addReply(data);
    toast({
      title: "Reply Filed",
      description: "The reply has been recorded.",
    });
    setShowFileReplyModal(false);
    setSelectedNotice(null);
  }, [addReply, toast]);

  const handleCloseStage = useCallback(async (details: StageClosureDetails) => {
    if (!stageInstanceId) return;
    
    setIsClosingStage(true);
    try {
      // Complete the closure step
      const success = await completeStep('closure');
      if (success) {
        toast({
          title: "Stage Closed",
          description: `Stage closed with outcome: ${details.outcome}`,
        });
        // Trigger refresh
        await refreshWorkflow();
      }
    } catch (err) {
      console.error('[CaseLifecycleFlow] Error closing stage:', err);
      toast({
        title: "Error",
        description: "Failed to close stage. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClosingStage(false);
    }
  }, [stageInstanceId, completeStep, toast, refreshWorkflow]);

  // Get stage-specific hearings
  // Check both caseId (legacy) and case_id (DB) since hearingsService returns both formats
  const stageHearings = useMemo(() => {
    if (!selectedCase?.id) return [];
    return state.hearings?.filter(h => {
      const hearingCaseId = h.caseId || h.case_id;
      const matchesCase = hearingCaseId === selectedCase.id;
      const matchesStage = h.stage_instance_id === stageInstanceId || !h.stage_instance_id;
      return matchesCase && matchesStage;
    }) || [];
  }, [selectedCase?.id, stageInstanceId, state.hearings]);

  // Handler for navigating to create task
  const handleCreateTask = () => {
    if (selectedCase) {
      const params = new URLSearchParams({
        caseId: selectedCase.id,
        clientId: selectedCase.clientId || '',
        caseNumber: selectedCase.caseNumber || '',
      });
      navigate(`/tasks/new?${params.toString()}`);
    }
  };

  // Handler for viewing case tasks
  const handleViewTasks = () => {
    if (selectedCase) {
      navigate(`/tasks?caseId=${selectedCase.id}`);
    }
  };

  // Handler for viewing original notice document
  const handleViewOriginalNotice = () => {
    if (!selectedCase) return;
    
    const noticeDoc = state.documents?.find(
      doc => doc.caseId === selectedCase.id && 
      (doc.category === 'Notice' || doc.category === 'Original Notice' || 
       doc.name?.toLowerCase().includes('notice'))
    );
    
    if (noticeDoc) {
      // Navigate to documents tab with the notice selected
      navigate(`/documents?docId=${noticeDoc.id}`);
    } else {
      toast({
        title: "No Notice Document Found",
        description: "Upload the original notice document in the Documents tab.",
        variant: "default"
      });
    }
  };

  // Toggle context panel
  const toggleContextPanel = () => setIsContextPanelOpen(!isContextPanelOpen);

  // Listen for reopen stage dialog events
  useEffect(() => {
    const handleReopenStageDialog = (event: CustomEvent) => {
      const { caseId, stageId } = event.detail;
      if (selectedCase?.id === caseId) {
        setShowStageModal(true);
      }
    };

    window.addEventListener('reopen-stage-dialog', handleReopenStageDialog as EventListener);
    return () => {
      window.removeEventListener('reopen-stage-dialog', handleReopenStageDialog as EventListener);
    };
  }, [selectedCase]);

  const getCurrentStageIndex = () => {
    if (!selectedCase) return 0;
    const canonical = normalizeStage(selectedCase.currentStage);
    return lifecycleStages.findIndex(stage => stage.id === canonical);
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'pending';
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'current': return 'bg-primary text-primary-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleUploadResponse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && selectedCase) {
        try {
          await dmsService.uploadForCaseStage(file, selectedCase.id, selectedCase.currentStage, dispatch);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    };
    input.click();
  };

  const handleFormClick = async (formCode: string) => {
    try {
      const template = await formTemplatesService.loadFormTemplate(formCode);
      if (template) {
        setFormTemplate(template);
        setSelectedFormCode(formCode);
        setShowFormModal(true);
      } else {
        toast({
          title: "Template Not Found",
          description: `Form template ${formCode} could not be loaded.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading form template:', error);
      toast({
        title: "Error",
        description: "Failed to load form template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFormDownload = (form: GeneratedForm) => {
    // Create download link for existing form
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${form.fileName}`;
    link.download = form.fileName;
    link.click();

    toast({
      title: "Download Started",
      description: `Downloading ${form.fileName}`,
    });
  };

  const handleAdvanceStage = async () => {
    if (!selectedCase || isAdvancing) return;
    
    const currentIndex = lifecycleStages.findIndex(stage => stage.id === selectedCase.currentStage);
    const nextStage = lifecycleStages[currentIndex + 1];
    
    if (nextStage) {
      setIsAdvancing(true);
      try {
        await casesService.advanceStage({
          caseId: selectedCase.id,
          currentStage: selectedCase.currentStage,
          nextStage: nextStage.id,
          notes: `Advanced from ${selectedCase.currentStage} to ${nextStage.id}`
        }, dispatch);
        
        // Trigger parent update callback to refresh the case in parent component
        if (onCaseUpdated) {
          // Get the updated case from the global state
          setTimeout(() => {
            const updatedCase = state.cases.find(c => c.id === selectedCase.id);
            if (updatedCase) {
              onCaseUpdated(updatedCase);
            }
          }, 100); // Small delay to ensure state has been updated
        }
      } catch (error) {
        console.error('Stage advancement failed:', error);
      } finally {
        setIsAdvancing(false);
      }
    }
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onNavigateToOverview && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onNavigateToOverview}
                    className="h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    All Cases
                  </Button>
                )}
                <CardTitle className="flex items-center">
                  <Scale className="mr-2 h-5 w-5 text-primary" />
                  Case Lifecycle Workflow
                </CardTitle>
              </div>
            </div>
            <CardDescription>
              {selectedCase ? 
                `Track progress for ${selectedCase.caseNumber} - ${selectedCase.title}` :
                'Select a case to view its lifecycle progression'
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
                <div className="text-right">
                  <Badge variant="secondary" className={
                    selectedCase.timelineBreachStatus === 'Green' || selectedCase.slaStatus === 'Green' ? 'bg-success text-success-foreground' :
                    selectedCase.timelineBreachStatus === 'Amber' || selectedCase.slaStatus === 'Amber' ? 'bg-warning text-warning-foreground' :
                    'bg-destructive text-destructive-foreground'
                  }>
                    Timeline {selectedCase.timelineBreachStatus || selectedCase.slaStatus}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Stage {currentStageIndex + 1} of {lifecycleStages.length}
                  </p>
                </div>
              </div>
              <Progress value={((currentStageIndex + 1) / lifecycleStages.length) * 100} className="mt-4" />
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Lifecycle Flow */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {lifecycleStages.map((stage, index) => {
          const status = getStageStatus(index);
          const StageIcon = stage.icon;
          
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connection Line */}
              {index < lifecycleStages.length - 1 && (
                <div className="hidden lg:block absolute top-12 right-0 w-full h-0.5 bg-border translate-x-1/2 z-0">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      index < currentStageIndex ? 'bg-success' : 'bg-border'
                    }`}
                    style={{ width: index < currentStageIndex ? '100%' : '0%' }}
                  />
                </div>
              )}
              
              <Card className={`relative z-10 transition-all duration-300 ${
                status === 'current' ? 'ring-2 ring-primary shadow-lg' : ''
              } ${status === 'completed' ? 'bg-success/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    {/* Stage Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                      getStageColor(status)
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : status === 'current' ? (
                        <Clock className="h-6 w-6" />
                      ) : (
                        <StageIcon className="h-6 w-6" />
                      )}
                    </div>
                    
                    {/* Stage Details */}
                    <div>
                      <h3 className={`font-semibold ${
                        status === 'current' ? 'text-primary' : 
                        status === 'completed' ? 'text-success' : 
                        'text-muted-foreground'
                      }`}>
                        {stage.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stage.description}
                      </p>
                    </div>
                    
                    {/* Forms and SLA */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {stage.forms.map((form) => (
                          <Badge key={form} variant="outline" className="text-xs">
                            {form}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Timeline: {stage.slaHours}h
                      </p>
                    </div>
                    
                    {/* Action Button */}
                    {status === 'current' && selectedCase?.status !== 'Completed' && (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => setShowStageModal(true)}
                      >
                        Manage Stage
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ★ Stage Workflow Timeline - Feature Flagged (HIGH PRIORITY - shown above Stage Dashboard) */}
      {selectedCase && isStageWorkflowEnabled && workflowState && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="space-y-4"
        >
          {/* Workflow Timeline Stepper */}
          <StageWorkflowTimeline
            stageKey={selectedCase.currentStage}
            steps={workflowState.steps}
            currentStep={workflowState.currentStep}
            overallProgress={workflowState.overallProgress}
            activeStep={activeStep}
            onStepClick={setActiveStep}
            isLoading={false}
          />

          {/* Active Step Panel */}
          {activeStep === 'notices' && (
            <StageNoticesPanel
              notices={workflowState.notices}
              stageInstanceId={stageInstanceId}
              caseId={selectedCase.id}
              onAddNotice={handleAddNotice}
              onEditNotice={handleEditNotice}
              onDeleteNotice={handleDeleteNotice}
              onViewNotice={handleViewNotice}
              onFileReply={handleFileReply}
              onCloseNotice={handleCloseNotice}
              onScheduleHearing={() => setShowHearingModal(true)}
              noticeReplies={noticeReplies}
              onLoadReplies={loadRepliesForNotice}
            />
          )}

          {activeStep === 'reply' && (
            workflowState.notices.filter(n => n.status === 'Reply Pending' || n.status === 'Received').length > 0 
            ? (
              <StageNoticesPanel
                notices={workflowState.notices.filter(n => n.status === 'Reply Pending' || n.status === 'Received')}
                stageInstanceId={stageInstanceId}
                caseId={selectedCase.id}
                onAddNotice={handleAddNotice}
                onEditNotice={handleEditNotice}
                onDeleteNotice={handleDeleteNotice}
                onViewNotice={handleViewNotice}
                onFileReply={handleFileReply}
                onCloseNotice={handleCloseNotice}
                onScheduleHearing={() => setShowHearingModal(true)}
                noticeReplies={noticeReplies}
                onLoadReplies={loadRepliesForNotice}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ArrowRight className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No notices awaiting reply</p>
                  <p className="text-xs mt-1">Add a notice first, then file replies</p>
                </CardContent>
              </Card>
            )
          )}

          {activeStep === 'hearings' && (
            <StageHearingsPanel
              hearings={stageHearings}
              stageInstanceId={stageInstanceId}
              caseId={selectedCase.id}
              onScheduleHearing={() => setShowHearingModal(true)}
            />
          )}

          {activeStep === 'closure' && (
            <StageClosurePanel
              stageKey={selectedCase.currentStage}
              stageInstanceId={stageInstanceId}
              canClose={workflowState.canClose}
              blockingReasons={workflowState.blockingReasons}
              onCloseStage={handleCloseStage}
              isClosing={isClosingStage}
            />
          )}
        </motion.div>
      )}

      {/* Stage Dashboard - Collapsible (moved below Stage Workflow) */}
      {selectedCase && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Collapsible open={isStageDetailsOpen} onOpenChange={setIsStageDetailsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Stage Dashboard: {selectedCase.currentStage}
                          {stageMetrics && stageMetrics.overdueTasks > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {stageMetrics.overdueTasks} Overdue
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span>Forms</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Timeline</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Actions</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Quick Reference</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Quick Stats Preview (visible when collapsed) */}
                      {!isStageDetailsOpen && stageMetrics && (
                        <div className="hidden md:flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>{stageMetrics.openTasks} open</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{stageMetrics.documentsCount} docs</span>
                          </div>
                          {stageMetrics.upcomingDeadlines.length > 0 && (
                            <Badge variant={stageMetrics.upcomingDeadlines[0].daysUntil < 0 ? "destructive" : "secondary"} className="text-xs">
                              {stageMetrics.upcomingDeadlines[0].label}: {stageMetrics.upcomingDeadlines[0].daysUntil < 0 
                                ? `${Math.abs(stageMetrics.upcomingDeadlines[0].daysUntil)}d overdue` 
                                : `${stageMetrics.upcomingDeadlines[0].daysUntil}d left`}
                            </Badge>
                          )}
                        </div>
                      )}
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isStageDetailsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Quick Access Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Quick Access</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        — Review progress before advancing stage
                      </span>
                    </div>
                    <ContextSplitButton
                      caseId={selectedCase.id}
                      stageInstanceId={currentStageInstanceId}
                      onOpenInline={toggleContextPanel}
                      isInlineOpen={isContextPanelOpen}
                    />
                  </div>

                  {/* Lovable Recommendations: Upcoming Deadlines & Activity */}
                  {stageMetrics && (stageMetrics.upcomingDeadlines.length > 0 || stageMetrics.recentActivity.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upcoming Deadlines Widget */}
                      {stageMetrics.upcomingDeadlines.length > 0 && (
                        <div className="rounded-lg border border-dashed p-3 bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <span className="text-sm font-medium">Upcoming Deadlines</span>
                          </div>
                          <div className="space-y-1">
                            {stageMetrics.upcomingDeadlines.map((deadline, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{deadline.label}</span>
                                <Badge 
                                  variant={deadline.daysUntil < 0 ? "destructive" : deadline.daysUntil <= 2 ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {deadline.daysUntil < 0 
                                    ? `${Math.abs(deadline.daysUntil)} days overdue` 
                                    : deadline.daysUntil === 0 
                                      ? 'Today' 
                                      : `${deadline.daysUntil} days left`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Activity Widget */}
                      {stageMetrics.recentActivity.length > 0 && (
                        <div className="rounded-lg border border-dashed p-3 bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Recent Activity</span>
                          </div>
                          <div className="space-y-1">
                            {stageMetrics.recentActivity.map((activity, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {activity.type === 'task' ? (
                                  <ListTodo className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="truncate flex-1 text-muted-foreground">{activity.title}</span>
                                <span className="text-xs text-muted-foreground/70">
                                  {activity.date ? formatDate(activity.date) : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Progress Widget (Lovable Recommendation: Stage Checklist Progress) */}
                  {stageMetrics && stageMetrics.totalTasks > 0 && (
                    <div className="rounded-lg border p-3 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Task Progress</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {stageMetrics.completedTasks} of {stageMetrics.totalTasks} completed
                        </span>
                      </div>
                      <Progress 
                        value={(stageMetrics.completedTasks / stageMetrics.totalTasks) * 100} 
                        className="h-2" 
                      />
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="text-success">{stageMetrics.completedTasks} done</span>
                        <span>{stageMetrics.openTasks} open</span>
                        {stageMetrics.overdueTasks > 0 && (
                          <span className="text-destructive">{stageMetrics.overdueTasks} overdue</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Main 3-Column Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Required Forms</h4>
                      <div className="space-y-2">
                        {formTemplatesService.getFormsByStage(selectedCase.currentStage, selectedCase.matterType).map((formCode) => (
                          <FormChip
                            key={formCode}
                            formCode={formCode}
                            case={selectedCase}
                            onFormClick={handleFormClick}
                            onDownload={handleFormDownload}
                          />
                        ))}
                        {formTemplatesService.getFormsByStage(selectedCase.currentStage, selectedCase.matterType).length === 0 && (
                          <p className="text-sm text-muted-foreground">No forms required for this stage</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Timeline Tracking</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Time Allocated:</span>
                          <span>{lifecycleStages[currentStageIndex]?.slaHours}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Time Elapsed:</span>
                          <span className="text-warning">48h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Time Remaining:</span>
                          <span className="text-success">24h</span>
                        </div>
                        <Progress value={66} className="mt-2" />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Next Actions</h4>
                      {selectedCase?.status === 'Completed' ? (
                        <p className="text-sm text-muted-foreground">
                          This case has been completed and is read-only.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <HelpButton 
                            helpId="button-upload-response"
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={handleUploadResponse}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Upload Response
                          </HelpButton>
                          <HelpButton 
                            helpId="button-schedule-hearing"
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => setShowHearingModal(true)}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Schedule Hearing
                          </HelpButton>
                          
                          {/* NEW: Create Task */}
                          <HelpButton 
                            helpId="button-create-task"
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={handleCreateTask}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Task
                          </HelpButton>
                          
                          {/* NEW: View Tasks */}
                          <HelpButton 
                            helpId="button-view-tasks"
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={handleViewTasks}
                          >
                            <ListTodo className="mr-2 h-4 w-4" />
                            View Tasks ({stageMetrics?.openTasks || 0} open)
                          </HelpButton>
                          
                          <Separator className="my-2" />
                          
                          <HelpButton 
                            helpId="button-advance-stage"
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => {
                              // Use unified dialog if feature enabled, otherwise quick advance
                              if (featureFlagService.isEnabled('lifecycle_cycles_v1')) {
                                setShowStageModal(true);
                              } else {
                                handleAdvanceStage();
                              }
                            }}
                            disabled={isAdvancing}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            {featureFlagService.isEnabled('lifecycle_cycles_v1') ? 'Advance Stage' : 
                             isAdvancing ? 'Advancing...' : 'Advance Stage'}
                          </HelpButton>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Original Notice Reference Card */}
                  <Card className="border-dashed">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Original Notice Reference
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Notice Date</Label>
                          <p className="font-medium">{formatDate(selectedCase.noticeDate || selectedCase.notice_date)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Reference No.</Label>
                          <p className="font-medium">{selectedCase.noticeNo || selectedCase.notice_no || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Tax Period</Label>
                          <p className="font-medium">{selectedCase.financial_year || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Tax Demand</Label>
                          <p className="font-medium text-destructive">
                            {selectedCase.taxDemand 
                              ? `₹${selectedCase.taxDemand.toLocaleString('en-IN')}` 
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Reply Due Date</Label>
                          <p className="font-medium">{formatDate(selectedCase.replyDueDate || selectedCase.reply_due_date)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Issues Covered</Label>
                          <p className="font-medium">{selectedCase.issueType || selectedCase.matterType || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Section Invoked</Label>
                          <p className="font-medium">{selectedCase.section_invoked || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Issuing Authority</Label>
                          <p className="font-medium truncate" title={selectedCase.authority || selectedCase.jurisdictionalCommissionerate || '—'}>
                            {selectedCase.authority || selectedCase.jurisdictionalCommissionerate || '—'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Link to view scanned notice document */}
                      <div className="mt-4 pt-3 border-t">
                        <Button variant="ghost" size="sm" onClick={handleViewOriginalNotice} className="text-xs h-8">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View Scanned Notice Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      {/* Stage History & Transition History - Enhanced Visual Timeline */}
      {selectedCase && featureFlagService.isEnabled('lifecycle_cycles_v1') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-[400px]"
        >
          {/* Stage History & Cycles - Left Column */}
          <EnhancedCycleTimeline 
            caseId={selectedCase.id} 
            currentStage={selectedCase.currentStage}
          />
          
          {/* Transition History - Right Column */}
          <StageTransitionHistory caseId={selectedCase.id} />
        </motion.div>
      )}

      {/* Stage Management Modal - Use Unified Dialog when feature enabled */}
      {featureFlagService.isEnabled('lifecycle_cycles_v1') ? (
        <UnifiedStageDialog
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          caseId={selectedCase?.id || null}
          currentStage={selectedCase?.currentStage || ''}
          dispatch={dispatch}
          onStageUpdated={(updatedData) => {
            // Trigger parent update callback
            if (onCaseUpdated) {
              const updatedCase = state.cases.find(c => c.id === selectedCase?.id);
              if (updatedCase) {
                onCaseUpdated(updatedCase);
              }
            }
            setShowStageModal(false);
            toast({
              title: "Stage Transition Completed",
              description: `Case ${updatedData.type?.toLowerCase() || 'moved'} successfully.`,
            });
          }}
        />
      ) : (
        <StageManagementModal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          caseId={selectedCase?.id || null}
          currentStage={selectedCase?.currentStage || ''}
          onStageAdvanced={(updatedCase) => {
            // Trigger parent update callback
            if (onCaseUpdated) {
              onCaseUpdated(updatedCase);
            }
            // Also close the modal and show immediate visual feedback
            setShowStageModal(false);
            toast({
              title: "Stage Updated",
              description: "The case stage has been updated successfully.",
            });
          }}
        />
      )}

      {/* Hearing Modal */}
      <HearingModal
        isOpen={showHearingModal}
        onClose={() => {
          setShowHearingModal(false);
          refreshWorkflow(); // Refresh workflow to pick up new hearing
        }}
        mode="create"
        contextCaseId={selectedCase?.id}
        contextClientId={selectedCase?.clientId}
        stageInstanceId={stageInstanceId}
      />

      {/* Form Render Modal */}
      {formTemplate && (
        <FormRenderModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setFormTemplate(null);
            setSelectedFormCode('');
          }}
          template={formTemplate}
          selectedCaseId={selectedCase?.id}
          onFormGenerated={(generatedForm) => {
            // Update case with generated form
            if (selectedCase) {
              const updatedForms = [...(selectedCase.generatedForms || []), generatedForm];
              dispatch({
                type: 'UPDATE_CASE',
                payload: {
                  id: selectedCase.id,
                  generatedForms: updatedForms,
                  lastUpdated: new Date().toISOString()
                }
              });
              
              // Note: Timeline integration would go here in full implementation
            }
          }}
        />
      )}

      {/* Stage Workflow Modals */}
      <AddNoticeModal
        isOpen={showAddNoticeModal}
        onClose={() => {
          setShowAddNoticeModal(false);
          setEditingNotice(null);
          setViewingNotice(null);
        }}
        onSave={handleSaveNotice}
        caseId={selectedCase?.id || ''}
        stageInstanceId={stageInstanceId}
        editNotice={viewingNotice || editingNotice}
        mode={viewingNotice ? 'view' : editingNotice ? 'edit' : 'add'}
      />

      <FileReplyModal
        isOpen={showFileReplyModal}
        onClose={() => {
          setShowFileReplyModal(false);
          setSelectedNotice(null);
        }}
        onSave={handleSaveReply}
        notice={selectedNotice}
        stageInstanceId={stageInstanceId}
      />

      <NoticeClosureModal
        isOpen={!!closingNotice}
        onClose={() => setClosingNotice(null)}
        onSave={handleSaveNoticeClosure}
        notice={closingNotice}
      />
    </div>
  );
};