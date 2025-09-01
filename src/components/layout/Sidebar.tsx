import React from 'react';
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
  UserCheck
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppSidebarProps {
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: string[];
  badge?: string;
}

const menuItems: MenuItem[] = [
  { icon: BarChart3, label: 'Dashboard', href: '/', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: Users, label: 'Client Masters', href: '/clients', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: Building2, label: 'Court Masters', href: '/courts', roles: ['Admin', 'Partner/CA'] },
  { icon: Gavel, label: 'Judge Masters', href: '/judges', roles: ['Admin', 'Partner/CA'] },
  { icon: UserCheck, label: 'Employee Masters', href: '/employees', roles: ['Admin'] },
  { icon: FileText, label: 'Case Management', href: '/cases', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: CheckSquare, label: 'Task Management', href: '/tasks', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: FolderOpen, label: 'Document Management', href: '/documents', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'] },
  { icon: Shield, label: 'RBAC Management', href: '/rbac', roles: ['Admin'] },
  { icon: Settings, label: 'Global Parameters', href: '/settings', roles: ['Admin', 'Partner/CA'] },
  { icon: UserCircle, label: 'User Profile', href: '/profile', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'] },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ userRole }) => {
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const location = useLocation();
  const { open } = useSidebar();

  const getNavClasses = (isActive: boolean) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

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
          <div className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMenuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.href}
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
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      {/* Footer with Role Badge */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          <div className="bg-sidebar-accent rounded-lg p-3">
            {open ? (
              <div className="text-center">
                <Shield className="h-5 w-5 text-sidebar-primary mx-auto mb-1" />
                <p className="text-xs font-medium text-sidebar-foreground">{userRole}</p>
                <p className="text-xs text-sidebar-foreground/70">Access Level</p>
              </div>
            ) : (
              <Shield className="h-5 w-5 text-sidebar-primary mx-auto" />
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};