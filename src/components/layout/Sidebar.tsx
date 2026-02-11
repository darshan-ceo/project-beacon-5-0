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
  ShieldCheck,
  Briefcase,
  Activity,
  Folder,
  LineChart,
  LifeBuoy,
  Wrench,
  Lock,
  Target
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
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { getRbacModuleForRoute } from '@/hooks/useModulePermissions';
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

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  defaultOpen: boolean;
  collapsible: boolean;
  roles: string[];
}

// =============================================================================
// SIDEBAR SECTIONS - Organized by lawyer's mental workflow:
// Monitor → Act → Execute → Reference → Control
// =============================================================================

const sidebarSections: SidebarSection[] = [
  // SECTION 1: MONITOR (Daily Awareness)
  {
    id: 'monitor',
    label: 'MONITOR',
    icon: Activity,
    defaultOpen: true,
    collapsible: false,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'],
    items: [
      { icon: BarChart3, label: 'Dashboard', href: '/', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'dashboard-nav' },
      { icon: ShieldCheck, label: 'Compliance Dashboard', href: '/compliance', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'compliance-nav' },
    ]
  },
  
  // SECTION 2: LITIGATION (Core Workflow)
  {
    id: 'litigation',
    label: 'LITIGATION',
    icon: Briefcase,
    defaultOpen: true,
    collapsible: false,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'],
    items: [
      { icon: FileText, label: 'Case Management', href: '/cases', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'cases-nav' },
      { icon: CalendarDays, label: 'Hearings', href: '/hearings/calendar', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'hearings-nav' },
      { icon: CheckSquare, label: 'Task Management', href: '/tasks', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'tasks-nav' },
    ]
  },
  
  // SECTION 3: CLIENTS (Relationship Layer)
  {
    id: 'clients',
    label: 'CLIENTS',
    icon: Users,
    defaultOpen: true,
    collapsible: true,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'],
    items: [
      { icon: Users, label: 'Clients', href: '/clients', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'] },
      { icon: UserCircle, label: 'Contacts', href: '/contacts', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'] },
      { icon: Target, label: 'Inquiries', href: '/leads', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'] },
      
    ]
  },
  
  // SECTION 4: DOCUMENTS (Evidence & Records)
  {
    id: 'documents',
    label: 'DOCUMENTS',
    icon: Folder,
    defaultOpen: true,
    collapsible: false,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca', 'Client'],
    items: [
      { icon: FolderOpen, label: 'Document Management', href: '/documents', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca', 'Client'], tourId: 'documents-nav' },
    ]
  },
  
  // SECTION 5: ANALYTICS - All operational roles included; actual access controlled by RBAC + Module Access
  {
    id: 'analytics',
    label: 'ANALYTICS',
    icon: LineChart,
    defaultOpen: false,
    collapsible: true,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'],
    items: [
      { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca'], tourId: 'reports-nav' },
    ]
  },
  
  // SECTION 6: SUPPORT
  {
    id: 'support',
    label: 'SUPPORT',
    icon: LifeBuoy,
    defaultOpen: false,
    collapsible: true,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca', 'Clerk', 'User'],
    items: [
      { icon: HelpCircle, label: 'Help & Knowledge Base', href: '/help', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca', 'Clerk', 'User'], tourId: 'help-nav' },
      { icon: UserCircle, label: 'User Profile', href: '/profile', roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Client', 'Advocate', 'Manager', 'Ca', 'Clerk', 'User'], tourId: 'profile-nav' },
    ]
  },
  
  // SECTION 7: CONFIGURATION (Collapsed by Default) - Admin/Partner/Advocate per RBSA
  {
    id: 'configuration',
    label: 'CONFIGURATION',
    icon: Wrench,
    defaultOpen: false,
    collapsible: true,
    roles: ['Admin', 'Partner', 'Partner/CA', 'Ca', 'Advocate', 'Staff', 'Manager'],
    items: [
      { icon: Building2, label: 'Legal Authorities', href: '/courts', roles: ['Admin', 'Partner', 'Partner/CA', 'Ca', 'Advocate', 'Staff', 'Manager'] },
      { icon: Gavel, label: 'Judge Masters', href: '/judges', roles: ['Admin', 'Partner', 'Partner/CA', 'Ca', 'Advocate', 'Staff', 'Manager'] },
      { icon: UserCheck, label: 'Employee Masters', href: '/employees', roles: ['Admin'] },
      { icon: Scale, label: 'Statutory Deadlines', href: '/statutory-acts', roles: ['Admin', 'Partner', 'Partner/CA', 'Ca', 'Manager'] },
    ]
  },
  
  // SECTION 8: ADMINISTRATION
  {
    id: 'administration',
    label: 'ADMINISTRATION',
    icon: Lock,
    defaultOpen: false,
    collapsible: true,
    roles: ['Admin', 'Partner', 'Partner/CA'],
    items: [
      { icon: Settings, label: 'System Settings', href: '/settings', roles: ['Admin', 'Partner', 'Partner/CA'] },
      { icon: Shield, label: 'Access & Roles', href: '/access-roles', roles: ['Admin'] },
    ]
  },
];

// Developer section - added dynamically based on env config
const createDevSection = (): SidebarSection | null => {
  if (!envConfig.QA_ON && !envConfig.GST_ENABLED && !envConfig.MOCK_ON) {
    return null;
  }
  
  const devItems: MenuItem[] = [];
  
  if (envConfig.QA_ON || envConfig.GST_ENABLED || envConfig.MOCK_ON) {
    devItems.push({ 
      icon: TestTube, 
      label: 'Dev Mode Dashboard', 
      href: '/dev-dashboard', 
      roles: ['Admin'],
      badge: 'DEV'
    });
  }
  
  if (envConfig.QA_ON) {
    devItems.push({ 
      icon: Bug, 
      label: 'QA Dashboard', 
      href: '/qa', 
      roles: ['Admin'] 
    });
  }
  
  if (envConfig.GST_ENABLED) {
    devItems.push({ 
      icon: TestTube, 
      label: 'GST Debug', 
      href: '/debug/gst', 
      roles: ['Admin'] 
    });
  }
  
  return {
    id: 'developer',
    label: 'DEVELOPER',
    icon: Bug,
    defaultOpen: false,
    collapsible: true,
    roles: ['Admin'],
    items: devItems
  };
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ userRole }) => {
  // Normalize role: map various role variants to sidebar-compatible roles
  const normalizedRole = useMemo(() => {
    const role = userRole?.toString().trim();
    
    // Role normalization map for defensive compatibility
    const roleNormalizationMap: Record<string, string> = {
      'partner': 'Partner/CA',
      'Partner': 'Partner/CA',
      'rm': 'Manager',
      'Rm': 'Manager',
      'RM': 'Manager',
      'ca': 'Ca',
      'CA': 'Ca',
      'admin': 'Admin',
    };
    
    return roleNormalizationMap[role || ''] || userRole;
  }, [userRole]);

  // Sidebar theme state with persistence
  const [sidebarTheme, setSidebarTheme] = useUIState<'dark' | 'light'>(
    'ui.layout.sidebar_theme',
    'dark',
    { category: 'preferences', description: 'Sidebar theme preference' }
  );

  // Module access enforcement (legacy employee.moduleAccess)
  const { hasModuleAccess, filterMenuItems } = useModuleAccess();
  
  // RBAC permission checking (database-driven)
  const { hasPermission, enforcementEnabled, isRbacReady } = useRBAC();
  
  // Check RBAC permission for a menu item's route
  const hasRbacAccess = (href: string): boolean => {
    // If RBAC enforcement is disabled, allow all
    if (!enforcementEnabled) return true;
    
    // SECURITY: Be restrictive during loading (fail-closed)
    // This prevents menu items from appearing before permissions are verified
    if (!isRbacReady) return false;
    
    // Get the RBAC module for this route
    const rbacModule = getRbacModuleForRoute(href);
    
    // If no module mapping, allow (e.g., help, profile)
    if (!rbacModule) return true;
    
    // Check if user has read permission for this module
    return hasPermission(rbacModule, 'read');
  };

  // Build complete sections list including dev section if applicable
  const allSections = useMemo(() => {
    const sections = [...sidebarSections];
    const devSection = createDevSection();
    if (devSection) {
      sections.push(devSection);
    }
    return sections;
  }, []);

  // State for tracking section expansion
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    allSections.forEach(section => {
      initialState[section.id] = section.defaultOpen;
    });
    return initialState;
  });

  // Toggle sidebar theme
  const toggleSidebarTheme = () => {
    setSidebarTheme(sidebarTheme === 'dark' ? 'light' : 'dark');
  };

  // Filter sections by RBAC-first approach:
  // 1. RBAC permissions (database-driven, primary authority)
  // 2. Module access (employee.moduleAccess field)
  // 3. Legacy role array (only for admin-only sections: ADMINISTRATION, DEVELOPER)
  const filteredSections = useMemo(() => {
    // Admin-only sections where legacy role check is strictly enforced
    const adminOnlySections = ['administration', 'developer'];
    
    return allSections
      .filter(section => {
        // For admin-only sections, enforce legacy role check
        if (adminOnlySections.includes(section.id)) {
          return section.roles.includes(normalizedRole);
        }
        // For all other sections, allow through to item-level filtering
        return true;
      })
      .map(section => ({
        ...section,
        items: filterMenuItems(
          section.items.filter(item => {
            // 1. RBAC permission check (primary authority)
            const rbacAllowed = hasRbacAccess(item.href);
            
            // 2. Module access check (employee.moduleAccess)
            const moduleAllowed = hasModuleAccess(item.href);
            
            // 3. Legacy role check (only for admin-only sections)
            const isAdminSection = adminOnlySections.includes(section.id);
            const legacyAllowed = isAdminSection ? item.roles.includes(normalizedRole) : true;
            
            return rbacAllowed && moduleAllowed && legacyAllowed;
          })
        )
      }))
      .filter(section => section.items.length > 0);
  }, [allSections, normalizedRole, filterMenuItems, hasModuleAccess, enforcementEnabled, isRbacReady, hasPermission]);

  const location = useLocation();
  const { open } = useSidebar();

  const isPathActive = (href: string, pathname: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const getNavClasses = (active: boolean) =>
    active ? "brand-active-sidebar" : "nav-hover";

  // Auto-open any section that contains the active route
  useEffect(() => {
    const activeSectionIds = filteredSections
      .filter(section => section.items.some(item => isPathActive(item.href, location.pathname)))
      .map(s => s.id);
    
    setOpenSections(prev => {
      let hasChange = false;
      const next = { ...prev };
      
      activeSectionIds.forEach(id => {
        if (!prev[id]) {
          next[id] = true;
          hasChange = true;
        }
      });
      
      return hasChange ? next : prev;
    });
  }, [location.pathname, filteredSections]);

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

  const renderSection = (section: SidebarSection) => {
    const isSectionOpen = openSections[section.id];
    const SectionIcon = section.icon;

    // Non-collapsible sections render directly
    if (!section.collapsible) {
      return (
        <SidebarGroup key={section.id}>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2">
            {open ? section.label : <SectionIcon className="h-4 w-4 mx-auto" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    // Collapsible sections
    return (
      <SidebarGroup key={section.id}>
        <Collapsible 
          open={isSectionOpen}
          onOpenChange={(isOpen) => 
            setOpenSections(prev => ({ ...prev, [section.id]: isOpen }))
          }
        >
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <SectionIcon className={cn("h-4 w-4", open ? "" : "mx-auto")} />
                {open && <span className="truncate">{section.label}</span>}
              </div>
              {open && (
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 flex-shrink-0",
                    isSectionOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
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
            <div className="p-2 space-y-2">
              {filteredSections.length > 0 ? (
                filteredSections.map(renderSection)
              ) : (
                /* Fallback: If no sections visible, show at least Support section */
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2">
                    {open ? 'SUPPORT' : <LifeBuoy className="h-4 w-4 mx-auto" />}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className="nav-hover" tooltip="Help & Knowledge Base">
                          <NavLink to="/help">
                            <HelpCircle className="h-5 w-5" />
                            {open && <span className="truncate">Help & Knowledge Base</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className="nav-hover" tooltip="User Profile">
                          <NavLink to="/profile">
                            <UserCircle className="h-5 w-5" />
                            {open && <span className="truncate">User Profile</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                  <div className="px-3 py-2 text-xs text-sidebar-foreground/40">
                    {open && "No modules assigned. Contact administrator."}
                  </div>
                </SidebarGroup>
              )}
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
