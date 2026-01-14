import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Scale, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Lock, 
  FileDown, 
  Loader2,
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Case } from '@/contexts/AppStateContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { caseActionDossierService } from '@/services/caseActionDossierService';
import { toast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface StickyCaseActionBarProps {
  selectedCase: Case;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClearSelection: () => void;
  clientName?: string;
  courtName?: string;
  onMarkComplete?: (caseData: Case) => void;
  getTabDisabled: (tabName: string) => boolean;
}

export const StickyCaseActionBar: React.FC<StickyCaseActionBarProps> = ({
  selectedCase,
  activeTab,
  onTabChange,
  onClearSelection,
  clientName,
  courtName,
  onMarkComplete,
  getTabDisabled
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const isCompleted = selectedCase.status === 'Completed';

  // Keyboard shortcut: Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClearSelection]);

  const handleDownloadDossier = async () => {
    setIsExporting(true);
    try {
      await caseActionDossierService.downloadDossier(selectedCase.id);
      toast({
        title: "Dossier Downloaded",
        description: "Case Action Dossier has been exported successfully.",
      });
    } catch (error) {
      console.error('Failed to export dossier:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate Case Action Dossier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'Medium': return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'Low': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const tabs = [
    { value: 'overview', label: 'Overview', disabled: false },
    { value: 'lifecycle', label: 'Lifecycle', disabled: getTabDisabled('lifecycle') },
    { value: 'sla', label: 'Timeline Tracker', disabled: false },
    { value: 'hearings', label: 'Hearings', disabled: false },
    { value: 'documents', label: 'Documents', disabled: getTabDisabled('documents') },
    { value: 'timeline', label: 'Timeline', disabled: getTabDisabled('timeline') },
    { value: 'ai-assistant', label: 'AI Assistant', disabled: getTabDisabled('ai-assistant') },
    { value: 'communications', label: 'Communications', disabled: getTabDisabled('communications') },
    { value: 'tasks', label: 'Tasks', disabled: getTabDisabled('tasks') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="sticky top-16 z-[35] bg-background/95 backdrop-blur-sm border-b border-border shadow-sm -mx-6 px-6"
      role="navigation"
      aria-label="Case actions"
    >
      {/* Read-Only Banner for Completed Cases */}
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

      {/* Case Info Row */}
      <div className="py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Case Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Scale className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-foreground truncate max-w-[300px] lg:max-w-[400px]">
                  {selectedCase.title}
                </h2>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {selectedCase.caseNumber}
                </Badge>
                {isCompleted && (
                  <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {clientName && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{clientName}</span>
                  </div>
                )}
                <Badge variant="secondary" className="text-xs h-5">
                  {selectedCase.currentStage}
                </Badge>
                {selectedCase.priority && (
                  <Badge variant="outline" className={`text-xs h-5 ${getPriorityColor(selectedCase.priority)}`}>
                    {selectedCase.priority}
                  </Badge>
                )}
                {selectedCase.nextHearing && (
                  <div className="hidden md:flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(selectedCase.nextHearing.date).toLocaleDateString()}
                      {courtName && <span className="text-muted-foreground"> at {courtName}</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDossier}
                    disabled={isExporting}
                    className="h-8"
                  >
                    {isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline ml-1.5">Dossier</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download Case Action Dossier (PDF)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {!isCompleted && onMarkComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkComplete(selectedCase)}
                      className="h-8 text-success border-success/30 hover:bg-success/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1.5">Complete</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark case as completed</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-8"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1.5">Clear</span>
                    <span className="hidden lg:inline text-xs text-muted-foreground ml-1">(Esc)</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear selection (Esc)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="pb-2 -mx-2">
        <ScrollArea className="w-full">
          <div className="flex gap-1 px-2" role="tablist" aria-label="Case management tabs">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                aria-disabled={tab.disabled}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && onTabChange(tab.value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                  ${activeTab === tab.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                  ${tab.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer'
                  }
                `}
                title={tab.disabled ? "Select a case from Overview to proceed" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    </motion.div>
  );
};
