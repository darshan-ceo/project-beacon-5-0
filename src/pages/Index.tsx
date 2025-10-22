import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { ClientMasters } from '@/components/masters/ClientMasters';
import { CourtMasters } from '@/components/masters/ForumsMaster';
import JudgeMasters from '@/components/masters/JudgeMasters';
import { CaseManagement } from '@/components/cases/CaseManagement';
import { DocumentManagement } from '@/components/documents/DocumentManagement';
import { TaskManagement } from '@/components/tasks/TaskManagement';
import { QADashboard } from './QADashboard';
import { AddressSettings } from '@/components/admin/AddressSettings';
import { motion } from 'framer-motion';
import { Scale, Shield } from 'lucide-react';
import { envConfig } from '@/utils/envConfig';

// Mock current page state - in real app this would come from router
const mockCurrentPage = 'tasks'; // Can be: 'dashboard', 'clients', 'documents', 'cases', 'tasks', 'qa', etc.

const Index = () => {
  const [currentPage, setCurrentPage] = useState(mockCurrentPage);
  
  // Mock user - in real app this would come from auth context
  const currentUser = {
    name: 'John Doe',
    role: 'Admin' as const,
    avatar: undefined
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'clients':
        return <ClientMasters />;
      case 'courts':
        return <CourtMasters />;
      case 'judges':
        return <JudgeMasters />;
      case 'documents':
        return <DocumentManagement />;
      case 'cases':
        return <CaseManagement />;
      case 'tasks':
        return <TaskManagement />;
      case 'qa':
        return <QADashboard />;
      case 'address-settings':
        return <AddressSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  // Demo navigation (replace with real router)
  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <AdminLayout currentUser={currentUser}>
      {/* Demo Navigation Pills - Remove when implementing real routing */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-primary-light rounded-lg border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Demo Navigation</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'dashboard' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNavigation('clients')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'clients' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Client Masters
            </button>
            <button
              onClick={() => handleNavigation('courts')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'courts' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Court Masters
            </button>
            <button
              onClick={() => handleNavigation('judges')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'judges' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Judge Masters
            </button>
            <button
              onClick={() => handleNavigation('cases')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'cases' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Case Management
            </button>
            <button
              onClick={() => handleNavigation('tasks')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'tasks' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Task Management
            </button>
            <button
              onClick={() => handleNavigation('qa')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'qa' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              QA Dashboard
            </button>
            <button
              onClick={() => handleNavigation('address-settings')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'address-settings' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Address Settings
            </button>
          </div>
        </div>
      </motion.div>

      {/* Current Page Content */}
      {renderCurrentPage()}
    </AdminLayout>
  );
};

export default Index;