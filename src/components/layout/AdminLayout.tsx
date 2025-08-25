import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={setSidebarCollapsed}
        userRole={currentUser.role}
      />
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* Sticky Header */}
        <Header 
          user={currentUser}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Content Area */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};