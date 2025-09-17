import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  Scale, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Users,
  FileText,
  ArrowRight,
  Plus,
  Filter,
  Search,
  Eye,
  Edit,
  Info,
  Check,
  HelpCircle
} from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { casesService } from '@/services/casesService';
import { getNextStage, validateStagePrerequisites, generateStageDefaults } from '@/utils/stageUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaseLifecycleFlow } from './CaseLifecycleFlow';
import { CaseTimeline } from './CaseTimeline';
import { HearingScheduler } from './HearingScheduler';
import { SLATracker } from './SLATracker';
import { AIAssistant } from './AIAssistant';
import { CommunicationHub } from './CommunicationHub';
import { CaseModal } from '@/components/modals/CaseModal';
import { HearingCalendar } from './HearingCalendar';
import { AdvanceStageConfirmationModal } from '@/components/modals/AdvanceStageConfirmationModal';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { formTemplatesService } from '@/services/formTemplatesService';
import { FormRenderModal } from '@/components/documents/FormRenderModal';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { InlineHelp } from '@/components/help/InlineHelp';
import { PageHelp } from '@/components/help/PageHelp';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';
import { tourService } from '@/services/tourService';
import { GlossaryText, GlossaryDescription } from '@/components/ui/glossary-enhanced';
import { NoticeIntakeWizard } from '@/components/notices/NoticeIntakeWizard';
import { featureFlagService } from '@/services/featureFlagService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const CaseManagement: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showHelpText, setShowHelpText] = useState(true);
  const [caseModal, setCaseModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; case?: Case | null }>({
    isOpen: false,
    mode: 'create',
    case: null
  });
  const [hearingCalendarOpen, setHearingCalendarOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<'all' | string>('all');
  const [filterSLA, setFilterSLA] = useState<'all' | string>('all');
  const [advanceStageModal, setAdvanceStageModal] = useState<{
    isOpen: boolean;
    caseData: Case | null;
    currentStage: string;
    nextStage: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    caseData: null,
    currentStage: '',
    nextStage: '',
    isLoading: false
  });
  
  const [formTemplateModal, setFormTemplateModal] = useState<{
    isOpen: boolean;
    template: any;
    caseId: string;
  }>({
    isOpen: false,
    template: null,
    caseId: ''
  });
  const [noticeIntakeModal, setNoticeIntakeModal] = useState(false);

  // Handle URL parameters and return context
  useEffect(() => {
    const caseId = searchParams.get('caseId');
    const tab = searchParams.get('tab');
    const returnTo = searchParams.get('returnTo');
    const returnCaseId = searchParams.get('returnCaseId');
    
    if (caseId) {
      const caseToSelect = state.cases.find(c => c.id === caseId);
      if (caseToSelect && caseToSelect.id !== selectedCase?.id) {
        setSelectedCase(caseToSelect);
        setShowHelpText(false);
      }
    }
    
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }

    // Store return context if present
    if (returnTo && returnCaseId) {
      const returnContext = {
        returnTo,
        returnCaseId,
        returnStage: searchParams.get('returnStage'),
        fromUrl: window.location.pathname + window.location.search,
        timestamp: Date.now()
      };
      localStorage.setItem('navigation-context', JSON.stringify(returnContext));
    }
  }, [searchParams, state.cases]);

  // Sync selectedCase with global state changes
  useEffect(() => {
    if (selectedCase) {
      const updatedCase = state.cases.find(c => c.id === selectedCase.id);
      if (updatedCase && JSON.stringify(updatedCase) !== JSON.stringify(selectedCase)) {
        setSelectedCase(updatedCase);
        // Force a re-render of the lifecycle component by triggering state update
        console.log('Case updated in CaseManagement:', updatedCase.currentStage);
      }
    }
  }, [state.cases, selectedCase]);

  // Handler for when case is updated from child components
  const handleCaseUpdated = (updatedCase: Case) => {
    setSelectedCase(updatedCase);
    // Force activeTab to refresh if we're on lifecycle tab
    if (activeTab === 'lifecycle') {
      setActiveTab('lifecycle'); // This will trigger a re-render
    }
  };

  const getSLAColor = (status: string) => {
    switch (status) {
      case 'Green': return 'bg-success text-success-foreground';
      case 'Amber': return 'bg-warning text-warning-foreground';
      case 'Red': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-destructive text-destructive-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStageProgress = (stage: string) => {
    const stages = ['Scrutiny', 'Demand', 'Adjudication', 'Appeals', 'GSTAT', 'HC', 'SC'];
    return ((stages.indexOf(stage) + 1) / stages.length) * 100;
  };

  const handleAdvanceCase = (caseData: Case) => {
    // Check permissions
    if (!hasPermission('cases', 'write')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to advance case stages.",
        variant: "destructive"
      });
      return;
    }

    const nextStage = getNextStage(caseData.currentStage);
    if (!nextStage) {
      toast({
        title: "Stage Advancement Not Available",
        description: "This case is already at the final stage or has an invalid current stage.",
        variant: "destructive"
      });
      return;
    }

    setAdvanceStageModal({
      isOpen: true,
      caseData,
      currentStage: caseData.currentStage,
      nextStage,
      isLoading: false
    });
  };

  const handleConfirmAdvanceStage = async (notes?: string) => {
    if (!advanceStageModal.caseData) return;

    setAdvanceStageModal(prev => ({ ...prev, isLoading: true }));

    try {
      await casesService.advanceStage({
        caseId: advanceStageModal.caseData.id,
        currentStage: advanceStageModal.currentStage,
        nextStage: advanceStageModal.nextStage,
        notes,
        assignedTo: advanceStageModal.caseData.assignedToId
      }, dispatch);

      // Generate auto-tasks for the new stage
      const stageDefaults = generateStageDefaults(advanceStageModal.nextStage);
      
      toast({
        title: "Stage Advanced Successfully",
        description: `Case moved to ${advanceStageModal.nextStage}. ${stageDefaults.suggestedTasks.length} tasks generated.`,
      });

      setAdvanceStageModal({
        isOpen: false,
        caseData: null,
        currentStage: '',
        nextStage: '',
        isLoading: false
      });
    } catch (error) {
      toast({
        title: "Failed to Advance Stage",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
      setAdvanceStageModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const canUserAdvanceStage = hasPermission('cases', 'write');

  // Helper function to handle case selection
  const handleCaseSelect = (caseItem: Case) => {
    setSelectedCase(caseItem);
    if (showHelpText) {
      setShowHelpText(false);
    }
  };

  // Helper function to check if tabs should be disabled
  const getTabDisabled = (tabValue: string) => {
    const caseRequiredTabs = ['lifecycle', 'timeline', 'ai-assistant', 'communications'];
    return caseRequiredTabs.includes(tabValue) && !selectedCase;
  };

  // Auto-switch to overview if accessing disabled tab
  useEffect(() => {
    if (getTabDisabled(activeTab)) {
      setActiveTab('overview');
    }
  }, [selectedCase, activeTab]);

  // Return navigation handler
  const handleReturnToStageManagement = () => {
    const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
    if (returnContext.returnTo === 'stage-management' && returnContext.returnCaseId) {
      // Navigate back to case and open stage management
      navigate(`/cases?caseId=${returnContext.returnCaseId}`);
      
      // Clear return context
      localStorage.removeItem('navigation-context');
      
      // Signal to reopen stage dialog after navigation
      setTimeout(() => {
        const event = new CustomEvent('reopen-stage-dialog', { 
          detail: { 
            caseId: returnContext.returnCaseId,
            stageId: returnContext.returnStage 
          } 
        });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  // Check if we have return context
  const hasReturnContext = () => {
    try {
      const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
      return returnContext.returnTo === 'stage-management' && returnContext.returnCaseId;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Return Navigation Breadcrumb */}
      {hasReturnContext() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-secondary/10 border border-secondary/20 rounded-lg p-3"
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Cases
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  {selectedCase?.caseNumber || 'Case'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Stage Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Hearings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              Viewing hearings from Case Stage Management
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToStageManagement}
              className="h-8"
            >
              <ArrowRight className="mr-2 h-3 w-3" />
              Back to Case Stage
            </Button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Case Management</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive case lifecycle with SLA tracking and hearing management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => tourService.startTour('case-management')}
            className="flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Start Tour
          </Button>
          <ContextualPageHelp 
            pageId="case-management" 
            activeTab={activeTab}
            variant="resizable" 
          />
          <InlineHelp module="case-management" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-hover"
                data-tour="new-case-btn"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Case
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCaseModal({ isOpen: true, mode: 'create', case: null })}>
                <Scale className="mr-2 h-4 w-4" />
                Create Case
              </DropdownMenuItem>
              {featureFlagService.isEnabled('notice_intake_v1') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setNoticeIntakeModal(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    From Notice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-xs text-success mt-1">+12 this month</p>
              </div>
              <Scale className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Breaches</p>
                <p className="text-2xl font-bold text-destructive">8</p>
                <p className="text-xs text-destructive mt-1">Needs attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Hearings</p>
                <p className="text-2xl font-bold text-foreground">23</p>
                <p className="text-xs text-warning mt-1">Next 7 days</p>
              </div>
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Cases</p>
                <p className="text-2xl font-bold text-foreground">342</p>
                <p className="text-xs text-success mt-1">This year</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases by number, title, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <FilterDropdown
            label="Stage"
            value={filterStage}
            options={[
              { label: 'Scrutiny', value: 'Scrutiny' },
              { label: 'Demand', value: 'Demand' },
              { label: 'Adjudication', value: 'Adjudication' },
              { label: 'Appeals', value: 'Appeals' },
              { label: 'GSTAT', value: 'GSTAT' },
              { label: 'HC', value: 'HC' },
              { label: 'SC', value: 'SC' }
            ]}
            onChange={(value) => setFilterStage(value)}
          />
          <FilterDropdown
            label="SLA"
            value={filterSLA}
            options={[
              { label: 'Green', value: 'Green' },
              { label: 'Amber', value: 'Amber' },
              { label: 'Red', value: 'Red' }
            ]}
            onChange={(value) => setFilterSLA(value)}
          />
          <Button 
            variant="outline"
            onClick={() => {
              try {
                setHearingCalendarOpen(true);
              } catch (error) {
                console.error('Error opening hearing calendar:', error);
                toast({
                  title: "Error",
                  description: "Failed to open hearing calendar",
                  variant: "destructive"
                });
              }
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Hearing Calendar
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger 
            value="lifecycle" 
            disabled={getTabDisabled('lifecycle')}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            title={getTabDisabled('lifecycle') ? "Select a case from Overview to proceed" : ""}
          >
            Lifecycle
          </TabsTrigger>
          <TabsTrigger value="sla">SLA Tracker</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger 
            value="timeline"
            disabled={getTabDisabled('timeline')}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            title={getTabDisabled('timeline') ? "Select a case from Overview to proceed" : ""}
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger 
            value="ai-assistant"
            disabled={getTabDisabled('ai-assistant')}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            title={getTabDisabled('ai-assistant') ? "Select a case from Overview to proceed" : ""}
          >
            AI Assistant
          </TabsTrigger>
          <TabsTrigger 
            value="communications"
            disabled={getTabDisabled('communications')}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            title={getTabDisabled('communications') ? "Select a case from Overview to proceed" : ""}
          >
            Communications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Help Instructions Panel */}
            {showHelpText && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-primary/5 border border-primary/20 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Select a Case to Get Started</h4>
                    <p className="text-sm text-muted-foreground">
                      Please select a case from the list below. The selected case will be highlighted and used across 
                      Lifecycle, Timeline, AI Assistant, and Communications tabs.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {!showHelpText && selectedCase && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-secondary/5 border border-secondary/20 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium text-foreground">
                      Selected: {selectedCase.title} ({selectedCase.caseNumber})
                    </span>
                  </div>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowHelpText(true)}
                    className="text-xs h-auto p-1"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Help
                  </Button>
                </div>
              </motion.div>
            )}
            <div data-tour="case-list">
            {state.cases.map((caseItem, index) => {
              const isSelected = selectedCase?.id === caseItem.id;
              return (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card 
                    className={`hover-lift cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-l-4 border-l-primary bg-primary/5 shadow-md ring-1 ring-primary/20' 
                        : 'hover:border-l-4 hover:border-l-secondary hover:bg-secondary/5'
                    }`}
                    onClick={() => handleCaseSelect(caseItem)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isSelected && (
                              <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{caseItem.title}</h3>
                              <p className="text-sm text-muted-foreground">{caseItem.caseNumber} • {state.clients.find(c => c.id === caseItem.clientId)?.name || 'Unknown Client'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className={getPriorityColor(caseItem.priority)}>
                              {caseItem.priority} Priority
                            </Badge>
                            <Badge variant="secondary" className={getSLAColor(caseItem.slaStatus)}>
                              SLA {caseItem.slaStatus}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Stage</p>
                            <p className="font-medium">{caseItem.currentStage}</p>
                            <Progress value={getStageProgress(caseItem.currentStage)} className="mt-1 h-2" />
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <div className="flex items-center">
                              <Users className="mr-1 h-3 w-3" />
                              <span className="text-sm">{caseItem.assignedToName}</span>
                            </div>
                          </div>
                          
                           <div>
                             <p className="text-xs text-muted-foreground">Documents</p>
                             <div className="flex items-center">
                               <FileText className="mr-1 h-3 w-3" />
                               <span className="text-sm">{caseItem.documents} files</span>
                             </div>
                           </div>
                           
                           {caseItem.nextHearing && (
                             <div>
                               <p className="text-xs text-muted-foreground">Next Hearing</p>
                               <p className="text-sm font-medium">{caseItem.nextHearing.date}</p>
                               <p className="text-xs text-muted-foreground">{state.courts.find(c => c.id === caseItem.nextHearing?.courtId)?.name || 'Unknown Court'}</p>
                             </div>
                           )}
                         </div>

                        {/* Quick Actions for Form Templates */}
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formTemplatesService.getFormsByStage(caseItem.currentStage).map(formCode => (
                              <Button
                                key={formCode}
                                variant="outline"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const template = await formTemplatesService.loadFormTemplate(formCode);
                                  if (template) {
                                    setFormTemplateModal({
                                      isOpen: true,
                                      template,
                                      caseId: caseItem.id
                                    });
                                  }
                                }}
                                className="text-xs"
                              >
                                Generate {formCode.replace('_', '-')}
                              </Button>
                            ))}
                            {formTemplatesService.getFormsByStage(caseItem.currentStage).length === 0 && (
                              <span className="text-xs text-muted-foreground">No forms available for {caseItem.currentStage} stage</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Created: {caseItem.createdDate}</span>
                            <span>•</span>
                            <span>Updated: {caseItem.lastUpdated}</span>
                          </div>
                          <div className="flex items-center space-x-2" data-tour="case-actions">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseModal({ isOpen: true, mode: 'view', case: caseItem });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseModal({ isOpen: true, mode: 'edit', case: caseItem });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceCase(caseItem);
                              }}
                              disabled={!canUserAdvanceStage || !getNextStage(caseItem.currentStage)}
                              title={
                                !canUserAdvanceStage 
                                  ? "Insufficient permission to advance stages"
                                  : !getNextStage(caseItem.currentStage)
                                  ? "Case is at final stage"
                                  : `Advance to ${getNextStage(caseItem.currentStage)}`
                              }
                            >
                              <ArrowRight className={`h-4 w-4 ${
                                canUserAdvanceStage && getNextStage(caseItem.currentStage)
                                  ? 'text-primary hover:text-primary-hover'
                                  : 'text-muted-foreground'
                              }`} />
                            </Button>
                         </div>
                        </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
             })}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6">
          <CaseLifecycleFlow 
            selectedCase={selectedCase} 
            onCaseUpdated={handleCaseUpdated}
          />
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <SLATracker cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))} />
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          <HearingScheduler cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <CaseTimeline selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="ai-assistant" className="mt-6">
          <AIAssistant selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <CommunicationHub selectedCase={selectedCase} />
        </TabsContent>
      </Tabs>

      <CaseModal
        isOpen={caseModal.isOpen}
        onClose={() => setCaseModal({ isOpen: false, mode: 'create', case: null })}
        case={caseModal.case}
        mode={caseModal.mode}
      />

      <ErrorBoundary>
        <HearingCalendar
          isOpen={hearingCalendarOpen}
          onClose={() => {
            try {
              setHearingCalendarOpen(false);
            } catch (error) {
              console.error('Error closing hearing calendar:', error);
            }
          }}
        />
      </ErrorBoundary>

      {advanceStageModal.caseData && (
        <AdvanceStageConfirmationModal
          isOpen={advanceStageModal.isOpen}
          onClose={() => setAdvanceStageModal({
            isOpen: false,
            caseData: null,
            currentStage: '',
            nextStage: '',
            isLoading: false
          })}
          onConfirm={handleConfirmAdvanceStage}
          caseData={advanceStageModal.caseData}
          currentStage={advanceStageModal.currentStage}
          nextStage={advanceStageModal.nextStage}
          prerequisites={validateStagePrerequisites(advanceStageModal.caseData, advanceStageModal.currentStage, state.tasks)}
          isLoading={advanceStageModal.isLoading}
        />
      )}

      {formTemplateModal.template && (
        <FormRenderModal
          isOpen={formTemplateModal.isOpen}
          onClose={() => setFormTemplateModal({ isOpen: false, template: null, caseId: '' })}
          template={formTemplateModal.template}
          selectedCaseId={formTemplateModal.caseId}
        />
      )}

      {/* Notice Intake Wizard */}
      {featureFlagService.isEnabled('notice_intake_v1') && (
        <NoticeIntakeWizard
          isOpen={noticeIntakeModal}
          onClose={() => setNoticeIntakeModal(false)}
        />
      )}
    </div>
  );
};