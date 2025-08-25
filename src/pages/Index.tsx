import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { ClientMasters } from '@/components/masters/ClientMasters';
import { DocumentManagement } from '@/components/documents/DocumentManagement';
import { motion } from 'framer-motion';
import { Scale, Shield } from 'lucide-react';

// Mock current page state - in real app this would come from router
const mockCurrentPage = 'dashboard'; // Can be: 'dashboard', 'clients', 'documents', etc.

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
      case 'documents':
        return <DocumentManagement />;
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
              onClick={() => handleNavigation('documents')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentPage === 'documents' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-white text-primary hover:bg-primary/10'
              }`}
            >
              Documents
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