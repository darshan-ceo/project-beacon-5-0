import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Shield, 
  Bell, 
  Scale, 
  Bot, 
  Link2, 
  MapPin, 
  FileText, 
  Database,
  TestTube,
  HelpCircle,
  Save,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { InlineHelpDrawer } from '@/components/help/InlineHelpDrawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SettingsSection = 
  | 'general'
  | 'security'
  | 'notifications'
  | 'legal'
  | 'ai-communications'
  | 'integrations'
  | 'address'
  | 'templates'
  | 'legal-hierarchy'
  | 'sample-data';

interface NavigationItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
  description: string;
  tooltip: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    description: 'System & performance settings',
    tooltip: 'Configure basic system parameters'
  },
  {
    id: 'security',
    label: 'Security & Roles',
    icon: Shield,
    description: 'Authentication & access control',
    tooltip: 'Manage security policies and user access'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email, SMS & push settings',
    tooltip: 'Configure notification preferences'
  },
  {
    id: 'legal',
    label: 'Legal Configuration',
    icon: Scale,
    description: 'Case management parameters',
    tooltip: 'Set legal workflow parameters'
  },
  {
    id: 'ai-communications',
    label: 'AI & Communications',
    icon: Bot,
    description: 'AI assistant & templates',
    tooltip: 'Configure AI and messaging settings'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Link2,
    description: 'Calendar & third-party',
    tooltip: 'Connect external services'
  },
  {
    id: 'address',
    label: 'Address & Location',
    icon: MapPin,
    description: 'Address configuration',
    tooltip: 'Manage address formats and locations'
  },
  {
    id: 'templates',
    label: 'Templates & Outcomes',
    icon: FileText,
    description: 'Document templates',
    tooltip: 'Manage outcome templates'
  },
  {
    id: 'legal-hierarchy',
    label: 'Legal Hierarchy',
    icon: Database,
    description: 'Authority levels & matter types',
    tooltip: 'Define legal authority structure'
  },
  {
    id: 'sample-data',
    label: 'Data Management',
    icon: TestTube,
    description: 'Readiness & cleanup tools',
    tooltip: 'Production readiness and data cleanup'
  }
];

interface SystemSettingsLayoutProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

export const SystemSettingsLayout: React.FC<SystemSettingsLayoutProps> = ({
  activeSection,
  onSectionChange,
  hasChanges,
  isSaving,
  onSave,
  onReset,
  children
}) => {
  const currentNav = navigationItems.find(item => item.id === activeSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Configure system-wide settings and parameters
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={onReset}
            className="text-destructive hover:text-destructive flex-1 sm:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Reset to Defaults</span>
            <span className="sm:hidden">Reset</span>
          </Button>
          <Button onClick={onSave} disabled={!hasChanges || isSaving} className="flex-1 sm:flex-none">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Saving</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <p className="text-orange-800 dark:text-orange-200">
              You have unsaved changes. Click "Save Changes" to apply them.
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Vertical Navigation */}
        <TooltipProvider>
          <nav className="w-full lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <ScrollArea className="h-auto lg:h-[calc(100vh-220px)]">
                <div className="space-y-1 pr-2">
                  {navigationItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onSectionChange(item.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                              isActive 
                                ? "bg-primary text-primary-foreground shadow-md" 
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 flex-shrink-0",
                              isActive ? "text-primary-foreground" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm block truncate">
                                {item.label}
                              </span>
                              <span className={cn(
                                "text-xs block truncate",
                                isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {item.description}
                              </span>
                            </div>
                            {isActive && (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="hidden lg:block">
                          {item.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </nav>
        </TooltipProvider>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* Section Header */}
          {currentNav && (
            <div className="sticky top-0 z-10 bg-background border-b pb-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <currentNav.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {currentNav.label}
                      <InlineHelpDrawer 
                        module="settings" 
                        context={currentNav.id}
                        size="sm"
                      />
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {currentNav.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Content */}
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export { navigationItems };
