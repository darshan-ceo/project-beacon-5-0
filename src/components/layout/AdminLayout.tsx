import React from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { userProfile, user } = useAuth();
  
  // Derive user role for sidebar - map 'Partner' to 'Partner/CA' for sidebar compatibility
  const userRole = (() => {
    const role = userProfile?.role;
    if (role === 'Partner') return 'Partner/CA';
    return role || 'Staff';
  })() as 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
  const userId = user?.id || userProfile?.full_name || 'user';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background font-inter">
        {/* Sidebar */}
        <AppSidebar userRole={userRole} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sticky Header with Sidebar Trigger */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <SidebarTrigger className="mr-4 text-foreground bg-background hover:bg-muted border border-border shadow-beacon-sm" />
                <Header />
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell userId={userId} />
              </div>
            </div>
          </header>
          
          {/* Portal slot for StickyCaseActionBar - rendered outside scrollable area */}
          <div id="case-action-header-slot" className="sticky top-[65px] z-[35]" />
          
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
