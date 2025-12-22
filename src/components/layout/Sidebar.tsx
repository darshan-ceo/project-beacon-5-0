import React, { useState, useMemo, useEffect } from 'react';
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
  HelpCircle,
  Sun,
  Moon,
  ShieldCheck
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIState } from '@/hooks/useUIState';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { envConfig } from '@/utils/envConfig';

interface AppSidebarProps {
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client' | 'Advocate' | 'Manager' | 'Ca' | 'Clerk' | 'User';
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
  { icon: BarChart3, label: 'Dashboard', href: '/', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'dashboard-nav' },
  { icon: ShieldCheck, label: 'Compliance Dashboard', href: '/compliance', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'compliance-nav' },
  { icon: FileText, label: 'Case Management', href: '/cases', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'cases-nav' },
  { icon: CalendarDays, label: 'Hearings', href: '/hearings/calendar', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'hearings-nav' },
  { icon: CheckSquare, label: 'Task Management', href: '/tasks', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'tasks-nav' },
  { icon: FolderOpen, label: 'Document Management', href: '/documents', roles: ['Admin', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca'], tourId: 'documents-nav' },
  { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'reports-nav' },
  { icon: HelpCircle, label: 'Help & Knowledge Base', href: '/help', roles: ['Admin', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca', 'Clerk', 'User'], tourId: 'help-nav' },
  { icon: UserCircle, label: 'User Profile', href: '/profile', roles: ['Admin', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca', 'Clerk', 'User'], tourId: 'profile-nav' },
];

// Grouped menu sections
const menuGroups: MenuGroup[] = [
  {
    label: 'Masters',
    defaultOpen: false,
    roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'],
    items: [
      { icon: Users, label: 'Client Masters', href: '/clients', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'] },
      { icon: UserCircle, label: 'Contacts', href: '/contacts', roles: ['Admin', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'] },
      { icon: Building2, label: 'Client Groups', href: '/client-groups', roles: ['Admin', 'Partner/CA', 'Ca'] },
      { icon: Building2, label: 'Legal Authorities', href: '/courts', roles: ['Admin', 'Partner/CA', 'Ca'] },
      { icon: Gavel, label: 'Judge Masters', href: '/judges', roles: ['Admin', 'Partner/CA', 'Ca'] },
      { icon: UserCheck, label: 'Employee Masters', href: '/employees', roles: ['Admin'] },
      { icon: Scale, label: 'Statutory Deadlines', href: '/statutory-acts', roles: ['Admin', 'Partner/CA', 'Ca'] },
    ]
  },
  {
    label: 'Administration',
    defaultOpen: false,
    roles: ['Admin'],
    items: [
      { icon: Settings, label: 'System Settings', href: '/settings', roles: ['Admin', 'Partner/CA'] },
      { icon: Shield, label: 'Access & Roles', href: '/access-roles', roles: ['Admin'] },
    ]
  }
];

// Icons for group headers in collapsed mode
const groupIcons: Record<string, React.ElementType> = {
  Masters: Building2,
  Administration: Settings,
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ userRole }) => {
  // Sidebar theme state with persistence
  const [sidebarTheme, setSidebarTheme] = useUIState<'dark' | 'light'>(
    'ui.layout.sidebar_theme',
    'dark',
    { category: 'preferences', description: 'Sidebar theme preference' }
  );

  // Module access enforcement
  const { hasModuleAccess, filterMenuItems } = useModuleAccess();

  // State for tracking group expansion
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      initialState[group.label] = group.defaultOpen || false;
    });
    return initialState;
  });

  // Toggle sidebar theme
  const toggleSidebarTheme = () => {
    setSidebarTheme(sidebarTheme === 'dark' ? 'light' : 'dark');
  };

  // Add QA and Debug items to main menu based on environment - memoized for stability
  const dynamicMainItems = useMemo(() => {
    const items = [...mainMenuItems];
    
    // Add Dev Mode Dashboard when any dev features are enabled
    if (envConfig.QA_ON || envConfig.GST_ENABLED || envConfig.MOCK_ON) {
      items.push({ 
        icon: TestTube, 
        label: 'Dev Mode Dashboard', 
        href: '/dev-dashboard', 
        roles: ['Admin'],
        badge: 'DEV'
      });
    }
    
    if (envConfig.QA_ON) {
      items.push({ 
        icon: Bug, 
        label: 'QA Dashboard', 
        href: '/qa', 
        roles: ['Admin'] 
      });
    }
    
    if (envConfig.GST_ENABLED) {
      items.push({ 
        icon: TestTube, 
        label: 'GST Debug', 
        href: '/debug/gst', 
        roles: ['Admin'] 
      });
    }
    
    return items;
  }, []); // Static since envConfig doesn't change at runtime

  // Filter menu items by role AND module access - memoized
  const filteredMainItems = useMemo(() => 
    filterMenuItems(dynamicMainItems.filter(item => item.roles.includes(userRole))),
    [dynamicMainItems, userRole, filterMenuItems]
  );
  
  // Memoize filtered groups to prevent useEffect re-triggers
  const filteredGroups = useMemo(() => 
    menuGroups.filter(group => 
      group.roles.includes(userRole) && 
      group.items.some(item => item.roles.includes(userRole) && hasModuleAccess(item.href))
    ),
    [userRole, hasModuleAccess]
  );

  const location = useLocation();
  const { open } = useSidebar();

  const isPathActive = (href: string, pathname: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const getNavClasses = (active: boolean) =>
    active ? "brand-active-sidebar" : "nav-hover";

  // Auto-open any group that contains the active route - stable dependencies
  useEffect(() => {
    const groupLabels = filteredGroups.map(g => g.label);
    const activeGroupLabels = filteredGroups
      .filter(group => group.items.some(item => isPathActive(item.href, location.pathname)))
      .map(g => g.label);
    
    setOpenGroups(prev => {
      // Only update if there's actually a change needed
      let hasChange = false;
      const next = { ...prev };
      
      activeGroupLabels.forEach(label => {
        if (!prev[label]) {
          next[label] = true;
          hasChange = true;
        }
      });
      
      return hasChange ? next : prev;
    });
  }, [location.pathname, filteredGroups]);

  const renderMenuItem = (item: MenuItem) => {
    const active = isPathActive(item.href, location.pathname);
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={active} className={getNavClasses(active)} tooltip={item.label}>
          <NavLink 
            to={item.href}
            data-tour={item.tourId}
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
    <TooltipProvider>
      <Sidebar 
        className={cn(
          "border-r border-sidebar-border",
          sidebarTheme === 'light' && 'sidebar-light'
        )} 
        collapsible="icon"
      >
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
              const groupItems = filterMenuItems(group.items.filter(item => item.roles.includes(userRole)));
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
                      <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors group-data-[collapsible=icon]:justify-center">
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const GroupIcon = (groupIcons as Record<string, React.ElementType>)[group.label] || Settings;
                            return <GroupIcon className={cn("h-4 w-4 text-sidebar-foreground", open ? "" : "mx-auto")} />;
                          })()}
                          {open && <span className="truncate">{group.label}</span>}
                        </div>
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

      {/* Footer with Theme Toggle and Environment Status */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-2">
          {/* Sidebar Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebarTheme}
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                {sidebarTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {open && <span>{sidebarTheme === 'dark' ? 'Light Sidebar' : 'Dark Sidebar'}</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Switch to {sidebarTheme === 'dark' ? 'light' : 'dark'} sidebar
            </TooltipContent>
          </Tooltip>

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
    </TooltipProvider>
  );
};