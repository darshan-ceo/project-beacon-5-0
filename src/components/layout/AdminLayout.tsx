import React from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name: string;
    role: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
    avatar?: string;
  };
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  currentUser = { name: 'John Doe', role: 'Admin' } 
}) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background font-inter">
        {/* Sidebar */}
        <AppSidebar userRole={currentUser.role} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sticky Header with Sidebar Trigger */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center p-4">
              <SidebarTrigger className="mr-4 text-sidebar-foreground hover:bg-sidebar-accent" />
              <Header 
                user={currentUser}
                onMenuToggle={() => {}} // No longer needed, controlled by SidebarProvider
              />
            </div>
          </header>
          
          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};