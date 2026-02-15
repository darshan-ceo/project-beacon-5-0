import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Users,
  Calendar,
  CheckCircle2,
  Lock,
  BarChart3,
  X,
  Edit,
  FileText,
  MessageSquare,
  Clock,
  Bot,
  ListTodo,
  LayoutDashboard,
  Workflow,
  Gavel,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CaseLifecycleFlow } from './CaseLifecycleFlow';
import { CaseTimeline } from './CaseTimeline';
import { HearingScheduler } from './HearingScheduler';
import { TimelineBreachTracker } from './TimelineBreachTracker';
import { AIAssistant } from './AIAssistant';
import { CommunicationHub } from './CommunicationHub';
import { CaseDocuments } from './CaseDocuments';
import { CaseTasksTab } from './CaseTasksTab';
import { CaseModal } from '@/components/modals/CaseModal';
import { CaseCompletionModal } from '@/components/modals/CaseCompletionModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface CaseWorkspaceDrawerProps {
  selectedCase: Case | null;
  onClose: () => void;
}

export const CaseWorkspaceDrawer: React.FC<CaseWorkspaceDrawerProps> = ({
  selectedCase,
  onClose,
}) => {
  const { state } = useAppState();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [caseModal, setCaseModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; case?: Case | null }>({
    isOpen: false,
    mode: 'edit',
    case: null,
  });
  const [completionModal, setCompletionModal] = useState<{ isOpen: boolean; caseData: Case | null }>({
    isOpen: false,
    caseData: null,
  });

  // Track the latest version of selectedCase from state
  const currentCase = selectedCase 
    ? state.cases.find(c => c.id === selectedCase.id) || selectedCase 
    : null;

  const isOpen = !!currentCase;
  const isCompleted = currentCase?.status === 'Completed';

  // Reset tab when a new case is selected
  useEffect(() => {
    if (currentCase) {
      setActiveTab('overview');
    }
  }, [currentCase?.id]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!currentCase) return null;

  const clientName = state.clients.find(c => c.id === currentCase.clientId)?.name || 'Unknown Client';
  const assignedName = currentCase.assignedToName || 'Unassigned';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'Medium': return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'Low': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary/10 text-primary border-primary/30';
      case 'Completed': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'lifecycle', label: 'Lifecycle', icon: Workflow },
    { value: 'hearings', label: 'Hearings', icon: Gavel },
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'tasks', label: 'Tasks', icon: ListTodo },
    { value: 'timeline', label: 'Timeline', icon: Clock },
    { value: 'communications', label: 'Communications', icon: MessageSquare },
    { value: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  ];

  const handleCaseUpdated = (updatedCase: Case) => {
    // The parent will receive updates via state sync
  };

  const handleOpenIntelligence = () => {
    navigate(`/cases/${currentCase.id}/intelligence-report`);
  };

  // Overview tab content - summary card
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Client</p>
          <p className="font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {clientName}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
          <p className="font-medium text-foreground flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {currentCase.currentStage}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
          <p className="font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {assignedName}
          </p>
        </div>
        {currentCase.taxDemand && (
          <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/20">
            <p className="text-xs text-muted-foreground mb-1">Tax Demand</p>
            <p className="font-semibold text-destructive text-lg">
              ₹{currentCase.taxDemand.toLocaleString('en-IN')}
            </p>
          </div>
        )}
        {currentCase.nextHearing && (
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Next Hearing</p>
            <p className="font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(currentCase.nextHearing.date).toLocaleDateString()}
            </p>
          </div>
        )}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="font-medium text-foreground">
            {currentCase.createdDate ? new Date(currentCase.createdDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Description */}
      {currentCase.description && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-2">Description</p>
          <p className="text-sm text-foreground">{currentCase.description}</p>
        </div>
      )}

      {/* Timeline Breach Tracker as sub-section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Timeline Tracker
        </h3>
        <ErrorBoundary>
          <TimelineBreachTracker
            cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))}
            selectedCase={currentCase}
          />
        </ErrorBoundary>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'lifecycle':
        return (
          <ErrorBoundary>
            <CaseLifecycleFlow
              selectedCase={currentCase}
              onCaseUpdated={handleCaseUpdated}
              onNavigateToOverview={() => setActiveTab('overview')}
            />
          </ErrorBoundary>
        );
      case 'hearings':
        return (
          <ErrorBoundary>
            <HearingScheduler
              cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))}
              selectedCase={currentCase}
            />
          </ErrorBoundary>
        );
      case 'documents':
        return (
          <ErrorBoundary>
            <CaseDocuments selectedCase={currentCase} />
          </ErrorBoundary>
        );
      case 'tasks':
        return (
          <ErrorBoundary>
            <CaseTasksTab caseData={currentCase} />
          </ErrorBoundary>
        );
      case 'timeline':
        return (
          <ErrorBoundary>
            <CaseTimeline selectedCase={currentCase} />
          </ErrorBoundary>
        );
      case 'communications':
        return (
          <ErrorBoundary>
            <CommunicationHub selectedCase={currentCase} />
          </ErrorBoundary>
        );
      case 'ai-assistant':
        return (
          <ErrorBoundary>
            <AIAssistant selectedCase={currentCase} />
          </ErrorBoundary>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="flex h-full w-[100vw] sm:w-[95vw] lg:w-[90vw] max-w-[1600px] flex-col p-0 gap-0
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
            data-[state=closed]:duration-300 data-[state=open]:duration-400"
        >
          {/* Hide default Sheet close button via targeted selector */}
          <style>{`[data-radix-dialog-content] > button.absolute.right-4.top-4 { display: none !important; }`}</style>

          {/* Read-Only Banner */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                    This case is <strong>read-only</strong>. No modifications can be made.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-background border-b border-border">
            {/* Case Info Row */}
            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Case Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl font-bold text-foreground truncate max-w-[500px]">
                      {currentCase.title}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {currentCase.caseNumber}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(currentCase.status)}`}>
                      {currentCase.status}
                    </Badge>
                    {currentCase.priority && (
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(currentCase.priority)}`}>
                        {currentCase.priority}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {clientName}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{assignedName}</span>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleOpenIntelligence} className="h-8">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline ml-1.5">Intelligence</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Case Intelligence Report</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {!isCompleted && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCaseModal({ isOpen: true, mode: 'edit', case: currentCase })}
                              className="h-8"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline ml-1.5">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit case details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCompletionModal({ isOpen: true, caseData: currentCase })}
                              className="h-8 text-success border-success/30 hover:bg-success/10"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline ml-1.5">Complete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark case as completed</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full"
                    aria-label="Close workspace"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pb-2">
              <ScrollArea className="w-full">
                <div className="flex gap-1" role="tablist" aria-label="Case workspace tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.value}
                        role="tab"
                        aria-selected={activeTab === tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                          ${activeTab === tab.value
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5" />
              </ScrollArea>
            </div>
          </div>

          {/* Scrollable Content Area - single scroll container */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Nested Modals */}
      <CaseModal
        isOpen={caseModal.isOpen}
        onClose={() => setCaseModal({ isOpen: false, mode: 'edit', case: null })}
        case={caseModal.case}
        mode={caseModal.mode}
      />

      {completionModal.caseData && (
        <CaseCompletionModal
          isOpen={completionModal.isOpen}
          onClose={() => setCompletionModal({ isOpen: false, caseData: null })}
          caseData={completionModal.caseData}
          onComplete={() => {}}
        />
      )}
    </>
  );
};
