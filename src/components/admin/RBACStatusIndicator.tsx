import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Shield, User } from 'lucide-react';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { advancedRbacService } from '@/services/advancedRbacService';

interface RoleInfo {
  id: string;
  name: string;
  description: string;
}

export const RBACStatusIndicator: React.FC = () => {
  const { currentUserId, effectivePermissions, enforcementEnabled } = useRBAC();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      if (!currentUserId) return;
      
      try {
        const userRoles = await advancedRbacService.getUserRoles(currentUserId);
        setRoles(userRoles);
      } catch (error) {
        console.error('Failed to load user roles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [currentUserId]);

  if (loading || roles.length === 0) {
    return null;
  }

  const primaryRole = roles[0];

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge variant="outline" className="cursor-pointer gap-1.5">
          <Shield className="h-3 w-3" />
          {primaryRole.name}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">User ID: {currentUserId}</span>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2">Active Roles</h4>
            <div className="space-y-1">
              {roles.map((role) => (
                <div key={role.id} className="text-xs">
                  <span className="font-medium">{role.name}</span>
                  {role.description && (
                    <p className="text-muted-foreground">{role.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Effective Permissions</h4>
            <div className="text-xs text-muted-foreground">
              {effectivePermissions?.permissions?.length ?? 0} permissions active
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
