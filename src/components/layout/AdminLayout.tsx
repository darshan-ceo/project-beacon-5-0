import React from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Role mapping for sidebar compatibility - maps employee operational roles and RBAC roles to sidebar roles
const ROLE_MAP: Record<string, 'Admin' | 'Partner/CA' | 'Staff' | 'Client' | 'Manager' | 'Advocate' | 'Ca' | 'Clerk' | 'User'> = {
  // RBAC roles (from supabasePermissionsResolver)
  'admin': 'Admin',
  'partner': 'Partner/CA',
  'manager': 'Manager',
  'advocate': 'Advocate',
  'ca': 'Ca',
  'staff': 'Staff',
  'clerk': 'Clerk',
  'client': 'Client',
  'user': 'User',
  // Employee operational roles (capitalized)
  'Admin': 'Admin',
  'Partner': 'Partner/CA',
  'Manager': 'Manager',
  'RM': 'Manager',
  'Rm': 'Manager',
  'rm': 'Manager',
  'Advocate': 'Advocate',
  'CA': 'Ca',
  'Ca': 'Ca',
  'Staff': 'Staff',
  'Clerk': 'Clerk',
  'Client': 'Client',
  'User': 'User',
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { userProfile, user } = useAuth();
  const { enforcementEnabled, isRbacReady } = useRBAC();
  
  // Get the effective role for sidebar - prioritize RBAC-derived role when enforcement is enabled
  const userRole = React.useMemo(() => {
    const employeeRole = userProfile?.role || '';
    
    // Map the role to a sidebar-compatible role
    const mappedRole = ROLE_MAP[employeeRole];
    if (mappedRole) {
      return mappedRole;
    }
    
    // Default fallback
    return 'Staff' as const;
  }, [userProfile?.role]);
  
  // Ensure we always pass a valid UUID to NotificationBell - never fallback to strings
  const userId = user?.id || '';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex w-full bg-background font-inter overflow-hidden">
        {/* Sidebar */}
        <AppSidebar userRole={userRole} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Sticky Header with Sidebar Trigger + Portal Slot */}
          <header className="sticky top-0 z-40 bg-background border-b border-border flex-shrink-0">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger className="text-foreground bg-background hover:bg-muted border border-border shadow-beacon-sm flex-shrink-0" />
              <Header userId={userId} />
            </div>
            {/* Portal slot for StickyCaseActionBar - inside sticky header so it never scrolls */}
            <div id="case-action-header-slot" className="relative z-[45] bg-background" />
          </header>
          
          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-auto min-h-0">
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
