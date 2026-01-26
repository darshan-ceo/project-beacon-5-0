/**
 * Module Registry - Central registration for all application modules
 * Enforces help documentation requirements for each module
 */

export interface HelpRequirements {
  tooltips: boolean;
  operationsHelp: boolean;
  tour: boolean;
  faq: boolean;
  pagesHelp: boolean;
}

export interface ModuleRegistration {
  id: string;
  name: string;
  routes: string[];
  description: string;
  helpRequired: HelpRequirements;
  helpValidated?: boolean;
  lastHelpAudit?: string;
  featureFlag?: string;
  roles?: string[];
}

class ModuleRegistry {
  private modules: Map<string, ModuleRegistration> = new Map();
  private initialized = false;

  constructor() {
    this.initializeModules();
  }

  private initializeModules() {
    // Core Modules
    this.register({
      id: 'dashboard',
      name: 'Dashboard',
      routes: ['/', '/dashboard'],
      description: 'Main dashboard with KPIs and quick actions',
      helpRequired: {
        tooltips: true,
        operationsHelp: false,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'case-management',
      name: 'Case Management',
      routes: ['/cases', '/cases/:id'],
      description: 'Core case lifecycle management',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'hearings',
      name: 'Hearings',
      routes: ['/hearings'],
      description: 'Hearing scheduling and outcomes',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      featureFlag: 'hearings_module_v1',
      roles: ['all']
    });

    this.register({
      id: 'tasks',
      name: 'Tasks',
      routes: ['/tasks'],
      description: 'Task board and automation',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'documents',
      name: 'Documents',
      routes: ['/documents'],
      description: 'Document management and templates',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'clients',
      name: 'Clients',
      routes: ['/clients'],
      description: 'Client master data management',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'communications',
      name: 'Communications',
      routes: ['/communications'],
      description: 'Client communication logs',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: false,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'reports',
      name: 'Reports',
      routes: ['/reports'],
      description: 'Analytics and reporting',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['manager', 'partner', 'admin']
    });

    // Configuration Modules
    this.register({
      id: 'masters',
      name: 'Master Data',
      routes: ['/masters', '/masters/:section'],
      description: 'Master data configuration',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['admin', 'implementor']
    });

    this.register({
      id: 'settings',
      name: 'System Settings',
      routes: ['/settings', '/settings/:section'],
      description: 'System configuration and preferences',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['admin']
    });

    this.register({
      id: 'access-roles',
      name: 'Access & Roles',
      routes: ['/access-roles'],
      description: 'RBAC configuration',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      roles: ['admin']
    });

    this.register({
      id: 'help',
      name: 'Help & Knowledge',
      routes: ['/help', '/help/:section'],
      description: 'Help center and documentation',
      helpRequired: {
        tooltips: false,
        operationsHelp: false,
        tour: false,
        faq: false,
        pagesHelp: false
      },
      roles: ['all']
    });

    this.register({
      id: 'data-io',
      name: 'Data Import/Export',
      routes: ['/data-io'],
      description: 'Bulk data operations',
      helpRequired: {
        tooltips: true,
        operationsHelp: true,
        tour: true,
        faq: true,
        pagesHelp: true
      },
      featureFlag: 'data_io_v1',
      roles: ['admin', 'implementor']
    });

    this.register({
      id: 'profile',
      name: 'User Profile',
      routes: ['/profile'],
      description: 'User settings and preferences',
      helpRequired: {
        tooltips: true,
        operationsHelp: false,
        tour: false,
        faq: true,
        pagesHelp: true
      },
      roles: ['all']
    });

    this.register({
      id: 'qa',
      name: 'QA Dashboard',
      routes: ['/qa'],
      description: 'Quality assurance tools',
      helpRequired: {
        tooltips: false,
        operationsHelp: false,
        tour: false,
        faq: false,
        pagesHelp: false
      },
      roles: ['admin', 'implementor']
    });

    this.initialized = true;
    console.log(`✅ Module Registry: Registered ${this.modules.size} modules`);
  }

  /**
   * Register a new module
   */
  register(module: ModuleRegistration): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module "${module.id}" already registered, overwriting`);
    }
    this.modules.set(module.id, {
      ...module,
      helpValidated: false,
      lastHelpAudit: undefined
    });
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): ModuleRegistration | null {
    return this.modules.get(moduleId) || null;
  }

  /**
   * Get module by route path
   */
  getModuleByRoute(path: string): ModuleRegistration | null {
    for (const module of this.modules.values()) {
      for (const route of module.routes) {
        // Handle dynamic segments
        const pattern = route.replace(/:\w+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(path)) {
          return module;
        }
      }
    }
    return null;
  }

  /**
   * Get all registered modules
   */
  getAllModules(): ModuleRegistration[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules requiring help documentation
   */
  getModulesRequiringHelp(): ModuleRegistration[] {
    return this.getAllModules().filter(m => 
      m.helpRequired.tooltips || 
      m.helpRequired.operationsHelp || 
      m.helpRequired.tour || 
      m.helpRequired.faq ||
      m.helpRequired.pagesHelp
    );
  }

  /**
   * Update module validation status
   */
  setHelpValidated(moduleId: string, isValidated: boolean): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.helpValidated = isValidated;
      module.lastHelpAudit = new Date().toISOString();
    }
  }

  /**
   * Get modules by role
   */
  getModulesForRole(role: string): ModuleRegistration[] {
    return this.getAllModules().filter(m => 
      m.roles?.includes('all') || m.roles?.includes(role)
    );
  }

  /**
   * Check if registry is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get module count
   */
  getCount(): number {
    return this.modules.size;
  }
}

export const moduleRegistry = new ModuleRegistry();
