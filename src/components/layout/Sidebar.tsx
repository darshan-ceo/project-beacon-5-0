import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  Scale, 
  FolderOpen, 
  Settings, 
  Shield, 
  Building2,
  Gavel,
  UserCircle,
  FileText,
  BarChart3,
  CheckSquare,
  UserCheck,
  Bug,
  TestTube,
  CalendarDays,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { envConfig } from '@/utils/envConfig';

interface AppSidebarProps {
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: string[];
  badge?: string;
  tourId?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
  roles: string[];
}

// Main navigation items (always visible, in requested order)
const mainMenuItems: MenuItem[] = [
  { icon: BarChart3, label: 'Dashboard', href: '/', roles: ['Admin', 'Partner/CA', 'Staff'], tourId: 'dashboard-nav' },
  { icon: FileText, label: 'Case Management', href: '/cases', roles: ['Admin', 'Partner/CA', 'Staff'], tourId: 'cases-nav' },
  { icon: CalendarDays, label: 'Hearings', href: '/hearings/calendar', roles: ['Admin', 'Partner/CA', 'Staff'], tourId: 'hearings-nav' },
  { icon: CheckSquare, label: 'Task Management', href: '/tasks', roles: ['Admin', 'Partner/CA', 'Staff'], tourId: 'tasks-nav' },
  { icon: FolderOpen, label: 'Document Management', href: '/documents', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'], tourId: 'documents-nav' },
  { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['Admin', 'Partner/CA', 'Staff'], tourId: 'reports-nav' },
  { icon: HelpCircle, label: 'Help & Knowledge Base', href: '/help', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'], tourId: 'help-nav' },
  { icon: UserCircle, label: 'User Profile', href: '/profile', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'], tourId: 'profile-nav' },
];

// Grouped menu sections
const menuGroups: MenuGroup[] = [
  {
    label: 'Masters',
    defaultOpen: false,
    roles: ['Admin', 'Partner/CA', 'Staff'],
    items: [
      { icon: Users, label: 'Client Masters', href: '/clients', roles: ['Admin', 'Partner/CA', 'Staff'] },
      { icon: Building2, label: 'Court Masters', href: '/courts', roles: ['Admin', 'Partner/CA'] },
      { icon: Gavel, label: 'Judge Masters', href: '/judges', roles: ['Admin', 'Partner/CA'] },
      { icon: UserCheck, label: 'Employee Masters', href: '/employees', roles: ['Admin'] },
    ]
  },
  {
    label: 'Administration',
    defaultOpen: false,
    roles: ['Admin'],
    items: [
      { icon: Settings, label: 'Global Parameters', href: '/settings', roles: ['Admin', 'Partner/CA'] },
      { icon: Shield, label: 'RBAC Management', href: '/rbac', roles: ['Admin'] },
    ]
  }
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ userRole }) => {
  // State for tracking group expansion
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      initialState[group.label] = group.defaultOpen || false;
    });
    return initialState;
  });

  // Add QA and Debug items to main menu based on environment
  const dynamicMainItems = [...mainMenuItems];
  
  // Add Dev Mode Dashboard when any dev features are enabled
  if (envConfig.QA_ON || envConfig.GST_ENABLED || envConfig.MOCK_ON) {
    dynamicMainItems.push({ 
      icon: TestTube, 
      label: 'Dev Mode Dashboard', 
      href: '/dev-dashboard', 
      roles: ['Admin'],
      badge: 'DEV'
    });
  }
  
  if (envConfig.QA_ON) {
    dynamicMainItems.push({ 
      icon: Bug, 
      label: 'QA Dashboard', 
      href: '/qa', 
      roles: ['Admin'] 
    });
  }
  
  if (envConfig.GST_ENABLED) {
    dynamicMainItems.push({ 
      icon: TestTube, 
      label: 'GST Debug', 
      href: '/debug/gst', 
      roles: ['Admin'] 
    });
  }

  // Filter menu items and groups by user role
  const filteredMainItems = dynamicMainItems.filter(item => item.roles.includes(userRole));
  const filteredGroups = menuGroups.filter(group => 
    group.roles.includes(userRole) && 
    group.items.some(item => item.roles.includes(userRole))
  );

  const location = useLocation();
  const { open } = useSidebar();

  const getNavClasses = (isActive: boolean) =>
    isActive ? "brand-active-sidebar bg-red-50/50" : "hover:bg-sidebar-accent/50";

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.href;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild>
          <NavLink 
            to={item.href}
            data-tour={item.tourId}
            className={({ isActive: navIsActive }) => 
              getNavClasses(navIsActive || isActive)
            }
          >
            <item.icon className="h-5 w-5" />
            {open && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center space-x-2 p-2">
          <Scale className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
          {open && (
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-sidebar-foreground truncate">Project Beacon</h1>
              <p className="text-xs text-sidebar-foreground/70 truncate">Legal Practice Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Scrollable Content */}
      <SidebarContent>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMainItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Collapsible Groups */}
            {filteredGroups.map((group) => {
              const groupItems = group.items.filter(item => item.roles.includes(userRole));
              if (groupItems.length === 0) return null;
              
              const isGroupOpen = openGroups[group.label];

              return (
                <SidebarGroup key={group.label}>
                  <Collapsible 
                    open={isGroupOpen}
                    onOpenChange={(open) => 
                      setOpenGroups(prev => ({ ...prev, [group.label]: open }))
                    }
                  >
                    <CollapsibleTrigger className="w-full group">
                      <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors">
                        <span className="truncate">{group.label}</span>
                        {open && (
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform duration-200 flex-shrink-0",
                              isGroupOpen ? "rotate-180" : "rotate-0"
                            )}
                          />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1">
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {groupItems.map(renderMenuItem)}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              );
            })}
          </div>
        </ScrollArea>
      </SidebarContent>

      {/* Footer with Environment Status Only */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          {/* Environment Status */}
          {envConfig.QA_ON && open && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-green-700 dark:text-green-400">QA Mode</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};