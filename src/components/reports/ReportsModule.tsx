import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, AlertTriangle, CheckSquare, Users, MessageSquare, Settings, Save, HelpCircle } from 'lucide-react';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';
import { usePermission } from '@/hooks/useRBAC';

// Import individual report tab components
import { CaseReportsTab } from './tabs/CaseReportsTab';
import { HearingsTab } from './tabs/HearingsTab';
import { SLATab } from './tabs/SLATab';
import { TasksTab } from './tabs/TasksTab';
import { ClientSummaryTab } from './tabs/ClientSummaryTab';
import { CommunicationsTab } from './tabs/CommunicationsTab';
import { ReportsFilterRail } from './ReportsFilterRail';
import { SavedViewsManager } from './SavedViewsManager';

import { ReportType, ReportFilter } from '@/types/reports';

interface ReportsModuleProps {
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
}

const reportTabs = [
  {
    id: 'case-reports' as ReportType,
    label: 'Case Reports',
    icon: FileText,
    description: 'Case register, aging analysis, and outcomes',
    roles: ['Admin', 'Partner/CA', 'Staff']
  },
  {
    id: 'hearings' as ReportType,
    label: 'Hearings & Cause List',
    icon: Calendar,
    description: 'Upcoming hearings and cause lists',
    roles: ['Admin', 'Partner/CA', 'Staff']
  },
  {
    id: 'sla-compliance' as ReportType,
    label: 'SLA / Compliance',
    icon: AlertTriangle,
    description: 'SLA breaches and compliance tracking',
    roles: ['Admin', 'Partner/CA', 'Staff']
  },
  {
    id: 'tasks' as ReportType,
    label: 'Task & Escalation',
    icon: CheckSquare,
    description: 'Task management and escalation reports',
    roles: ['Admin', 'Partner/CA', 'Staff']
  },
  {
    id: 'client-summary' as ReportType,
    label: 'Client Summary',
    icon: Users,
    description: 'Client portfolio and performance metrics',
    roles: ['Admin', 'Partner/CA', 'Staff', 'Client']
  },
  {
    id: 'communications' as ReportType,
    label: 'Communications',
    icon: MessageSquare,
    description: 'Communication delivery and analytics',
    roles: ['Admin', 'Partner/CA', 'Staff']
  }
];

export const ReportsModule: React.FC<ReportsModuleProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<ReportType>('case-reports');
  const [globalFilters, setGlobalFilters] = useState<ReportFilter>({});
  const [showSavedViews, setShowSavedViews] = useState(false);
  
  // Check if user has reports access
  const hasReportsAccess = usePermission('reports', 'read');
  
  if (!hasReportsAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">You don't have permission to access reports.</p>
        </div>
      </div>
    );
  }

  // Filter tabs based on user role
  const availableTabs = reportTabs.filter(tab => tab.roles.includes(userRole));

  const handleFilterChange = (filters: ReportFilter) => {
    setGlobalFilters(filters);
  };

  const renderTabContent = (tabId: ReportType) => {
    const commonProps = {
      filters: globalFilters,
      userRole,
      onFiltersChange: handleFilterChange
    };

    switch (tabId) {
      case 'case-reports':
        return <CaseReportsTab {...commonProps} />;
      case 'hearings':
        return <HearingsTab {...commonProps} />;
      case 'sla-compliance':
        return <SLATab {...commonProps} />;
      case 'tasks':
        return <TasksTab {...commonProps} />;
      case 'client-summary':
        return <ClientSummaryTab {...commonProps} />;
      case 'communications':
        return <CommunicationsTab {...commonProps} />;
      default:
        return <div>Report not found</div>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate, filter, and export operational reports across all modules
            </p>
          </div>
          <ContextualPageHelp 
            pageId="reports" 
            activeTab={activeTab}
            variant="floating" 
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedViews(!showSavedViews)}
          >
            <Save className="h-4 w-4 mr-2" />
            Saved Views
          </Button>
          <Badge variant="secondary" className="text-xs">
            {userRole} Access
          </Badge>
        </div>
      </div>

      {/* Saved Views Manager */}
      {showSavedViews && (
        <SavedViewsManager
          activeReportType={activeTab}
          currentFilters={globalFilters}
          onViewLoad={(filters) => {
            setGlobalFilters(filters);
            setShowSavedViews(false);
          }}
          onClose={() => setShowSavedViews(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Rail */}
        <div className="w-80 border-r border-border bg-muted/30">
          <ReportsFilterRail
            reportType={activeTab}
            filters={globalFilters}
            onFiltersChange={handleFilterChange}
            userRole={userRole}
          />
        </div>

        {/* Reports Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as ReportType)}
            className="flex-1 flex flex-col"
          >
            {/* Tab List */}
            <div className="border-b border-border bg-background">
              <TabsList className="grid w-full grid-cols-6 h-auto p-1">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden">
              {availableTabs.map((tab) => (
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  {/* Tab Description */}
                  <div className="p-4 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <tab.icon className="h-5 w-5 text-primary" />
                      <div>
                        <h2 className="font-medium text-foreground">{tab.label}</h2>
                        <p className="text-sm text-muted-foreground">{tab.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden">
                    {renderTabContent(tab.id)}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};