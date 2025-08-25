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
  ChevronLeft,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
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
  { icon: FileText, label: 'Case Management', href: '/cases', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: CheckSquare, label: 'Task Management', href: '/tasks', roles: ['Admin', 'Partner/CA', 'Staff'] },
  { icon: FolderOpen, label: 'Document Management', href: '/documents', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'] },
  { icon: Shield, label: 'RBAC Management', href: '/rbac', roles: ['Admin'] },
  { icon: Settings, label: 'Global Parameters', href: '/settings', roles: ['Admin', 'Partner/CA'] },
  { icon: UserCircle, label: 'User Profile', href: '/profile', roles: ['Admin', 'Partner/CA', 'Staff', 'Client'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, userRole }) => {
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50"
    >
      <div className="flex flex-col h-full">
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <motion.div
            initial={false}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-2"
          >
            {!collapsed && (
              <>
                <Scale className="h-8 w-8 text-sidebar-primary" />
                <div>
                  <h1 className="text-lg font-semibold text-sidebar-foreground">Project Beacon</h1>
                  <p className="text-xs text-sidebar-foreground/70">Legal Practice Management</p>
                </div>
              </>
            )}
          </motion.div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.href}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <NavLink
                  to={item.href}
                  className={({ isActive: navIsActive }) => cn(
                    "flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    (navIsActive || isActive) && "bg-sidebar-accent text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* Role Badge */}
        <div className="p-4 border-t border-sidebar-border">
          <div className={cn(
            "bg-sidebar-accent rounded-lg p-3",
            collapsed && "px-2"
          )}>
            {!collapsed ? (
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
      </div>
    </motion.aside>
  );
};