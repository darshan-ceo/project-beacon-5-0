import { createContext, useContext, ReactNode, useState } from 'react';

// Role-based access control hook
export type UserRole = 'Partner' | 'Admin' | 'Manager' | 'Associate' | 'Clerk' | 'Client';

export interface Permission {
  module: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

// Permission matrix based on roles
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Partner: [
    { module: '*', action: 'admin' }, // Full access to everything
  ],
  Admin: [
    { module: 'cases', action: 'admin' },
    { module: 'clients', action: 'admin' },
    { module: 'courts', action: 'admin' },
    { module: 'judges', action: 'admin' },
    { module: 'tasks', action: 'admin' },
    { module: 'documents', action: 'admin' },
    { module: 'reports', action: 'admin' },
    { module: 'rbac', action: 'read' },
    { module: 'settings', action: 'admin' },
    { module: 'ai', action: 'admin' },
    { module: 'admin', action: 'admin' },
  ],
  Manager: [
    { module: 'cases', action: 'write' },
    { module: 'clients', action: 'write' },
    { module: 'courts', action: 'read' },
    { module: 'judges', action: 'read' },
    { module: 'tasks', action: 'write' },
    { module: 'documents', action: 'write' },
    { module: 'reports', action: 'read' },
    { module: 'rbac', action: 'read' },
    { module: 'settings', action: 'read' },
    { module: 'ai', action: 'write' },
  ],
  Associate: [
    { module: 'cases', action: 'read' },
    { module: 'clients', action: 'read' },
    { module: 'courts', action: 'read' },
    { module: 'judges', action: 'read' },
    { module: 'tasks', action: 'write' },
    { module: 'documents', action: 'read' },
    { module: 'reports', action: 'read' },
    { module: 'ai', action: 'read' },
  ],
  Clerk: [
    { module: 'tasks', action: 'read' },
    { module: 'documents', action: 'read' },
  ],
  Client: [
    { module: 'cases', action: 'read' }, // Own cases only
    { module: 'documents', action: 'read' }, // Own documents only
    { module: 'hearings', action: 'read' }, // Own hearings only
    { module: 'notifications', action: 'read' },
  ],
};

interface RBACContextType {
  currentUser: User;
  hasPermission: (module: string, action: Permission['action']) => boolean;
  switchRole: (role: UserRole) => void;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

interface RBACProviderProps {
  children: ReactNode;
  initialUser?: User;
}

// Default user for demonstration
const defaultUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@lawfirm.com',
  role: 'Admin',
  permissions: ROLE_PERMISSIONS.Admin,
};

export const RBACProvider: React.FC<RBACProviderProps> = ({ 
  children, 
  initialUser = defaultUser 
}) => {
  const [currentUser, setCurrentUser] = useState<User>(initialUser);

  const hasPermission = (module: string, action: Permission['action']): boolean => {
    // Partner has access to everything
    if (currentUser.role === 'Partner') return true;
    
    const userPermissions = ROLE_PERMISSIONS[currentUser.role];
    
    // Check for wildcard permission
    const wildcardPermission = userPermissions.find(p => p.module === '*');
    if (wildcardPermission && (wildcardPermission.action === 'admin' || wildcardPermission.action === action)) {
      return true;
    }
    
    // Check specific module permission
    const modulePermission = userPermissions.find(p => p.module === module);
    if (!modulePermission) return false;
    
    // Check action hierarchy: admin > delete > write > read
    const actionHierarchy = ['read', 'write', 'delete', 'admin'];
    const requiredLevel = actionHierarchy.indexOf(action);
    const userLevel = actionHierarchy.indexOf(modulePermission.action);
    
    return userLevel >= requiredLevel;
  };

  const switchRole = (role: UserRole) => {
    setCurrentUser(prev => ({
      ...prev,
      role,
      permissions: ROLE_PERMISSIONS[role],
    }));
  };

  return (
    <RBACContext.Provider value={{ currentUser, hasPermission, switchRole }}>
      {children}
    </RBACContext.Provider>
  );
};

// Higher-order component for protecting routes/components
interface ProtectedComponentProps {
  module: string;
  action: Permission['action'];
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  module,
  action,
  children,
  fallback = <div className="text-muted-foreground">Access denied</div>
}) => {
  const { hasPermission } = useRBAC();
  
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Hook for checking permissions in components
export const usePermission = (module: string, action: Permission['action']) => {
  const { hasPermission } = useRBAC();
  return hasPermission(module, action);
};