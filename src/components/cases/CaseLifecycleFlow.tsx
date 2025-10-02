import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StageManagementModal } from '@/components/modals/StageManagementModal';
import { UnifiedStageDialog } from '@/components/lifecycle/UnifiedStageDialog';
import { CycleTimeline } from '@/components/lifecycle/CycleTimeline';
import { featureFlagService } from '@/services/featureFlagService';
import { HearingModal } from '@/components/modals/HearingModal';
import { FormRenderModal } from '@/components/documents/FormRenderModal';
import { FormChip } from './FormChip';
import { useAppState, Case, GeneratedForm } from '@/contexts/AppStateContext';
import { casesService } from '@/services/casesService';
import { dmsService } from '@/services/dmsService';
import { formTemplatesService } from '@/services/formTemplatesService';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Upload,
  Calendar,
  Users,
  Scale,
  Gavel,
  Building,
  Flag,
  BookOpen
} from 'lucide-react';

interface CaseLifecycleFlowProps {
  selectedCase?: Case | null;
  onCaseUpdated?: (updatedCase: Case) => void;
}

const lifecycleStages = [
  {
    id: 'Scrutiny',
    name: 'Scrutiny',
    description: 'Initial case review and documentation',
    icon: FileText,
    forms: ['ASMT-10', 'ASMT-11'],
    slaHours: 72
  },
  {
    id: 'Demand',
    name: 'Demand',
    description: 'Demand notice processing and response',
    icon: AlertTriangle,
    forms: ['DRC-01', 'DRC-07'],
    slaHours: 168
  },
  {
    id: 'Adjudication',
    name: 'Adjudication',
    description: 'Adjudicating authority proceedings',
    icon: Scale,
    forms: ['ASMT-12'],
    slaHours: 720
  },
  {
    id: 'Appeals',
    name: 'Appeals',
    description: 'First appellate authority',
    icon: ArrowRight,
    forms: ['Appeal Form'],
    slaHours: 1440
  },
  {
    id: 'GSTAT',
    name: 'GSTAT',
    description: 'GST Appellate Tribunal',
    icon: Building,
    forms: ['GSTAT Form'],
    slaHours: 2160
  },
  {
    id: 'HC',
    name: 'HC',
    description: 'High Court proceedings',
    icon: Gavel,
    forms: ['HC Petition'],
    slaHours: 4320
  },
  {
    id: 'SC',
    name: 'SC',
    description: 'Supreme Court of India',
    icon: Gavel,
    forms: ['SLP/Appeal'],
    slaHours: 8760
  }
];

export const CaseLifecycleFlow: React.FC<CaseLifecycleFlowProps> = ({ selectedCase, onCaseUpdated }) => {
  const { toast } = useToast();
  const { state, dispatch } = useAppState();
  const [showStageModal, setShowStageModal] = useState(false);
  const [showHearingModal, setShowHearingModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormCode, setSelectedFormCode] = useState<string>('');
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

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
    return lifecycleStages.findIndex(stage => 
      stage.id === selectedCase.currentStage
    );
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
            <CardTitle className="flex items-center">
              <Scale className="mr-2 h-5 w-5 text-primary" />
              Case Lifecycle Workflow
            </CardTitle>
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
        className="grid grid-cols-1 lg:grid-cols-7 gap-4"
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
                    {status === 'current' && (
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

      {/* Stage Details */}
      {selectedCase && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Current Stage: {selectedCase.currentStage}</CardTitle>
              <CardDescription>
                Detailed information and required actions for the current stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Required Forms</h4>
                  <div className="space-y-2">
                    {formTemplatesService.getFormsByStage(selectedCase.currentStage).map((formCode) => (
                      <FormChip
                        key={formCode}
                        formCode={formCode}
                        case={selectedCase}
                        onFormClick={handleFormClick}
                        onDownload={handleFormDownload}
                      />
                    ))}
                    {formTemplatesService.getFormsByStage(selectedCase.currentStage).length === 0 && (
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
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleUploadResponse}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Response
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setShowHearingModal(true)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule Hearing
                    </Button>
                    <Button 
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
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cycle Timeline (if feature enabled) */}
      {selectedCase && featureFlagService.isEnabled('lifecycle_cycles_v1') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <CycleTimeline 
            caseId={selectedCase.id}
            currentStage={selectedCase.currentStage}
          />
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
              description: `Case ${updatedData.type.toLowerCase()}ed successfully.`,
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
        onClose={() => setShowHearingModal(false)}
        mode="create"
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
    </div>
  );
};